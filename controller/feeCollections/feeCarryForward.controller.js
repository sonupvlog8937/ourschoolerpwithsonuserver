const FeeCarryForward = require('../../model/feeCollections/feeCarryForward.model');
const StudentAdmission = require('../../model/studentInformation/studentAdmission.model');

// @desc    Get students with pending balance for carry forward
// @route   GET /api/fee-carry-forward/pending-students
// @access  Private (School)
exports.getPendingStudents = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const {
      page = 1,
      limit = 10,
      search = '',
      classId = '',
      section = '',
      session = ''
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10), 1);
    const limitNum = Math.max(parseInt(limit, 10), 1);
    const skip = (pageNum - 1) * limitNum;

    // Build query for students
    const query = { school: schoolId };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { admissionNo: { $regex: search, $options: 'i' } },
        { fatherName: { $regex: search, $options: 'i' } }
      ];
    }

    if (classId) query.class = classId;
    if (section) query.section = section;

    // Get students
    const students = await StudentAdmission.find(query)
      .populate('class', 'class_text')
      .select('firstName lastName admissionNo rollNumber fatherName class section')
      .sort('firstName')
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await StudentAdmission.countDocuments(query);

    // For each student, calculate pending balance from fee collections
    const { StudentFeeAssignment } = require('../../model/feeCollections/feeMaster.model');
    const FeeCarryForwardModel = require('../../model/feeCollections/feeCarryForward.model');
    
    const studentsWithBalance = await Promise.all(
      students.map(async (student) => {
        // Check if there's already a saved carry forward balance
        const existingCarryForward = await FeeCarryForwardModel.findOne({
          school: schoolId,
          student: student._id,
          status: { $in: ['pending', 'processed'] }
        }).sort({ createdAt: -1 }).lean();

        let pendingBalance = 0;

        if (existingCarryForward) {
          // Use existing carry forward balance
          pendingBalance = existingCarryForward.finalCarriedAmount || 0;
        } else {
          // Calculate from fee assignments
          const feeAssignments = await StudentFeeAssignment.find({
            school: schoolId,
            student: student._id,
            status: { $in: ['Unpaid', 'Partial'] }
          }).lean();

          // Sum up all unpaid balances
          pendingBalance = feeAssignments.reduce((sum, assignment) => {
            return sum + (assignment.balance || 0);
          }, 0);
        }

        return {
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          admissionNo: student.admissionNo,
          rollNumber: student.rollNumber,
          fatherName: student.fatherName,
          class: student.class,
          section: student.section,
          pendingBalance: Math.max(0, pendingBalance), // Ensure non-negative
          session: session || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)
        };
      })
    );

    // Return all students (including those with 0 balance for manual entry)
    // Filter can be applied on frontend if needed
    res.status(200).json({
      success: true,
      data: studentsWithBalance,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Get pending students error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch pending students'
    });
  }
};

// @desc    Create fee carry forward records
// @route   POST /api/fee-carry-forward/create
// @access  Private (School)
exports.createCarryForward = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { students, fromSession, toSession } = req.body;

    if (!students || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one student is required'
      });
    }

    if (!fromSession || !toSession) {
      return res.status(400).json({
        success: false,
        message: 'From session and to session are required'
      });
    }

    const carryForwardRecords = [];
    const errors = [];

    for (const studentData of students) {
      try {
        // Check if already carried forward
        const existing = await FeeCarryForward.findOne({
          student: studentData.studentId,
          toSession,
          school: schoolId,
          status: { $ne: 'cancelled' }
        });

        if (existing) {
          errors.push({
            studentId: studentData.studentId,
            message: 'Already carried forward'
          });
          continue;
        }

        // Get student details
        const student = await StudentAdmission.findById(studentData.studentId)
          .populate('class', 'class_text')
          .lean();

        if (!student) {
          errors.push({
            studentId: studentData.studentId,
            message: 'Student not found'
          });
          continue;
        }

        const record = await FeeCarryForward.create({
          student: studentData.studentId,
          admissionNo: student.admissionNo,
          studentName: `${student.firstName} ${student.lastName || ''}`.trim(),
          fatherName: student.fatherName,
          rollNumber: student.rollNumber,
          fromSession,
          toSession,
          class: student.class?._id,
          className: student.class?.class_text,
          section: student.section,
          previousBalance: studentData.previousBalance || 0,
          carriedAmount: studentData.carriedAmount || studentData.previousBalance || 0,
          adjustmentAmount: studentData.adjustmentAmount || 0,
          remarks: studentData.remarks,
          school: schoolId,
          createdBy: req.user.id
        });

        carryForwardRecords.push(record);
      } catch (err) {
        errors.push({
          studentId: studentData.studentId,
          message: err.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `${carryForwardRecords.length} records created successfully`,
      data: carryForwardRecords,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Create carry forward error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create carry forward'
    });
  }
};

