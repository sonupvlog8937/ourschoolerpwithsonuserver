const FeeAssignment = require('../../model/feeCollections/feeAssignment.model');
const FeeGroup = require('../../model/feeCollections/feeGroup.model');
const FeeType = require('../../model/feeCollections/feeType.model');
const StudentAdmission = require('../../model/studentInformation/studentAdmission.model');
const Class = require('../../model/class.model');
const mongoose = require('mongoose');

// Get Fee Assignment Dashboard Data
exports.getFeeAssignmentDashboard = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { session } = req.query;

    if (!schoolId) {
      return res.status(400).json({ 
        success: false, 
        message: 'School ID is required' 
      });
    }

    const currentSession = session || new Date().getFullYear().toString();

    // Get all active classes for filters
    let activeClasses = await Class.find({ 
      school: schoolId
    }).select('_id class_text class_num').sort({ class_num: 1 }).lean();

    if ((!activeClasses || activeClasses.length === 0) && schoolId) {
      const studentClassIds = await StudentAdmission.distinct('class', {
        school: schoolId,
        class: { $ne: null }
      });

      if (studentClassIds && studentClassIds.length) {
        activeClasses = await Class.find({
          _id: { $in: studentClassIds }
        }).select('_id class_text class_num').sort({ class_num: 1 }).lean();
      }
    }

    // Format classes for frontend with both _id and name
    const formattedClasses = (activeClasses || []).map(cls => ({
      _id: cls._id,
      name: cls.class_text || cls.name || 'Class',
      class_text: cls.class_text || cls.name || 'Class',
      value: cls._id, // For easy dropdown usage
      label: cls.class_text || cls.name || 'Class' // For easy dropdown usage
    }));

    console.log('📚 Fee Assignment: Active classes found:', formattedClasses.length);
    console.log('📚 Fee Assignment: Classes:', formattedClasses);

    // Get unique sections from active students and format them
    const activeSections = await StudentAdmission.distinct('section', {
      school: schoolId
    });

    // Filter out null/undefined sections, sort, and format for frontend
    const formattedSections = activeSections
      .filter(s => s && s.trim())
      .sort()
      .map(section => ({
        value: section,
        label: section
      }));

    console.log('📚 Fee Assignment: Active sections found:', formattedSections);

    // Get all students for the school
    const totalStudents = await StudentAdmission.countDocuments({
      school: schoolId,
      status: 'Active',
      isDisabled: false
    });

    // Get students with fee assigned
    const assignedStudents = await FeeAssignment.distinct('student', {
      school: schoolId,
      session: currentSession,
      isActive: true
    });

    const feeAssignedCount = assignedStudents.length;
    const feeNotAssignedCount = totalStudents - feeAssignedCount;

    // Get grade-wise breakdown
    const gradeWiseData = await FeeAssignment.aggregate([
      {
        $match: {
          school: new mongoose.Types.ObjectId(schoolId),
          session: currentSession,
          isActive: true
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'class',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      {
        $unwind: '$classInfo'
      },
      {
        $group: {
          _id: {
            class: '$class',
            className: '$classInfo.name'
          },
          totalStudents: { $sum: 1 },
          assigned: {
            $sum: {
              $cond: [{ $gt: ['$totalAmount', 0] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          className: '$_id.className',
          total: '$totalStudents',
          assigned: 1,
          notAssigned: { $subtract: ['$totalStudents', '$assigned'] },
          coverage: {
            $cond: [
              { $gt: ['$totalStudents', 0] },
              { $multiply: [{ $divide: ['$assigned', '$totalStudents'] }, 100] },
              0
            ]
          }
        }
      },
      {
        $sort: { className: 1 }
      }
    ]);

    // Get all classes with student counts
    let allClasses = await Class.find({ school: schoolId, isActive: true }).lean();
    if ((!allClasses || allClasses.length === 0) && schoolId) {
      const studentClassIds = await StudentAdmission.distinct('class', {
        school: schoolId,
        class: { $ne: null }
      });

      if (studentClassIds && studentClassIds.length) {
        allClasses = await Class.find({
          _id: { $in: studentClassIds }
        }).lean();
      }
    }

    const classStudentCounts = await StudentAdmission.aggregate([
      {
        $match: {
          school: new mongoose.Types.ObjectId(schoolId),
          status: 'Active',
          isDisabled: false
        }
      },
      {
        $group: {
          _id: '$class',
          count: { $sum: 1 }
        }
      }
    ]);

    const studentCountMap = {};
    classStudentCounts.forEach(item => {
      studentCountMap[item._id.toString()] = item.count;
    });

    // Merge data with all classes
    const completeGradeWiseData = (allClasses || []).map(cls => {
      const className = cls.class_text || cls.name;
      const existing = gradeWiseData.find(g => g.className === className);
      const totalInClass = studentCountMap[cls._id.toString()] || 0;
      
      if (existing) {
        return {
          ...existing,
          classId: cls._id,
          className,
          total: totalInClass,
          notAssigned: totalInClass - existing.assigned
        };
      }
      
      return {
        classId: cls._id,
        className,
        total: totalInClass,
        assigned: 0,
        notAssigned: totalInClass,
        coverage: 0
      };
    });

    // Get grades covered
    const gradesCovered = gradeWiseData.filter(g => g.assigned > 0).length;
    const totalGrades = allClasses.length;

    const feeStatusOptions = [
      { value: 'Assigned', label: 'Fee Assigned' },
      { value: 'Not Assigned', label: 'Fee Not Assigned' }
    ];

    const studentStatusOptions = [
      { value: 'Currently Studying', label: 'Currently Studying' },
      { value: 'Dropout', label: 'Dropout' },
      { value: 'Passout', label: 'Passout' }
    ];

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        feeAssigned: feeAssignedCount,
        feeNotAssigned: feeNotAssignedCount,
        gradesCovered,
        totalGrades,
        gradeWiseBreakdown: completeGradeWiseData,
        session: currentSession,
        filters: {
          classes: formattedClasses || [],
          sections: formattedSections || [],
          feeStatuses: feeStatusOptions,
          studentStatuses: studentStatusOptions
        }
      }
    });

  } catch (error) {
    console.error('Error in getFeeAssignmentDashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching fee assignment dashboard',
      error: error.message
    });
  }
};

