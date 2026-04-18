/**
 * Numeric ordering for roll_number strings (e.g. "1", "02", "12-A" → first number run).
 * Used in MongoDB aggregation ($addFields) so attendance lists roll 1,2,3… naturally.
 */
const ROLL_SORT_OVERFLOW = 999999999;

/** $addFields: rollSortKey (double) from roll_number */
const rollSortKeyAddFields = {
  $addFields: {
    rollSortKey: {
      $convert: {
        input: {
          $let: {
            vars: {
              rf: {
                $regexFind: {
                  input: { $toString: { $ifNull: ["$roll_number", ""] } },
                  regex: /\d+/,
                },
              },
            },
            in: {
              $cond: [
                { $and: [{ $ne: ["$$rf", null] }, { $ne: ["$$rf.match", null] }] },
                "$$rf.match",
                { $toString: ROLL_SORT_OVERFLOW },
              ],
            },
          },
        },
        to: "double",
        onError: ROLL_SORT_OVERFLOW,
        onNull: ROLL_SORT_OVERFLOW,
      },
    },
  },
};

/**
 * Pipeline: match → roll sort → optional skip/limit → populate class → drop helper field.
 * @param {object} filterQuery - Mongo match (e.g. { school, student_class })
 * @param {number} skip
 * @param {number} limit
 * @param {boolean} hasPagination - if false, no skip/limit (return all matched, sorted)
 */
function buildStudentsSortedByRollPipeline(filterQuery, skip, limit, hasPagination) {
  const pipe = [{ $match: filterQuery }, rollSortKeyAddFields, { $sort: { rollSortKey: 1, roll_number: 1, _id: 1 } }];
  if (hasPagination) {
    pipe.push({ $skip: skip }, { $limit: limit });
  }
  pipe.push(
    {
      $lookup: {
        from: "classes",
        localField: "student_class",
        foreignField: "_id",
        as: "student_class",
      },
    },
    { $unwind: { path: "$student_class", preserveNullAndEmptyArrays: true } },
    { $project: { rollSortKey: 0 } }
  );
  return pipe;
}

/** In-memory sort matching aggregation roll order (for find() results). */
function sortStudentsByRollInMemory(docs) {
  const keyFromRoll = (doc) => {
    const m = String(doc.roll_number ?? "").match(/\d+/);
    if (!m) return ROLL_SORT_OVERFLOW;
    const n = Number.parseFloat(m[0]);
    return Number.isFinite(n) ? n : ROLL_SORT_OVERFLOW;
  };
  return [...docs].sort((a, b) => {
    const ka = keyFromRoll(a);
    const kb = keyFromRoll(b);
    if (ka !== kb) return ka - kb;
    const ra = String(a.roll_number ?? "");
    const rb = String(b.roll_number ?? "");
    if (ra !== rb) return ra.localeCompare(rb, undefined, { numeric: true });
    return String(a._id).localeCompare(String(b._id));
  });
}

module.exports = {
  ROLL_SORT_OVERFLOW,
  rollSortKeyAddFields,
  buildStudentsSortedByRollPipeline,
  sortStudentsByRollInMemory,
};