// @desc    Get all carry forward records with pagination
// @route   GET /api/fee-carry-forward
// @access  Private (School)
exports.getCarryForwardRecords = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      fromSession = '',
      toSession = '',
      classId = '',
      section = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10), 1);
    const limitNum = Math.max(parseInt(limit, 10), 1);
    const skip = (pageNum - 1) * limitNum;

    const query = { school: schoolId };

    if (status) query.status = status;
    if (fromSession) query.fromSession = fromSession;
    if (toSession) query.toSession = toSession;
    if (classId) query.class = classId;
    if (section) query.section = section;

    if (search) {
      query.$or = [
        { studentName: { $regex: search, $options: 'i' } },
        { admissionNo: { $regex: search, $options: 'i' } },
        { fatherName: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [records, total] = await Promise.all([
      FeeCarryForward.find(query)
        .populate('student', 'firstName lastName admissionNo rollNumber fatherName')
        .populate('createdBy', 'name email')
        .populate('processedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      FeeCarryForward.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: records,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Get carry forward records error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch records'
    });
  }
};

// @desc    Update carry forward record
// @route   PUT /api/fee-carry-forward/:id
// @access  Private (School)
exports.updateCarryForward = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { carriedAmount, adjustmentAmount, remarks, status } = req.body;

    const record = await FeeCarryForward.findOne({
      _id: req.params.id,
      school: schoolId
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Carry forward record not found'
      });
    }

    if (record.status === 'processed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update processed record'
      });
    }

    if (carriedAmount !== undefined) record.carriedAmount = carriedAmount;
    if (adjustmentAmount !== undefined) record.adjustmentAmount = adjustmentAmount;
    if (remarks !== undefined) record.remarks = remarks;
    if (status !== undefined) record.status = status;

    if (status === 'processed') {
      record.processedDate = new Date();
      record.processedBy = req.user.id;
    }

    await record.save();

    const updatedRecord = await FeeCarryForward.findById(record._id)
      .populate('student', 'firstName lastName admissionNo')
      .populate('createdBy', 'name')
      .populate('processedBy', 'name');

    res.status(200).json({
      success: true,
      message: 'Record updated successfully',
      data: updatedRecord
    });
  } catch (error) {
    console.error('Update carry forward error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update record'
    });
  }
};

// @desc    Delete carry forward record
// @route   DELETE /api/fee-carry-forward/:id
// @access  Private (School)
exports.deleteCarryForward = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    const record = await FeeCarryForward.findOne({
      _id: req.params.id,
      school: schoolId
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Carry forward record not found'
      });
    }

    if (record.status === 'processed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete processed record'
      });
    }

    await record.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Record deleted successfully'
    });
  } catch (error) {
    console.error('Delete carry forward error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete record'
    });
  }
};

