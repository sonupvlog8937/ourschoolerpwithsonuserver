const mongoose = require("mongoose");
const Attendance = require("../model/attendance.model");
const Student = require("../model/student.model");
const Class = require("../model/class.model");
const moment = require("moment");
const {
  buildStudentsSortedByRollPipeline,
  sortStudentsByRollInMemory,
} = require("../utils/studentRollSort");

const toSafeObjectId = (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
};

/** One calendar day [start, end) in UTC for YYYY-MM-DD strings (matches client dates). */
const utcDayBoundsFromYmdString = (ymd) => {
  const start = moment.utc(String(ymd).trim(), "YYYY-MM-DD", true).startOf("day");
  if (!start.isValid()) return null;
  const endExclusive = start.clone().add(1, "day").startOf("day");
  return { start: start.toDate(), endExclusive: endExclusive.toDate() };
};

/** Normalize attendance day to UTC midnight for that calendar date. */
const normalizeAttendanceDayInput = (dateInput) => {
  if (dateInput == null || dateInput === "") {
    return moment.utc().startOf("day").toDate();
  }
  const s = String(dateInput).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return moment.utc(s, "YYYY-MM-DD").startOf("day").toDate();
  }
  const parsed = new Date(dateInput);
  if (!Number.isNaN(parsed.getTime())) {
    const ymd = moment.utc(parsed).format("YYYY-MM-DD");
    return moment.utc(ymd, "YYYY-MM-DD").startOf("day").toDate();
  }
  return moment.utc().startOf("day").toDate();
};

/** Bounds for listing/checking attendance for req.query.date or today's UTC calendar date. */
const utcBoundsForQueryDate = (req) => {
  const raw = req.query?.date;
  const ymd =
    raw && /^\d{4}-\d{2}-\d{2}$/.test(String(raw))
      ? String(raw).trim()
      : moment.utc().format("YYYY-MM-DD");
  return utcDayBoundsFromYmdString(ymd);
};

const buildSummaryFromStatusBuckets = (statusBuckets = []) => {
  const presentCount =
    statusBuckets.find((item) => item._id === "Present")?.count || 0;
  const absentCount =
    statusBuckets.find((item) => item._id === "Absent")?.count || 0;
  const totalRecords = presentCount + absentCount;
  const attendancePercentage =
    totalRecords > 0 ? Number(((presentCount / totalRecords) * 100).toFixed(2)) : 0;

  return { presentCount, absentCount, totalRecords, attendancePercentage };
};

