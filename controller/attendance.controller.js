const mongoose = require("mongoose");
const Attendance = require("../model/attendance.model");
const Student = require("../model/student.model");
const Class = require("../model/class.model");
const moment = require("moment");

const toSafeObjectId = (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
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
        date,
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
          Student.find(studentFilter)
            .populate("student_class")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
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
    const requestedDate = req.query.date ? moment(req.query.date) : moment();

    if (!schoolObjectId || !teacherObjectId || !classObjectId) {
      return res.status(400).json({ success: false, message: "Invalid request data." });
    }

    try {
      const classData = await Class.findOne({
        _id: classObjectId,
        school: schoolObjectId,
        attendee: teacherObjectId,
      })
        .select(["class_text", "class_num"])
        .lean();

      if (!classData) {
        return res
          .status(404)
          .json({ success: false, message: "Class not found for this teacher." });
      }

      const students = await Student.find({
        school: schoolObjectId,
        student_class: classObjectId,
      })
        .select([
          "name",
          "roll_number",
          "guardian_phone",
          "guardian",
          "gender",
          "age",
          "email",
          "student_class",
        ])
        .sort({ name: 1 })
        .lean();

      const studentIds = students.map((student) => student._id);
      const totalStudents = students.length;

      const startOfDay = requestedDate.startOf("day").toDate();
      const endOfDay = requestedDate.endOf("day").toDate();

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
      const today = moment().startOf("day");
      const schoolId = req.user.schoolId;

      const attendanceForToday = await Attendance.findOne({
        class: req.params.classId,
        school: schoolId,
        date: {
          $gte: today.toDate(),
          $lt: moment(today).endOf("day").toDate(),
        },
      });

      if (attendanceForToday) {
        return res
          .status(200)
          .json({ attendanceTaken: true, message: "Attendance already taken for today" });
      }
      return res.status(200).json({ message: "No attendance taken yet for today" });
    } catch (error) {
      console.error("Error checking attendance:", error);
      return res.status(500).json({ message: "Server error", error });
    }
  },
};