// @desc    Process carry forward (mark as processed)
// @route   POST /api/fee-carry-forward/process
// @access  Private (School)
exports.processCarryForward = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { recordIds } = req.body;

    if (!recordIds || recordIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Record IDs are required'
      });
    }

    const result = await FeeCarryForward.updateMany(
      {
        _id: { $in: recordIds },
        school: schoolId,
        status: 'pending'
      },
      {
        $set: {
          status: 'processed',
          processedDate: new Date(),
          processedBy: req.user.id
        }
      }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} records processed successfully`,
      data: { processedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Process carry forward error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process records'
    });
  }
};

// @desc    Get carry forward summary
// @route   GET /api/fee-carry-forward/summary
// @access  Private (School)
exports.getCarryForwardSummary = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { fromSession, toSession } = req.query;

    const query = { school: schoolId };
    if (fromSession) query.fromSession = fromSession;
    if (toSession) query.toSession = toSession;

    const summary = await FeeCarryForward.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$finalCarriedAmount' }
        }
      }
    ]);

    const formattedSummary = {
      pending: { count: 0, totalAmount: 0 },
      processed: { count: 0, totalAmount: 0 },
      cancelled: { count: 0, totalAmount: 0 }
    };

    summary.forEach(item => {
      formattedSummary[item._id] = {
        count: item.count,
        totalAmount: item.totalAmount
      };
    });

    res.status(200).json({
      success: true,
      data: formattedSummary
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch summary'
    });
  }
};

// @desc    Update student pending balance (temporary storage)
// @route   PUT /api/fee-carry-forward/update-balance/:studentId
// @access  Private (School)
exports.updateStudentBalance = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { studentId } = req.params;
    const { balance } = req.body;

    if (balance === undefined || balance < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid balance is required'
      });
    }

    // Verify student belongs to school
    const student = await StudentAdmission.findOne({
      _id: studentId,
      school: schoolId
    }).populate('class', 'class_text');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get current academic year
    const currentYear = new Date().getFullYear();
    const fromSession = `${currentYear - 1}-${currentYear}`;
    const toSession = `${currentYear}-${currentYear + 1}`;

    // Check if carry forward already exists for this student
    const FeeCarryForwardModel = require('../../model/feeCollections/feeCarryForward.model');
    
    let carryForward = await FeeCarryForwardModel.findOne({
      school: schoolId,
      student: studentId,
      toSession: toSession,
      status: 'pending'
    });

    if (carryForward) {
      // Update existing record
      carryForward.previousBalance = balance;
      carryForward.carriedAmount = balance;
      carryForward.finalCarriedAmount = balance;
      carryForward.studentName = `${student.firstName} ${student.lastName || ''}`.trim();
      carryForward.admissionNo = student.admissionNo;
      carryForward.fatherName = student.fatherName;
      carryForward.rollNumber = student.rollNumber;
      carryForward.class = student.class?._id;
      carryForward.className = student.class?.class_text;
      carryForward.section = student.section;
      carryForward.status = 'processed'; // Auto-process on save
      carryForward.processedDate = new Date();
      carryForward.processedBy = req.user.id;
      await carryForward.save();
    } else {
      // Create new record
      carryForward = await FeeCarryForwardModel.create({
        school: schoolId,
        student: studentId,
        studentName: `${student.firstName} ${student.lastName || ''}`.trim(),
        admissionNo: student.admissionNo,
        fatherName: student.fatherName,
        rollNumber: student.rollNumber,
        class: student.class?._id,
        className: student.class?.class_text,
        section: student.section,
        fromSession: fromSession,
        toSession: toSession,
        previousBalance: balance,
        carriedAmount: balance,
        adjustmentAmount: 0,
        finalCarriedAmount: balance,
        status: 'processed', // Auto-process on save
        processedDate: new Date(),
        processedBy: req.user.id,
        createdBy: req.user.id
      });
    }

    res.status(200).json({
      success: true,
      message: 'Balance updated successfully',
      data: {
        studentId,
        balance,
        carryForwardId: carryForward._id
      }
    });
  } catch (error) {
    console.error('Update balance error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update balance'
    });
  }
};