module.exports = {
  markAttendance: async (req, res) => {
    const { studentId, date, status, classId } = req.body;
    const schoolId = req.user.schoolId;
    try {
      const attendance = new Attendance({
        student: studentId,
        date: normalizeAttendanceDayInput(date),
        status,
        class: classId,
        school: schoolId,
      });
      await attendance.save();
      res.status(201).json(attendance);
    } catch (err) {
      res.status(500).json({ message: "Error marking attendance", err });
    }
  },

  getAttendance: async (req, res) => {
    const { studentId } = req.params;
    const schoolId = req.user.schoolId;
    const hasPagination = req.query.page || req.query.limit;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const skip = (page - 1) * limit;

    const studentObjectId = toSafeObjectId(studentId);
    const schoolObjectId = toSafeObjectId(schoolId);

    if (!studentObjectId || !schoolObjectId) {
      return res.status(400).json({ success: false, message: "Invalid student id." });
    }

    try {
      const filterQuery = { student: studentObjectId, school: schoolObjectId };
      const attendanceQuery = Attendance.find(filterQuery)
        .populate("student")
        .sort({ date: -1, createdAt: -1 });

      if (hasPagination) {
        attendanceQuery.skip(skip).limit(limit);
      }

      const [attendance, total, statusSummary] = await Promise.all([
        attendanceQuery,
        Attendance.countDocuments(filterQuery),
        Attendance.aggregate([
          { $match: filterQuery },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
      ]);

      const summary = buildSummaryFromStatusBuckets(statusSummary);
      const resolvedLimit = hasPagination ? limit : total || 0;

      res.status(200).json({
        success: true,
        data: attendance,
        summary,
        pagination: {
          total,
          page: hasPagination ? page : 1,
          limit: resolvedLimit,
          totalPages: hasPagination ? Math.ceil(total / limit) || 1 : 1,
        },
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ success: false, message: "Error fetching attendance", err });
    }
  },

  getSchoolAttendanceOverview: async (req, res) => {
    const schoolId = req.user.schoolId;
    const schoolObjectId = toSafeObjectId(schoolId);
    const selectedClassObjectId = toSafeObjectId(req.query.student_class);
    const requestedDate = req.query.date ? moment(req.query.date) : null;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const skip = (page - 1) * limit;

    if (!schoolObjectId) {
      return res.status(400).json({ success: false, message: "Invalid school id." });
    }

    try {
      const studentFilter = { school: schoolObjectId };
      if (req.query.search) {
        studentFilter.name = { $regex: req.query.search, $options: "i" };
      }
      if (selectedClassObjectId) {
        studentFilter.student_class = selectedClassObjectId;
      }

      const [allClasses, total, students, totalStudentsInSchool, latestAttendance] =
        await Promise.all([
          Class.find({ school: schoolObjectId })
            .select(["class_text", "class_num"])
            .sort({ class_num: 1, class_text: 1 })
            .lean(),
          Student.countDocuments(studentFilter),
          Student.aggregate(
            buildStudentsSortedByRollPipeline(studentFilter, skip, limit, true)
          ),
          Student.countDocuments({ school: schoolObjectId }),
          Attendance.findOne({ school: schoolObjectId })
            .sort({ date: -1, createdAt: -1 })
            .select(["date"])
            .lean(),
        ]);

      const classIds = allClasses.map((classItem) => classItem._id);
      const studentIds = students.map((student) => student._id);

      let classStudentCountRows = [];
      let classAttendanceRows = [];

      if (classIds.length > 0) {
        [classStudentCountRows, classAttendanceRows] = await Promise.all([
          Student.aggregate([
            {
              $match: {
                school: schoolObjectId,
                student_class: { $in: classIds },
              },
            },
            {
              $group: {
                _id: "$student_class",
                totalStudents: { $sum: 1 },
              },
            },
          ]),
          Attendance.aggregate([
            {
              $match: {
                school: schoolObjectId,
                class: { $in: classIds },
              },
            },
            {
              $group: {
                _id: { class: "$class", status: "$status" },
                count: { $sum: 1 },
              },
            },
            {
              $group: {
                _id: "$_id.class",
                presentCount: {
                  $sum: {
                    $cond: [{ $eq: ["$_id.status", "Present"] }, "$count", 0],
                  },
                },
                absentCount: {
                  $sum: {
                    $cond: [{ $eq: ["$_id.status", "Absent"] }, "$count", 0],
                  },
                },
                totalMarked: { $sum: "$count" },
              },
            },
          ]),
        ]);
      }

      const classStudentMap = new Map(
        classStudentCountRows.map((item) => [String(item._id), item.totalStudents || 0])
      );
      const classAttendanceMap = new Map(
        classAttendanceRows.map((item) => [String(item._id), item])
      );

      const classSummary = allClasses.map((classItem) => {
        const classStats = classAttendanceMap.get(String(classItem._id)) || {};
        const presentCount = classStats.presentCount || 0;
        const absentCount = classStats.absentCount || 0;
        const totalMarked = classStats.totalMarked || 0;
        return {
          classId: classItem._id,
          class_text: classItem.class_text,
          class_num: classItem.class_num,
          totalStudents: classStudentMap.get(String(classItem._id)) || 0,
          presentCount,
          absentCount,
          totalMarked,
          attendancePercentage:
            totalMarked > 0 ? Number(((presentCount / totalMarked) * 100).toFixed(2)) : 0,
        };
      });

      let studentAttendanceRows = [];
      if (studentIds.length > 0) {
        studentAttendanceRows = await Attendance.aggregate([
          {
            $match: {
              school: schoolObjectId,
              student: { $in: studentIds },
            },
          },
          {
            $group: {
              _id: { student: "$student", status: "$status" },
              count: { $sum: 1 },
            },
          },
          {
            $group: {
              _id: "$_id.student",
              presentCount: {
                $sum: {
                  $cond: [{ $eq: ["$_id.status", "Present"] }, "$count", 0],
                },
              },
              absentCount: {
                $sum: {
                  $cond: [{ $eq: ["$_id.status", "Absent"] }, "$count", 0],
                },
              },
              totalRecords: { $sum: "$count" },
            },
          },
        ]);
      }

      const studentAttendanceMap = new Map(
        studentAttendanceRows.map((item) => [String(item._id), item])
      );

      const studentData = students.map((student) => {
        const attendanceStats = studentAttendanceMap.get(String(student._id)) || {};
        const presentCount = attendanceStats.presentCount || 0;
        const absentCount = attendanceStats.absentCount || 0;
        const totalRecords = attendanceStats.totalRecords || 0;
        return {
          ...student,
          attendanceSummary: {
            presentCount,
            absentCount,
            totalRecords,
            attendancePercentage:
              totalRecords > 0
                ? Number(((presentCount / totalRecords) * 100).toFixed(2))
                : 0,
          },
        };
      });

      let schoolSummary = {
        totalStudents: totalStudentsInSchool,
        presentCount: 0,
        absentCount: totalStudentsInSchool,
        markedCount: 0,
        attendancePercentage: 0,
        latestAttendanceDate: null,
      };

      const summaryDate = requestedDate?.isValid()
        ? requestedDate.toDate()
        : latestAttendance?.date || null;

      if (summaryDate) {
        const startOfDay = moment(summaryDate).startOf("day").toDate();
        const endOfDay = moment(summaryDate).endOf("day").toDate();

        const latestStatusPerStudent = await Attendance.aggregate([
          {
            $match: {
              school: schoolObjectId,
              date: { $gte: startOfDay, $lte: endOfDay },
            },
          },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: "$student",
              status: { $first: "$status" },
            },
          },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]);

        const presentCount =
          latestStatusPerStudent.find((item) => item._id === "Present")?.count || 0;
        const markedCount = latestStatusPerStudent.reduce(
          (acc, item) => acc + (item.count || 0),
          0
        );
        const absentCount = Math.max(totalStudentsInSchool - presentCount, 0);
        const attendancePercentage =
          totalStudentsInSchool > 0
            ? Number(((presentCount / totalStudentsInSchool) * 100).toFixed(2))
            : 0;

        schoolSummary = {
          totalStudents: totalStudentsInSchool,
          presentCount,
          absentCount,
          markedCount,
          attendancePercentage,
          latestAttendanceDate: summaryDate,
        };
      }

      res.status(200).json({
        success: true,
        data: studentData,
        classSummary,
        schoolSummary,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      });
    } catch (error) {
      console.log("Error in getSchoolAttendanceOverview", error);
      res
        .status(500)
        .json({ success: false, message: "Error fetching attendance overview." });
    }
  },

  getTeacherClassAttendanceOverview: async (req, res) => {
    const schoolObjectId = toSafeObjectId(req.user.schoolId);
    const teacherObjectId = toSafeObjectId(req.user.id);
    const classObjectId = toSafeObjectId(req.params.classId);
    const bounds =
      req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date))
        ? utcDayBoundsFromYmdString(String(req.query.date).trim())
        : utcDayBoundsFromYmdString(moment.utc().format("YYYY-MM-DD"));

    if (!schoolObjectId || !teacherObjectId || !classObjectId) {
      return res.status(400).json({ success: false, message: "Invalid request data." });
    }

    try {
      const isSchoolRole = req.user.role === "SCHOOL";
      const classQuery = isSchoolRole
        ? { _id: classObjectId, school: schoolObjectId }
        : {
            _id: classObjectId,
            school: schoolObjectId,
            $or: [
              { attendee: teacherObjectId },
              { "asignSubTeach.teacher": teacherObjectId },
            ],
          };

      const classData = await Class.findOne(classQuery)
        .select(["class_text", "class_num"])
        .lean();

      if (!classData) {
        return res
          .status(404)
          .json({
            success: false,
            message: isSchoolRole
              ? "Class not found for this school."
              : "Class not found or you are not assigned to this class.",
          });
      }

      // Use mongoose find (casts query like school routes). Raw aggregate $match does NOT cast,
      // so mixed string/ObjectId in DB or JWT could yield zero rows.
      let students = await Student.find({
        school: req.user.schoolId,
        student_class: req.params.classId,
      })
        .select("name roll_number guardian_phone guardian gender age email student_class")
        .lean();
      students = sortStudentsByRollInMemory(students);

      const studentIds = students.map((student) => student._id);
      const totalStudents = students.length;

      if (!bounds) {
        return res.status(400).json({ success: false, message: "Invalid date." });
      }
      const startOfDay = bounds.start;
      const endExclusive = bounds.endExclusive;

      let latestStatusRows = [];
      let overallRows = [];

      if (studentIds.length > 0) {
        [latestStatusRows, overallRows] = await Promise.all([
          Attendance.aggregate([
            {
              $match: {
                school: schoolObjectId,
                class: classObjectId,
                student: { $in: studentIds },
                date: { $gte: startOfDay, $lt: endExclusive },
              },
            },
            { $sort: { createdAt: -1 } },
            {
              $group: {
                _id: "$student",
                status: { $first: "$status" },
              },
            },
          ]),
          Attendance.aggregate([
            {
              $match: {
                school: schoolObjectId,
                class: classObjectId,
                student: { $in: studentIds },
              },
            },
            {
              $group: {
                _id: { student: "$student", status: "$status" },
                count: { $sum: 1 },
              },
            },
            {
              $group: {
                _id: "$_id.student",
                presentCount: {
                  $sum: {
                    $cond: [{ $eq: ["$_id.status", "Present"] }, "$count", 0],
                  },
                },
                absentCount: {
                  $sum: {
                    $cond: [{ $eq: ["$_id.status", "Absent"] }, "$count", 0],
                  },
                },
                totalRecords: { $sum: "$count" },
              },
            },
          ]),
        ]);
      }

      const todayStatusMap = new Map(
        latestStatusRows.map((row) => [String(row._id), row.status])
      );
      const overallMap = new Map(overallRows.map((row) => [String(row._id), row]));

      const studentData = students.map((student) => {
        const overallStats = overallMap.get(String(student._id)) || {};
        const presentCount = overallStats.presentCount || 0;
        const absentCount = overallStats.absentCount || 0;
        const totalRecords = overallStats.totalRecords || 0;

        return {
          ...student,
          todayStatus: todayStatusMap.get(String(student._id)) || "Not Marked",
          attendanceSummary: {
            presentCount,
            absentCount,
            totalRecords,
            attendancePercentage:
              totalRecords > 0
                ? Number(((presentCount / totalRecords) * 100).toFixed(2))
                : 0,
          },
        };
      });

      const presentCount = studentData.filter(
        (student) => student.todayStatus === "Present"
      ).length;
      const markedCount = studentData.filter(
        (student) => student.todayStatus !== "Not Marked"
      ).length;
      const absentCount = Math.max(totalStudents - presentCount, 0);
      const attendancePercentage =
        totalStudents > 0 ? Number(((presentCount / totalStudents) * 100).toFixed(2)) : 0;

      res.status(200).json({
        success: true,
        classData,
        date: startOfDay,
        summary: {
          totalStudents,
          presentCount,
          absentCount,
          markedCount,
          attendancePercentage,
        },
        data: studentData,
      });
    } catch (error) {
      console.log("Error in getTeacherClassAttendanceOverview", error);
      res
        .status(500)
        .json({ success: false, message: "Error fetching class attendance overview." });
    }
  },

  checkAttendance: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const bounds = utcBoundsForQueryDate(req);

      if (!bounds) {
        return res.status(400).json({ success: false, message: "Invalid date." });
      }

      const attendanceForToday = await Attendance.findOne({
        class: req.params.classId,
        school: schoolId,
        date: {
          $gte: bounds.start,
          $lt: bounds.endExclusive,
        },
      });

      if (attendanceForToday) {
        return res
          .status(200)
          .json({ attendanceTaken: true, message: "Attendance already taken for today" });
      }
      return res.status(200).json({
        attendanceTaken: false,
        message: "No attendance taken yet for today",
      });
    } catch (error) {
      console.error("Error checking attendance:", error);
      return res.status(500).json({ message: "Server error", error });
    }
  },
};