// Get Students List with Fee Assignment Status
exports.getStudentsWithFeeStatus = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { 
      session, 
      classId, 
      section, 
      feeStatus, 
      studentStatus,
      search,
      page = 1,
      limit = 20
    } = req.query;

    if (!schoolId) {
      return res.status(400).json({ 
        success: false, 
        message: 'School ID is required' 
      });
    }

    const currentSession = session || new Date().getFullYear().toString();

    // Build student query
    const studentQuery = {
      school: schoolId,
      status: 'Active',
      isDisabled: false
    };

    if (classId) studentQuery.class = classId;
    if (section) studentQuery.section = section;

    if (studentStatus) {
      if (studentStatus === 'Currently Studying') {
        studentQuery.status = 'Active';
        studentQuery.isDisabled = false;
      } else if (studentStatus === 'Dropout') {
        studentQuery.isDisabled = true;
      } else if (studentStatus === 'Passout') {
        studentQuery.status = 'Inactive';
      }
    }

    if (search) {
      studentQuery.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { admissionNo: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    // Get students
    const students = await StudentAdmission.find(studentQuery)
      .populate('class', 'name')
      .select('admissionNo rollNumber firstName lastName class section fatherName mobileNumber')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalCount = await StudentAdmission.countDocuments(studentQuery);

    // Get fee assignments for these students
    const studentIds = students.map(s => s._id);
    const feeAssignments = await FeeAssignment.find({
      school: schoolId,
      student: { $in: studentIds },
      session: currentSession,
      isActive: true
    })
    .populate('feeGroup', 'name')
    .lean();

    // Map assignments to students
    const assignmentMap = {};
    feeAssignments.forEach(assignment => {
      assignmentMap[assignment.student.toString()] = assignment;
    });

    // Combine data
    let studentsWithFeeData = students.map(student => {
      const assignment = assignmentMap[student._id.toString()];
      
      return {
        _id: student._id,
        admissionNo: student.admissionNo,
        rollNumber: student.rollNumber,
        name: `${student.firstName} ${student.lastName}`.trim(),
        class: student.class?.name || '',
        section: student.section || '',
        fatherName: student.fatherName || '',
        contact: student.mobileNumber || '',
        feeStatus: assignment ? 'Assigned' : 'Not Assigned',
        feeGroup: assignment?.feeGroup?.name || '-',
        feeGroupId: assignment?.feeGroup?._id || null,
        totalFee: assignment?.totalAmount || 0,
        paidAmount: assignment?.paidAmount || 0,
        balance: assignment?.balanceAmount || 0
      };
    });

    // Filter by fee status if requested
    if (feeStatus) {
      if (feeStatus === 'Not Assigned') {
        studentsWithFeeData = studentsWithFeeData.filter(s => s.feeStatus === 'Not Assigned');
      } else if (feeStatus === 'Assigned') {
        studentsWithFeeData = studentsWithFeeData.filter(s => s.feeStatus === 'Assigned');
      }
    }

    res.status(200).json({
      success: true,
      data: studentsWithFeeData,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalRecords: totalCount,
        recordsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error in getStudentsWithFeeStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students with fee status',
      error: error.message
    });
  }
};

// Assign Fee to Student(s)
exports.assignFeeToStudents = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { 
      studentIds, 
      feeGroupId, 
      session, 
      feeTypes,
      remarks 
    } = req.body;

    if (!schoolId || !feeGroupId || !studentIds || studentIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Required fields missing' 
      });
    }

    const currentSession = session || new Date().getFullYear().toString();

    // Validate fee group
    const feeGroup = await FeeGroup.findById(feeGroupId);
    if (!feeGroup) {
      return res.status(404).json({ 
        success: false, 
        message: 'Fee group not found' 
      });
    }

    const assignments = [];
    const errors = [];

    for (const studentId of studentIds) {
      try {
        // Get student info
        const student = await StudentAdmission.findById(studentId);
        if (!student) {
          errors.push({ studentId, error: 'Student not found' });
          continue;
        }

        // Check if already assigned
        const existingAssignment = await FeeAssignment.findOne({
          school: schoolId,
          student: studentId,
          session: currentSession,
          isActive: true
        });

        if (existingAssignment) {
          errors.push({ 
            studentId, 
            studentName: `${student.firstName} ${student.lastName}`,
            error: 'Fee already assigned for this session' 
          });
          continue;
        }

        // Calculate total amount
        const totalAmount = feeTypes.reduce((sum, ft) => sum + (ft.amount || 0), 0);

        // Create fee assignment
        const assignment = await FeeAssignment.create({
          school: schoolId,
          student: studentId,
          feeGroup: feeGroupId,
          class: student.class,
          section: student.section,
          session: currentSession,
          feeTypes: feeTypes.map(ft => ({
            feeType: ft.feeTypeId,
            amount: ft.amount,
            dueDate: ft.dueDate
          })),
          totalAmount,
          paidAmount: 0,
          balanceAmount: totalAmount,
          assignedBy: req.user?._id,
          remarks: remarks || ''
        });

        assignments.push(assignment);

      } catch (error) {
        errors.push({ 
          studentId, 
          error: error.message 
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Fee assigned to ${assignments.length} student(s)`,
      data: {
        assigned: assignments.length,
        failed: errors.length,
        assignments,
        errors
      }
    });

  } catch (error) {
    console.error('Error in assignFeeToStudents:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning fee to students',
      error: error.message
    });
  }
};

// Get Fee Groups
exports.getFeeGroups = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const feeGroups = await FeeGroup.find({ 
      school: schoolId, 
      isActive: true 
    }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: feeGroups
    });

  } catch (error) {
    console.error('Error in getFeeGroups:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching fee groups',
      error: error.message
    });
  }
};

// Update Fee Assignment
exports.updateFeeAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const updates = req.body;

    const assignment = await FeeAssignment.findByIdAndUpdate(
      assignmentId,
      { $set: updates },
      { new: true, runValidators: true }
    )
    .populate('student', 'firstName lastName admissionNo')
    .populate('feeGroup', 'name')
    .populate('class', 'name');

    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Fee assignment not found' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Fee assignment updated successfully',
      data: assignment
    });

  } catch (error) {
    console.error('Error in updateFeeAssignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating fee assignment',
      error: error.message
    });
  }
};

// Delete Fee Assignment
exports.deleteFeeAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await FeeAssignment.findById(assignmentId);
    
    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Fee assignment not found' 
      });
    }

    // Check if any payment made
    if (assignment.paidAmount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete assignment with payments. Please refund first.' 
      });
    }

    await FeeAssignment.findByIdAndDelete(assignmentId);

    res.status(200).json({
      success: true,
      message: 'Fee assignment deleted successfully'
    });

  } catch (error) {
    console.error('Error in deleteFeeAssignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting fee assignment',
      error: error.message
    });
  }
};

module.exports = exports;
