require("dotenv").config();
const FeeCollection = require("../../model/feeCollections/feeCollection.model");
const { FeeMaster, StudentFeeAssignment } = require("../../model/feeCollections/feeMaster.model");
const FeeGroup = require("../../model/feeCollections/feeGroup.model");
const FeeType = require("../../model/feeCollections/feeType.model");
const OfflineBankPayment = require("../../model/feeCollections/offlineBankPayment.model");
const FeePayment = require("../../model/feeCollections/feePayment.model");
const FeeDiscount = require("../../model/feeCollections/feeDiscount.model");
const StudentAdmission = require("../../model/studentInformation/studentAdmission.model");
const Class = require("../../model/class.model");

module.exports = {
  
  // ─── Search Students for Fee Collection ──────────────────────────────────────
  searchStudentsForFee: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const page = Math.max(parseInt(req.query.page || '1', 10), 1);
      const limit = Math.max(parseInt(req.query.limit || '10', 10), 1);
      const skip = (page - 1) * limit;
      const search = req.query.search || '';
      const classId = req.query.classId || '';
      const section = req.query.section || '';

      console.log('Search Students Request:', { schoolId, page, limit, search, classId, section });

      // Build filter
      const filter = { school: schoolId };

      if (search) {
        const rx = new RegExp(search.trim(), 'i');
        filter.$or = [
          { firstName: rx },
          { lastName: rx },
          { admissionNo: rx },
          { rollNumber: rx },
          { fatherName: rx },
          { mobileNumber: rx }
        ];
      }

      if (classId) {
        filter.class = classId;
      }

      if (section) {
        filter.section = section;
      }

      const [students, total] = await Promise.all([
        StudentAdmission.find(filter)
          .populate('class', 'class_text class_num')
          .select('firstName lastName admissionNo rollNumber class section fatherName mobileNumber dateOfBirth photo category')
          .sort({ firstName: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        StudentAdmission.countDocuments(filter)
      ]);

      console.log('Students Found:', students.length, 'Total:', total);

      res.status(200).json({
        success: true,
        message: "Students fetched successfully",
        data: students,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1
        }
      });

    } catch (error) {
      console.log("Error in searchStudentsForFee", error);
      res.status(500).json({
        success: false,
        message: "Failed to search students. Please try again later"
      });
    }
  },

  // ─── Get Student Fee Details for Collection Page ─────────────────────────────
  getStudentFeesForCollection: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { studentId } = req.params;

      console.log('Fetching fees for student:', studentId);

      // Get student details
      const student = await StudentAdmission.findOne({
        _id: studentId,
        school: schoolId
      })
        .populate('class', 'class_text class_num')
        .lean();

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found"
        });
      }

      // Get all fee assignments for this student
      const feeAssignments = await StudentFeeAssignment.find({
        school: schoolId,
        student: studentId
      })
        .populate('feeMaster', 'feesGroup feesCode')
        .sort({ dueDate: 1 })
        .lean();

      // Get payment history for each assignment
      const assignmentsWithPayments = await Promise.all(
        feeAssignments.map(async (assignment) => {
          const payments = await FeePayment.find({
            school: schoolId,
            feeAssignment: assignment._id,
            isReverted: false
          })
            .populate('discountGroup', 'name discountCode')
            .sort({ paymentDate: -1 })
            .lean();

          return {
            ...assignment,
            payments: payments || []
          };
        })
      );

      // ─── Get Carry Forward Balance (Previous Session Balance) ────────────────
      const FeeCarryForward = require('../../model/feeCollections/feeCarryForward.model');
      
      const carryForwardRecord = await FeeCarryForward.findOne({
        school: schoolId,
        student: studentId,
        status: { $in: ['pending', 'processed'] } // Include both pending and processed
      })
        .sort({ createdAt: -1 }) // Get the latest one
        .lean();

      // Add carry forward as a special fee assignment if exists
      if (carryForwardRecord && carryForwardRecord.finalCarriedAmount > 0) {
        console.log('Found carry forward balance:', carryForwardRecord.finalCarriedAmount);
        
        // Check if already paid
        const carryForwardPayments = await FeePayment.find({
          school: schoolId,
          student: studentId,
          feeType: 'carry-forward',
          isReverted: false
        })
          .populate('discountGroup', 'name discountCode')
          .sort({ paymentDate: -1 })
          .lean();

        const totalPaidForCarryForward = carryForwardPayments.reduce((sum, p) => sum + p.amount, 0);
        const carryForwardBalance = carryForwardRecord.finalCarriedAmount - totalPaidForCarryForward;

        // Create a virtual fee assignment for carry forward
        const carryForwardAssignment = {
          _id: `carry-forward-${studentId}`,
          feeMaster: {
            feesGroup: 'Balance Master',
            feesCode: 'Previous Session Balance'
          },
          amount: carryForwardRecord.finalCarriedAmount,
          paidAmount: totalPaidForCarryForward,
          discountAmount: 0,
          fineAmount: 0,
          balance: carryForwardBalance > 0 ? carryForwardBalance : 0,
          status: carryForwardBalance > 0 ? 'Unpaid' : 'Paid',
          dueDate: carryForwardRecord.processedDate || carryForwardRecord.createdAt,
          payments: carryForwardPayments,
          isCarryForward: true, // Flag to identify carry forward
          carryForwardId: carryForwardRecord._id
        };

        // Add to the end of assignments array
        assignmentsWithPayments.push(carryForwardAssignment);
      }

      // Calculate totals (including carry forward)
      const totalAmount = assignmentsWithPayments.reduce((sum, f) => sum + f.amount, 0);
      const totalPaid = assignmentsWithPayments.reduce((sum, f) => sum + f.paidAmount, 0);
      const totalDiscount = assignmentsWithPayments.reduce((sum, f) => sum + f.discountAmount, 0);
      const totalFine = assignmentsWithPayments.reduce((sum, f) => sum + f.fineAmount, 0);
      const totalBalance = assignmentsWithPayments.reduce((sum, f) => sum + f.balance, 0);

      res.status(200).json({
        success: true,
        message: "Student fees fetched successfully",
        data: {
          student,
          feeAssignments: assignmentsWithPayments,
          summary: {
            totalAmount,
            totalPaid,
            totalDiscount,
            totalFine,
            totalBalance
          }
        }
      });

    } catch (error) {
      console.log("Error in getStudentFeesForCollection", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch student fees. Please try again later"
      });
    }
  },

  // ─── Get Student Fee Details ──────────────────────────────────────────────────
  getStudentFeeDetails: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { studentId } = req.params;

      // Get student details
      const student = await StudentAdmission.findOne({
        _id: studentId,
        school: schoolId
      })
        .populate('class', 'class_text class_num')
        .lean();

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found"
        });
      }

      // Get all fee collections for this student
      const feeCollections = await FeeCollection.find({
        school: schoolId,
        student: studentId
      })
        .sort({ dueDate: -1 })
        .lean();

      // Calculate totals
      const totalAmount = feeCollections.reduce((sum, f) => sum + f.amount, 0);
      const totalPaid = feeCollections.reduce((sum, f) => sum + f.paidAmount, 0);
      const totalDiscount = feeCollections.reduce((sum, f) => sum + f.discountAmount, 0);
      const totalFine = feeCollections.reduce((sum, f) => sum + f.fineAmount, 0);
      const totalDue = feeCollections.reduce((sum, f) => sum + f.balance, 0);

      res.status(200).json({
        success: true,
        message: "Student fee details fetched successfully",
        data: {
          student,
          feeCollections,
          summary: {
            totalAmount,
            totalPaid,
            totalDiscount,
            totalFine,
            totalDue
          }
        }
      });

    } catch (error) {
      console.log("Error in getStudentFeeDetails", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch student fee details. Please try again later"
      });
    }
  },

  // ─── Collect Fee ──────────────────────────────────────────────────────────────
  collectFee: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { studentId } = req.params;
      const {
        date,
        paidAmount,
        discountGroup,
        discountAmount,
        fineAmount,
        paymentMode,
        note
      } = req.body;

      console.log('Collect Fee Request:', { studentId, body: req.body });

      // Validate student
      const student = await StudentAdmission.findOne({
        _id: studentId,
        school: schoolId
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found"
        });
      }

      // Create fee collection record
      const feeCollection = new FeeCollection({
        school: schoolId,
        student: studentId,
        amount: parseFloat(paidAmount) + parseFloat(discountAmount || 0) - parseFloat(fineAmount || 0),
        paidAmount: parseFloat(paidAmount),
        discountAmount: parseFloat(discountAmount || 0),
        fineAmount: parseFloat(fineAmount || 0),
        paymentMode: paymentMode || 'Cash',
        paymentDate: date || new Date(),
        note: note || '',
        discountGroup: discountGroup || '',
        collectedBy: req.user.id,
        collectedByName: req.user.school_name || ''
      });

      await feeCollection.save();

      console.log('Fee Collection Created:', feeCollection._id);

      res.status(201).json({
        success: true,
        message: "Fee collected successfully",
        data: feeCollection
      });

    } catch (error) {
      console.log("Error in collectFee", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to collect fee. Please try again later"
      });
    }
  },

  // ─── Get Student Receipts ─────────────────────────────────────────────────────
  getStudentReceipts: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { studentId } = req.params;

      const receipts = await FeeCollection.find({
        school: schoolId,
        student: studentId,
        status: { $in: ['Paid', 'Partial'] }
      })
        .sort({ paymentDate: -1 })
        .lean();

      res.status(200).json({
        success: true,
        message: "Student receipts fetched successfully",
        data: receipts
      });

    } catch (error) {
      console.log("Error in getStudentReceipts", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch student receipts. Please try again later"
      });
    }
  },

  // ─── Get All Classes ──────────────────────────────────────────────────────────
  getAllClasses: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;

      console.log('Fetching classes for school:', schoolId);

      const classes = await Class.find({ school: schoolId })
        .select('class_text class_num sections')
        .sort({ class_num: 1, class_text: 1 })
        .lean();

      console.log('Classes found:', classes.length);

      res.status(200).json({
        success: true,
        message: "Classes fetched successfully",
        data: classes
      });

    } catch (error) {
      console.log("Error in getAllClasses", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch classes. Please try again later"
      });
    }
  },

  // ─── Get Demand Bills ─────────────────────────────────────────────────────────
  getDemandBills: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const page = Math.max(parseInt(req.query.page || '1', 10), 1);
      const limit = Math.max(parseInt(req.query.limit || '10', 10), 1);
      const skip = (page - 1) * limit;
      const search = req.query.search || '';
      const classId = req.query.classId || '';
      const section = req.query.section || '';
      const feesGroup = req.query.feesGroup || '';

      console.log('Get Demand Bills Request:', { schoolId, page, limit, search, classId, section, feesGroup });

      // Build student filter
      const studentFilter = { school: schoolId };

      if (search) {
        const rx = new RegExp(search.trim(), 'i');
        studentFilter.$or = [
          { firstName: rx },
          { lastName: rx },
          { admissionNo: rx },
        ];
      }

      if (classId) {
        studentFilter.class = classId;
      }

      if (section) {
        studentFilter.section = section;
      }

      // Get students
      const students = await StudentAdmission.find(studentFilter)
        .populate('class', 'class_text class_num')
        .select('firstName lastName admissionNo class section')
        .lean();

      if (students.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No students found",
          data: [],
          pagination: {
            total: 0,
            page,
            limit,
            pages: 0
          }
        });
      }

      const studentIds = students.map(s => s._id);

      // Build fee assignment filter
      const feeFilter = {
        school: schoolId,
        student: { $in: studentIds }
      };

      // Get fee assignments with fee master details
      const feeAssignments = await StudentFeeAssignment.find(feeFilter)
        .populate({
          path: 'feeMaster',
          select: 'feesGroup feesCode'
        })
        .populate({
          path: 'student',
          select: 'firstName lastName admissionNo class section',
          populate: {
            path: 'class',
            select: 'class_text class_num'
          }
        })
        .lean();

      // Group by student and calculate totals with detailed fee breakdown
      const demandBillsMap = {};

      feeAssignments.forEach(assignment => {
        const studentId = assignment.student._id.toString();
        
        if (!demandBillsMap[studentId]) {
          demandBillsMap[studentId] = {
            student: assignment.student,
            feesGroup: assignment.feeMaster?.feesGroup || 'N/A',
            totalAmount: 0,
            totalPaid: 0,
            totalDiscount: 0,
            totalFine: 0,
            totalBalance: 0,
            feeDetails: [], // Detailed fee breakdown
            paidFees: [],   // Paid fees list
            unpaidFees: [], // Unpaid fees list
            partialFees: [], // Partial fees list
          };
        }

        // Add to totals
        demandBillsMap[studentId].totalAmount += assignment.amount || 0;
        demandBillsMap[studentId].totalPaid += assignment.paidAmount || 0;
        demandBillsMap[studentId].totalDiscount += assignment.discountAmount || 0;
        demandBillsMap[studentId].totalFine += assignment.fineAmount || 0;
        demandBillsMap[studentId].totalBalance += assignment.balance || 0;

        // Add detailed fee information
        const feeDetail = {
          _id: assignment._id,
          feesGroup: assignment.feeMaster?.feesGroup || 'N/A',
          feesCode: assignment.feeMaster?.feesCode || 'N/A',
          feeType: `${assignment.feeMaster?.feesGroup || 'N/A'} - ${assignment.feeMaster?.feesCode || 'N/A'}`,
          amount: assignment.amount || 0,
          paidAmount: assignment.paidAmount || 0,
          discountAmount: assignment.discountAmount || 0,
          fineAmount: assignment.fineAmount || 0,
          balance: assignment.balance || 0,
          dueDate: assignment.dueDate,
          status: assignment.status,
        };

        demandBillsMap[studentId].feeDetails.push(feeDetail);

        // Categorize as paid, partial, or unpaid
        if (assignment.status === 'Paid') {
          demandBillsMap[studentId].paidFees.push(feeDetail);
        } else if (assignment.status === 'Partial') {
          demandBillsMap[studentId].partialFees.push(feeDetail);
        } else if (assignment.status === 'Unpaid') {
          demandBillsMap[studentId].unpaidFees.push(feeDetail);
        }
      });

      // Convert to array
      let demandBills = Object.values(demandBillsMap);

      // Filter by fees group if specified
      if (feesGroup) {
        demandBills = demandBills.filter(bill => bill.feesGroup === feesGroup);
      }

      // Pagination
      const total = demandBills.length;
      const paginatedBills = demandBills.slice(skip, skip + limit);

      console.log('Demand Bills Found:', paginatedBills.length, 'Total:', total);

      res.status(200).json({
        success: true,
        message: "Demand bills fetched successfully",
        data: paginatedBills,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1
        }
      });

    } catch (error) {
      console.log("Error in getDemandBills", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch demand bills. Please try again later"
      });
    }
  },

  // ─── Get Fee Groups ───────────────────────────────────────────────────────────
  getFeeGroups: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;

      console.log('Fetching fee groups for school:', schoolId);

      const feeGroups = await FeeMaster.find({ school: schoolId })
        .distinct('feesGroup');

      console.log('Fee groups found:', feeGroups.length);

      res.status(200).json({
        success: true,
        message: "Fee groups fetched successfully",
        data: feeGroups
      });

    } catch (error) {
      console.log("Error in getFeeGroups", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch fee groups. Please try again later"
      });
    }
  },

  // ─── Get Offline Bank Payments ────────────────────────────────────────────────
  getOfflineBankPayments: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const page = Math.max(parseInt(req.query.page || '1', 10), 1);
      const limit = Math.max(parseInt(req.query.limit || '100', 10), 1);
      const skip = (page - 1) * limit;
      const search = req.query.search || '';
      const status = req.query.status || '';

      console.log('Get Offline Bank Payments Request:', { schoolId, page, limit, search, status });

      // Build filter
      const filter = { school: schoolId };

      if (search) {
        const rx = new RegExp(search.trim(), 'i');
        filter.$or = [
          { requestId: rx },
          { admissionNo: rx },
          { studentName: rx },
          { paymentId: rx },
        ];
      }

      if (status) {
        filter.status = status;
      }

      const [payments, total] = await Promise.all([
        OfflineBankPayment.find(filter)
          .populate('student', 'firstName lastName admissionNo')
          .populate('class', 'class_text class_num')
          .sort({ submitDate: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        OfflineBankPayment.countDocuments(filter)
      ]);

      console.log('Offline Bank Payments Found:', payments.length, 'Total:', total);

      res.status(200).json({
        success: true,
        message: "Offline bank payments fetched successfully",
        data: payments,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1
        }
      });

    } catch (error) {
      console.log("Error in getOfflineBankPayments", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch offline bank payments. Please try again later"
      });
    }
  },

  // ─── Create Offline Bank Payment ──────────────────────────────────────────────
  createOfflineBankPayment: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const {
        studentId,
        paymentDate,
        amount,
        bankName,
        transactionType,
        transactionNumber,
        note,
      } = req.body;

      console.log('Create Offline Bank Payment Request:', req.body);

      // Validate student
      const student = await StudentAdmission.findOne({
        _id: studentId,
        school: schoolId
      }).populate('class', 'class_text class_num');

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found"
        });
      }

      // Create offline bank payment
      const payment = new OfflineBankPayment({
        school: schoolId,
        student: studentId,
        admissionNo: student.admissionNo,
        studentName: `${student.firstName} ${student.lastName || ''}`.trim(),
        class: student.class?._id,
        paymentDate: paymentDate || new Date(),
        amount: parseFloat(amount),
        bankName,
        transactionType: transactionType || 'NEFT',
        transactionNumber,
        note,
        status: 'Pending'
      });

      await payment.save();

      console.log('Offline Bank Payment Created:', payment.requestId);

      res.status(201).json({
        success: true,
        message: "Offline bank payment request created successfully",
        data: payment
      });

    } catch (error) {
      console.log("Error in createOfflineBankPayment", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create offline bank payment. Please try again later"
      });
    }
  },

  // ─── Update Offline Bank Payment Status ───────────────────────────────────────
  updateOfflineBankPaymentStatus: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { paymentId } = req.params;
      const { status, paymentId: bankPaymentId, rejectionReason } = req.body;

      console.log('Update Offline Bank Payment Status:', { paymentId, status });

      const payment = await OfflineBankPayment.findOne({
        _id: paymentId,
        school: schoolId
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found"
        });
      }

      payment.status = status;
      payment.statusDate = new Date();
      payment.approvedBy = req.user.id;
      payment.approvedByName = req.user.school_name || '';

      if (status === 'Approved' && bankPaymentId) {
        payment.paymentId = bankPaymentId;
      }

      if (status === 'Rejected' && rejectionReason) {
        payment.rejectionReason = rejectionReason;
      }

      await payment.save();

      console.log('Offline Bank Payment Status Updated:', payment.requestId, status);

      res.status(200).json({
        success: true,
        message: `Payment ${status.toLowerCase()} successfully`,
        data: payment
      });

    } catch (error) {
      console.log("Error in updateOfflineBankPaymentStatus", error);
      res.status(500).json({
        success: false,
        message: "Failed to update payment status. Please try again later"
      });
    }
  },

  // ─── Search Fee Payments ──────────────────────────────────────────────────────
  searchFeePayments: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const page = Math.max(parseInt(req.query.page || '1', 10), 1);
      const limit = Math.max(parseInt(req.query.limit || '10', 10), 1);
      const skip = (page - 1) * limit;
      const search = req.query.search || '';
      const paymentId = req.query.paymentId || '';

      console.log('Search Fee Payments Request:', { schoolId, page, limit, search, paymentId });

      // Build filter
      const filter = { school: schoolId };

      // If payment ID is provided, search by receipt number
      if (paymentId) {
        filter.receiptNumber = new RegExp(paymentId.trim(), 'i');
      }

      // If general search is provided
      if (search && !paymentId) {
        const rx = new RegExp(search.trim(), 'i');
        filter.$or = [
          { receiptNumber: rx },
        ];
      }

      const [payments, total] = await Promise.all([
        FeeCollection.find(filter)
          .populate({
            path: 'student',
            select: 'firstName lastName admissionNo class',
            populate: {
              path: 'class',
              select: 'class_text class_num'
            }
          })
          .sort({ paymentDate: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        FeeCollection.countDocuments(filter)
      ]);

      console.log('Fee Payments Found:', payments.length, 'Total:', total);

      res.status(200).json({
        success: true,
        message: "Fee payments fetched successfully",
        data: payments,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1
        }
      });

    } catch (error) {
      console.log("Error in searchFeePayments", error);
      res.status(500).json({
        success: false,
        message: "Failed to search fee payments. Please try again later"
      });
    }
  },

  // ─── Get Payment Details by ID ────────────────────────────────────────────────
  getPaymentDetails: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { paymentId } = req.params;

      console.log('Get Payment Details:', paymentId);

      const payment = await FeeCollection.findOne({
        _id: paymentId,
        school: schoolId
      })
        .populate({
          path: 'student',
          select: 'firstName lastName admissionNo class fatherName mobileNumber',
          populate: {
            path: 'class',
            select: 'class_text class_num'
          }
        })
        .lean();

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found"
        });
      }

      console.log('Payment Details Found:', payment.receiptNumber);

      res.status(200).json({
        success: true,
        message: "Payment details fetched successfully",
        data: payment
      });

    } catch (error) {
      console.log("Error in getPaymentDetails", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch payment details. Please try again later"
      });
    }
  },

  // ─── Search Due Fees ──────────────────────────────────────────────────────────
  searchDueFees: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const page = Math.max(parseInt(req.query.page || '1', 10), 1);
      const limit = Math.max(parseInt(req.query.limit || '10', 10), 1);
      const skip = (page - 1) * limit;
      const search = req.query.search || '';
      const classId = req.query.classId || '';
      const section = req.query.section || '';
      const feesGroup = req.query.feesGroup || '';

      console.log('Search Due Fees Request:', { schoolId, page, limit, search, classId, section, feesGroup });

      // Build student filter
      const studentFilter = { school: schoolId };

      if (search) {
        const rx = new RegExp(search.trim(), 'i');
        studentFilter.$or = [
          { firstName: rx },
          { lastName: rx },
          { admissionNo: rx },
          { rollNumber: rx },
          { fatherName: rx },
        ];
      }

      if (classId) {
        studentFilter.class = classId;
      }

      if (section) {
        studentFilter.section = section;
      }

      // Get students matching the filter
      const students = await StudentAdmission.find(studentFilter)
        .populate('class', 'class_text class_num')
        .select('firstName lastName admissionNo rollNumber class section fatherName mobileNumber')
        .lean();

      if (students.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No students found",
          data: [],
          pagination: {
            total: 0,
            page,
            limit,
            pages: 0
          }
        });
      }

      const studentIds = students.map(s => s._id);

      // Build fee assignment filter
      const feeFilter = {
        school: schoolId,
        student: { $in: studentIds },
        balance: { $gt: 0 } // Only get records with due balance
      };

      // Get fee assignments with due balance
      const feeAssignments = await StudentFeeAssignment.find(feeFilter)
        .populate({
          path: 'feeMaster',
          select: 'feesGroup feesCode'
        })
        .populate({
          path: 'student',
          select: 'firstName lastName admissionNo rollNumber class section fatherName mobileNumber',
          populate: {
            path: 'class',
            select: 'class_text class_num'
          }
        })
        .lean();

      // Group by student and calculate totals
      const dueFeeMap = {};

      feeAssignments.forEach(assignment => {
        const studentId = assignment.student._id.toString();
        const feeGroupName = assignment.feeMaster?.feesGroup || 'N/A';
        
        if (!dueFeeMap[studentId]) {
          dueFeeMap[studentId] = {
            student: assignment.student,
            feesGroup: feeGroupName,
            totalAmount: 0,
            totalPaid: 0,
            totalDiscount: 0,
            totalFine: 0,
            totalBalance: 0,
          };
        }

        dueFeeMap[studentId].totalAmount += assignment.amount || 0;
        dueFeeMap[studentId].totalPaid += assignment.paidAmount || 0;
        dueFeeMap[studentId].totalDiscount += assignment.discountAmount || 0;
        dueFeeMap[studentId].totalFine += assignment.fineAmount || 0;
        dueFeeMap[studentId].totalBalance += assignment.balance || 0;
      });

      // Convert to array
      let dueFees = Object.values(dueFeeMap);

      // Filter by fees group if specified
      if (feesGroup) {
        dueFees = dueFees.filter(fee => fee.feesGroup === feesGroup);
      }

      // Sort by balance (highest first)
      dueFees.sort((a, b) => b.totalBalance - a.totalBalance);

      // Pagination
      const total = dueFees.length;
      const paginatedDueFees = dueFees.slice(skip, skip + limit);

      console.log('Due Fees Found:', paginatedDueFees.length, 'Total:', total);

      res.status(200).json({
        success: true,
        message: "Due fees fetched successfully",
        data: paginatedDueFees,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1
        }
      });

    } catch (error) {
      console.log("Error in searchDueFees", error);
      res.status(500).json({
        success: false,
        message: "Failed to search due fees. Please try again later"
      });
    }
  },

  // ─── Get Student Demand Bill Details ──────────────────────────────────────────
  getStudentDemandBill: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { studentId } = req.params;

      console.log('Get Student Demand Bill:', studentId);

      // Get student details
      const student = await StudentAdmission.findOne({
        _id: studentId,
        school: schoolId
      })
        .populate('class', 'class_text class_num')
        .lean();

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found"
        });
      }

      // Get all fee assignments for this student
      const feeAssignments = await StudentFeeAssignment.find({
        school: schoolId,
        student: studentId
      })
        .populate('feeMaster', 'feesGroup feesCode amount')
        .sort({ dueDate: 1 })
        .lean();

      // Calculate totals
      const totalAmount = feeAssignments.reduce((sum, f) => sum + f.amount, 0);
      const totalPaid = feeAssignments.reduce((sum, f) => sum + f.paidAmount, 0);
      const totalDiscount = feeAssignments.reduce((sum, f) => sum + f.discountAmount, 0);
      const totalFine = feeAssignments.reduce((sum, f) => sum + f.fineAmount, 0);
      const totalBalance = feeAssignments.reduce((sum, f) => sum + f.balance, 0);

      console.log('Demand Bill Details Found for:', student.admissionNo);

      res.status(200).json({
        success: true,
        message: "Student demand bill fetched successfully",
        data: {
          student,
          feeAssignments,
          summary: {
            totalAmount,
            totalPaid,
            totalDiscount,
            totalFine,
            totalBalance
          }
        }
      });

    } catch (error) {
      console.log("Error in getStudentDemandBill", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch student demand bill. Please try again later"
      });
    }
  },

  // ─── Get All Fee Masters ──────────────────────────────────────────────────────
  getAllFeeMasters: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const page = Math.max(parseInt(req.query.page || '1', 10), 1);
      const limit = Math.max(parseInt(req.query.limit || '10', 10), 1);
      const skip = (page - 1) * limit;
      const search = req.query.search || '';
      const feesGroup = req.query.feesGroup || '';
      const classId = req.query.classId || '';

      console.log('Get All Fee Masters Request:', { schoolId, page, limit, search, feesGroup, classId });

      // Build filter
      const filter = { school: schoolId };

      if (search) {
        const rx = new RegExp(search.trim(), 'i');
        filter.$or = [
          { feesGroup: rx },
          { feesCode: rx },
        ];
      }

      if (feesGroup) {
        filter.feesGroup = feesGroup;
      }

      if (classId) {
        filter.class = classId;
      }

      const [feeMasters, total] = await Promise.all([
        FeeMaster.find(filter)
          .populate('class', 'class_text class_num')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        FeeMaster.countDocuments(filter)
      ]);

      console.log('Fee Masters Found:', feeMasters.length, 'Total:', total);

      res.status(200).json({
        success: true,
        message: "Fee masters fetched successfully",
        data: feeMasters,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1
        }
      });

    } catch (error) {
      console.log("Error in getAllFeeMasters", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch fee masters. Please try again later"
      });
    }
  },

  // ─── Create Fee Master ────────────────────────────────────────────────────────
  createFeeMaster: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const {
        feesGroup,
        feesCode,
        amount,
        dueDate,
        classId,
        section,
        category,
        fineType,
        finePercentage,
        fineAmount
      } = req.body;

      console.log('Create Fee Master Request:', req.body);

      // Validate required fields
      if (!feesGroup || !feesCode || !amount) {
        return res.status(400).json({
          success: false,
          message: "Fees Group, Fees Code, and Amount are required"
        });
      }

      // Create fee master
      const feeMaster = new FeeMaster({
        school: schoolId,
        feesGroup,
        feesCode,
        amount: parseFloat(amount),
        dueDate: dueDate || null,
        class: classId || null,
        section: section || null,
        category: category || null,
        fineType: fineType || 'None',
        finePercentage: fineType === 'Percentage' ? parseFloat(finePercentage || 0) : 0,
        fineAmount: fineType === 'Fix Amount' ? parseFloat(fineAmount || 0) : 0,
        isActive: true
      });

      await feeMaster.save();

      console.log('Fee Master Created:', feeMaster._id);

      res.status(201).json({
        success: true,
        message: "Fee master created successfully",
        data: feeMaster
      });

    } catch (error) {
      console.log("Error in createFeeMaster", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create fee master. Please try again later"
      });
    }
  },

  // ─── Update Fee Master ────────────────────────────────────────────────────────
  updateFeeMaster: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { feeMasterId } = req.params;
      const updateData = req.body;

      console.log('Update Fee Master Request:', feeMasterId, updateData);

      const feeMaster = await FeeMaster.findOne({
        _id: feeMasterId,
        school: schoolId
      });

      if (!feeMaster) {
        return res.status(404).json({
          success: false,
          message: "Fee master not found"
        });
      }

      // Update fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined && updateData[key] !== '') {
          feeMaster[key] = updateData[key];
        }
      });

      feeMaster.updatedAt = Date.now();
      await feeMaster.save();

      console.log('Fee Master Updated:', feeMaster._id);

      res.status(200).json({
        success: true,
        message: "Fee master updated successfully",
        data: feeMaster
      });

    } catch (error) {
      console.log("Error in updateFeeMaster", error);
      res.status(500).json({
        success: false,
        message: "Failed to update fee master. Please try again later"
      });
    }
  },

  // ─── Delete Fee Master ────────────────────────────────────────────────────────
  deleteFeeMaster: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { feeMasterId } = req.params;

      console.log('Delete Fee Master Request:', feeMasterId);

      const feeMaster = await FeeMaster.findOneAndDelete({
        _id: feeMasterId,
        school: schoolId
      });

      if (!feeMaster) {
        return res.status(404).json({
          success: false,
          message: "Fee master not found"
        });
      }

      console.log('Fee Master Deleted:', feeMasterId);

      res.status(200).json({
        success: true,
        message: "Fee master deleted successfully"
      });

    } catch (error) {
      console.log("Error in deleteFeeMaster", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete fee master. Please try again later"
      });
    }
  },

  // ─── Get Fee Master by ID ─────────────────────────────────────────────────────
  getFeeMasterById: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { feeMasterId } = req.params;

      console.log('Get Fee Master by ID:', feeMasterId);

      const feeMaster = await FeeMaster.findOne({
        _id: feeMasterId,
        school: schoolId
      })
        .populate('class', 'class_text class_num')
        .lean();

      if (!feeMaster) {
        return res.status(404).json({
          success: false,
          message: "Fee master not found"
        });
      }

      console.log('Fee Master Found:', feeMaster._id);

      res.status(200).json({
        success: true,
        message: "Fee master fetched successfully",
        data: feeMaster
      });

    } catch (error) {
      console.log("Error in getFeeMasterById", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch fee master. Please try again later"
      });
    }
  },

  // ─── Get All Fee Groups ───────────────────────────────────────────────────────
  getAllFeeGroupsWithPagination: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const page = Math.max(parseInt(req.query.page || '1', 10), 1);
      const limit = Math.max(parseInt(req.query.limit || '10', 10), 1);
      const skip = (page - 1) * limit;
      const search = req.query.search || '';

      console.log('Get All Fee Groups Request:', { schoolId, page, limit, search });

      // Build filter
      const filter = { school: schoolId };

      if (search) {
        const rx = new RegExp(search.trim(), 'i');
        filter.$or = [
          { name: rx },
          { description: rx },
        ];
      }

      const [feeGroups, total] = await Promise.all([
        FeeGroup.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        FeeGroup.countDocuments(filter)
      ]);

      console.log('Fee Groups Found:', feeGroups.length, 'Total:', total);

      res.status(200).json({
        success: true,
        message: "Fee groups fetched successfully",
        data: feeGroups,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1
        }
      });

    } catch (error) {
      console.log("Error in getAllFeeGroupsWithPagination", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch fee groups. Please try again later"
      });
    }
  },

  // ─── Create Fee Group ─────────────────────────────────────────────────────────
  createFeeGroup: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { name, description } = req.body;

      console.log('Create Fee Group Request:', req.body);

      // Validate required fields
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Fee group name is required"
        });
      }

      // Check if fee group already exists
      const existingGroup = await FeeGroup.findOne({
        school: schoolId,
        name: name.trim()
      });

      if (existingGroup) {
        return res.status(400).json({
          success: false,
          message: "Fee group with this name already exists"
        });
      }

      // Create fee group
      const feeGroup = new FeeGroup({
        school: schoolId,
        name: name.trim(),
        description: description?.trim() || '',
        isActive: true
      });

      await feeGroup.save();

      console.log('Fee Group Created:', feeGroup._id);

      res.status(201).json({
        success: true,
        message: "Fee group created successfully",
        data: feeGroup
      });

    } catch (error) {
      console.log("Error in createFeeGroup", error);
      
      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Fee group with this name already exists"
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || "Failed to create fee group. Please try again later"
      });
    }
  },

  // ─── Update Fee Group ─────────────────────────────────────────────────────────
  updateFeeGroup: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { feeGroupId } = req.params;
      const { name, description } = req.body;

      console.log('Update Fee Group Request:', feeGroupId, req.body);

      const feeGroup = await FeeGroup.findOne({
        _id: feeGroupId,
        school: schoolId
      });

      if (!feeGroup) {
        return res.status(404).json({
          success: false,
          message: "Fee group not found"
        });
      }

      // Check if new name already exists (excluding current group)
      if (name && name.trim() !== feeGroup.name) {
        const existingGroup = await FeeGroup.findOne({
          school: schoolId,
          name: name.trim(),
          _id: { $ne: feeGroupId }
        });

        if (existingGroup) {
          return res.status(400).json({
            success: false,
            message: "Fee group with this name already exists"
          });
        }
      }

      // Update fields
      if (name && name.trim()) {
        feeGroup.name = name.trim();
      }
      if (description !== undefined) {
        feeGroup.description = description.trim();
      }

      feeGroup.updatedAt = Date.now();
      await feeGroup.save();

      console.log('Fee Group Updated:', feeGroup._id);

      res.status(200).json({
        success: true,
        message: "Fee group updated successfully",
        data: feeGroup
      });

    } catch (error) {
      console.log("Error in updateFeeGroup", error);
      
      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Fee group with this name already exists"
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to update fee group. Please try again later"
      });
    }
  },

  // ─── Delete Fee Group ─────────────────────────────────────────────────────────
  deleteFeeGroup: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { feeGroupId } = req.params;

      console.log('Delete Fee Group Request:', feeGroupId);

      // Check if fee group is being used in fee masters
      const feeMasterCount = await FeeMaster.countDocuments({
        school: schoolId,
        feesGroup: { $exists: true }
      });

      if (feeMasterCount > 0) {
        // Get the fee group name to check
        const feeGroup = await FeeGroup.findById(feeGroupId);
        if (feeGroup) {
          const usedInMasters = await FeeMaster.countDocuments({
            school: schoolId,
            feesGroup: feeGroup.name
          });

          if (usedInMasters > 0) {
            return res.status(400).json({
              success: false,
              message: `Cannot delete fee group. It is being used in ${usedInMasters} fee master(s)`
            });
          }
        }
      }

      const feeGroup = await FeeGroup.findOneAndDelete({
        _id: feeGroupId,
        school: schoolId
      });

      if (!feeGroup) {
        return res.status(404).json({
          success: false,
          message: "Fee group not found"
        });
      }

      console.log('Fee Group Deleted:', feeGroupId);

      res.status(200).json({
        success: true,
        message: "Fee group deleted successfully"
      });

    } catch (error) {
      console.log("Error in deleteFeeGroup", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete fee group. Please try again later"
      });
    }
  },

  // ─── Get Fee Group by ID ──────────────────────────────────────────────────────
  getFeeGroupById: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { feeGroupId } = req.params;

      console.log('Get Fee Group by ID:', feeGroupId);

      const feeGroup = await FeeGroup.findOne({
        _id: feeGroupId,
        school: schoolId
      }).lean();

      if (!feeGroup) {
        return res.status(404).json({
          success: false,
          message: "Fee group not found"
        });
      }

      console.log('Fee Group Found:', feeGroup._id);

      res.status(200).json({
        success: true,
        message: "Fee group fetched successfully",
        data: feeGroup
      });

    } catch (error) {
      console.log("Error in getFeeGroupById", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch fee group. Please try again later"
      });
    }
  },

  // ─── Get All Fee Types ────────────────────────────────────────────────────────
  getAllFeeTypesWithPagination: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const page = Math.max(parseInt(req.query.page || '1', 10), 1);
      const limit = Math.max(parseInt(req.query.limit || '10', 10), 1);
      const skip = (page - 1) * limit;
      const search = req.query.search || '';

      console.log('Get All Fee Types Request:', { schoolId, page, limit, search });

      // Build filter
      const filter = { school: schoolId };

      if (search) {
        const rx = new RegExp(search.trim(), 'i');
        filter.$or = [
          { name: rx },
          { feeCode: rx },
          { description: rx },
        ];
      }

      const [feeTypes, total] = await Promise.all([
        FeeType.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        FeeType.countDocuments(filter)
      ]);

      console.log('Fee Types Found:', feeTypes.length, 'Total:', total);

      res.status(200).json({
        success: true,
        message: "Fee types fetched successfully",
        data: feeTypes,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1
        }
      });

    } catch (error) {
      console.log("Error in getAllFeeTypesWithPagination", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch fee types. Please try again later"
      });
    }
  },

  // ─── Create Fee Type ──────────────────────────────────────────────────────────
  createFeeType: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { name, feeCode, description } = req.body;

      console.log('Create Fee Type Request:', req.body);

      // Validate required fields
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Fee type name is required"
        });
      }

      if (!feeCode || !feeCode.trim()) {
        return res.status(400).json({
          success: false,
          message: "Fee code is required"
        });
      }

      // Check if fee type already exists
      const existingType = await FeeType.findOne({
        school: schoolId,
        $or: [
          { name: name.trim() },
          { feeCode: feeCode.trim() }
        ]
      });

      if (existingType) {
        if (existingType.name === name.trim()) {
          return res.status(400).json({
            success: false,
            message: "Fee type with this name already exists"
          });
        }
        if (existingType.feeCode === feeCode.trim()) {
          return res.status(400).json({
            success: false,
            message: "Fee type with this code already exists"
          });
        }
      }

      // Create fee type
      const feeType = new FeeType({
        school: schoolId,
        name: name.trim(),
        feeCode: feeCode.trim(),
        description: description?.trim() || '',
        isActive: true
      });

      await feeType.save();

      console.log('Fee Type Created:', feeType._id);

      res.status(201).json({
        success: true,
        message: "Fee type created successfully",
        data: feeType
      });

    } catch (error) {
      console.log("Error in createFeeType", error);
      
      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Fee type with this name or code already exists"
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || "Failed to create fee type. Please try again later"
      });
    }
  },

  // ─── Update Fee Type ──────────────────────────────────────────────────────────
  updateFeeType: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { feeTypeId } = req.params;
      const { name, feeCode, description } = req.body;

      console.log('Update Fee Type Request:', feeTypeId, req.body);

      const feeType = await FeeType.findOne({
        _id: feeTypeId,
        school: schoolId
      });

      if (!feeType) {
        return res.status(404).json({
          success: false,
          message: "Fee type not found"
        });
      }

      // Check if new name already exists (excluding current type)
      if (name && name.trim() !== feeType.name) {
        const existingType = await FeeType.findOne({
          school: schoolId,
          name: name.trim(),
          _id: { $ne: feeTypeId }
        });

        if (existingType) {
          return res.status(400).json({
            success: false,
            message: "Fee type with this name already exists"
          });
        }
      }

      // Check if new fee code already exists (excluding current type)
      if (feeCode && feeCode.trim() !== feeType.feeCode) {
        const existingType = await FeeType.findOne({
          school: schoolId,
          feeCode: feeCode.trim(),
          _id: { $ne: feeTypeId }
        });

        if (existingType) {
          return res.status(400).json({
            success: false,
            message: "Fee type with this code already exists"
          });
        }
      }

      // Update fields
      if (name && name.trim()) {
        feeType.name = name.trim();
      }
      if (feeCode && feeCode.trim()) {
        feeType.feeCode = feeCode.trim();
      }
      if (description !== undefined) {
        feeType.description = description.trim();
      }

      feeType.updatedAt = Date.now();
      await feeType.save();

      console.log('Fee Type Updated:', feeType._id);

      res.status(200).json({
        success: true,
        message: "Fee type updated successfully",
        data: feeType
      });

    } catch (error) {
      console.log("Error in updateFeeType", error);
      
      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Fee type with this name or code already exists"
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to update fee type. Please try again later"
      });
    }
  },

  // ─── Delete Fee Type ──────────────────────────────────────────────────────────
  deleteFeeType: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { feeTypeId } = req.params;

      console.log('Delete Fee Type Request:', feeTypeId);

      // Check if fee type is being used in fee masters
      const feeType = await FeeType.findById(feeTypeId);
      if (feeType) {
        const usedInMasters = await FeeMaster.countDocuments({
          school: schoolId,
          feesCode: feeType.name
        });

        if (usedInMasters > 0) {
          return res.status(400).json({
            success: false,
            message: `Cannot delete fee type. It is being used in ${usedInMasters} fee master(s)`
          });
        }
      }

      const deletedFeeType = await FeeType.findOneAndDelete({
        _id: feeTypeId,
        school: schoolId
      });

      if (!deletedFeeType) {
        return res.status(404).json({
          success: false,
          message: "Fee type not found"
        });
      }

      console.log('Fee Type Deleted:', feeTypeId);

      res.status(200).json({
        success: true,
        message: "Fee type deleted successfully"
      });

    } catch (error) {
      console.log("Error in deleteFeeType", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete fee type. Please try again later"
      });
    }
  },

  // ─── Get Fee Type by ID ───────────────────────────────────────────────────────
  getFeeTypeById: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { feeTypeId } = req.params;

      console.log('Get Fee Type by ID:', feeTypeId);

      const feeType = await FeeType.findOne({
        _id: feeTypeId,
        school: schoolId
      }).lean();

      if (!feeType) {
        return res.status(404).json({
          success: false,
          message: "Fee type not found"
        });
      }

      console.log('Fee Type Found:', feeType._id);

      res.status(200).json({
        success: true,
        message: "Fee type fetched successfully",
        data: feeType
      });

    } catch (error) {
      console.log("Error in getFeeTypeById", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch fee type. Please try again later"
      });
    }
  },

  // ─── Collect Single Fee ───────────────────────────────────────────────────────
  collectSingleFee: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { feeAssignmentId } = req.params;
      const {
        date,
        amount,
        discountGroup,
        discountAmount,
        fineAmount,
        paymentMode,
        note
      } = req.body;

      console.log('Collect Single Fee Request:', { feeAssignmentId, body: req.body });

      // Validate fee assignment
      const feeAssignment = await StudentFeeAssignment.findOne({
        _id: feeAssignmentId,
        school: schoolId
      }).populate('student', 'firstName lastName admissionNo mobileNumber')
        .populate('feeMaster', 'feesGroup feesCode');

      if (!feeAssignment) {
        return res.status(404).json({
          success: false,
          message: "Fee assignment not found"
        });
      }

      // Check if amount is valid
      const paidAmount = parseFloat(amount);
      const discount = parseFloat(discountAmount || 0);
      const fine = parseFloat(fineAmount || 0);

      if (paidAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Payment amount must be greater than 0"
        });
      }

      // Create payment record
      const payment = new FeePayment({
        school: schoolId,
        student: feeAssignment.student._id,
        feeAssignment: feeAssignmentId,
        paymentDate: date || new Date(),
        amount: paidAmount,
        discountAmount: discount,
        discountGroup: discountGroup || '',
        fineAmount: fine,
        paymentMode: paymentMode || 'Cash',
        note: note || '',
        collectedBy: req.user.id,
        collectedByName: req.user.school_name || ''
      });

      await payment.save();

      // Update fee assignment
      feeAssignment.paidAmount += paidAmount;
      feeAssignment.discountAmount += discount;
      feeAssignment.fineAmount += fine;
      feeAssignment.balance = feeAssignment.amount - feeAssignment.paidAmount - feeAssignment.discountAmount + feeAssignment.fineAmount;
      
      // Update status
      if (feeAssignment.balance <= 0) {
        feeAssignment.status = 'Paid';
      } else if (feeAssignment.paidAmount > 0) {
        feeAssignment.status = 'Partial';
      }

      await feeAssignment.save();

      console.log('Fee Payment Created:', payment.paymentId);

      res.status(201).json({
        success: true,
        message: "Fee collected successfully",
        data: {
          payment,
          feeAssignment
        }
      });

    } catch (error) {
      console.log("Error in collectSingleFee", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to collect fee. Please try again later"
      });
    }
  },

  // ─── Collect Multiple Fees ────────────────────────────────────────────────────
  collectMultipleFees: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const {
        studentId,
        date,
        paidAmount,
        discountGroup,
        discountAmount,
        paymentMode,
        note,
        selectedFees // Array of fee assignment IDs (can include carry-forward-{studentId})
      } = req.body;

      console.log('Collect Multiple Fees Request:', { studentId, selectedFees });

      // Validate student
      const student = await StudentAdmission.findOne({
        _id: studentId,
        school: schoolId
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found"
        });
      }

      if (!selectedFees || selectedFees.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please select at least one fee to collect"
        });
      }

      // Separate carry forward from regular fees
      const carryForwardIds = selectedFees.filter(id => typeof id === 'string' && id.startsWith('carry-forward-'));
      const regularFeeIds = selectedFees.filter(id => !carryForwardIds.includes(id));

      // Get regular fee assignments
      const feeAssignments = await StudentFeeAssignment.find({
        _id: { $in: regularFeeIds },
        school: schoolId,
        student: studentId
      }).populate('feeMaster', 'feesGroup feesCode');

      // Get carry forward record if selected
      let carryForwardRecord = null;
      if (carryForwardIds.length > 0) {
        const FeeCarryForward = require('../../model/feeCollections/feeCarryForward.model');
        carryForwardRecord = await FeeCarryForward.findOne({
          school: schoolId,
          student: studentId,
          status: { $in: ['pending', 'processed'] } // Include both pending and processed
        }).sort({ createdAt: -1 });
      }

      if (feeAssignments.length === 0 && !carryForwardRecord) {
        return res.status(404).json({
          success: false,
          message: "No valid fee assignments found"
        });
      }

      const payments = [];
      const totalPaid = parseFloat(paidAmount);
      const totalDiscount = parseFloat(discountAmount || 0);

      // Calculate total amount and fine for selected fees
      let totalAmount = 0;
      let totalFine = 0;

      feeAssignments.forEach(assignment => {
        totalAmount += assignment.balance;
        totalFine += assignment.fineAmount;
      });

      // Add carry forward balance to total
      let carryForwardBalance = 0;
      if (carryForwardRecord) {
        const existingCarryForwardPayments = await FeePayment.find({
          school: schoolId,
          student: studentId,
          feeType: 'carry-forward',
          isReverted: false
        });
        const totalCarryForwardPaid = existingCarryForwardPayments.reduce((sum, p) => sum + p.amount, 0);
        carryForwardBalance = carryForwardRecord.finalCarriedAmount - totalCarryForwardPaid;
        totalAmount += carryForwardBalance;
      }

      // Distribute payment across selected fees proportionally
      let remainingPayment = totalPaid;
      let remainingDiscount = totalDiscount;

      // Process regular fee assignments
      for (let i = 0; i < feeAssignments.length; i++) {
        const assignment = feeAssignments[i];
        const isLast = i === feeAssignments.length - 1 && !carryForwardRecord;

        // Calculate proportional payment
        let assignmentPayment = isLast 
          ? remainingPayment 
          : Math.min(assignment.balance, (assignment.balance / totalAmount) * totalPaid);
        
        let assignmentDiscount = isLast
          ? remainingDiscount
          : Math.min(assignment.balance, (assignment.balance / totalAmount) * totalDiscount);

        assignmentPayment = Math.round(assignmentPayment * 100) / 100;
        assignmentDiscount = Math.round(assignmentDiscount * 100) / 100;

        // Create payment record
        const payment = new FeePayment({
          school: schoolId,
          student: studentId,
          feeAssignment: assignment._id,
          feeType: 'regular',
          paymentDate: date || new Date(),
          amount: assignmentPayment,
          discountAmount: assignmentDiscount,
          discountGroup: discountGroup || null,
          fineAmount: 0,
          paymentMode: paymentMode || 'Cash',
          note: note || '',
          collectedBy: req.user.id,
          collectedByName: req.user.school_name || ''
        });

        await payment.save();
        payments.push(payment);

        // Update fee assignment
        assignment.paidAmount += assignmentPayment;
        assignment.discountAmount += assignmentDiscount;
        assignment.balance = assignment.amount - assignment.paidAmount - assignment.discountAmount + assignment.fineAmount;
        
        // Update status
        if (assignment.balance <= 0) {
          assignment.status = 'Paid';
        } else if (assignment.paidAmount > 0) {
          assignment.status = 'Partial';
        }

        await assignment.save();

        remainingPayment -= assignmentPayment;
        remainingDiscount -= assignmentDiscount;
      }

      // Process carry forward payment if selected
      if (carryForwardRecord && carryForwardBalance > 0) {
        const carryForwardPayment = Math.min(remainingPayment, carryForwardBalance);
        const carryForwardDiscountAmount = Math.min(remainingDiscount, carryForwardBalance);

        if (carryForwardPayment > 0) {
          const payment = new FeePayment({
            school: schoolId,
            student: studentId,
            feeType: 'carry-forward',
            paymentDate: date || new Date(),
            amount: carryForwardPayment,
            discountAmount: carryForwardDiscountAmount,
            discountGroup: discountGroup || null,
            fineAmount: 0,
            paymentMode: paymentMode || 'Cash',
            note: note || 'Payment for Previous Session Balance',
            collectedBy: req.user.id,
            collectedByName: req.user.school_name || ''
          });

          await payment.save();
          payments.push(payment);

          remainingPayment -= carryForwardPayment;
          remainingDiscount -= carryForwardDiscountAmount;
        }
      }

      console.log('Multiple Fees Collected:', payments.length);

      res.status(201).json({
        success: true,
        message: "Fees collected successfully",
        data: {
          payments,
          totalCollected: totalPaid
        }
      });

    } catch (error) {
      console.log("Error in collectMultipleFees", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to collect fees. Please try again later"
      });
    }
  },

  // ─── Get Fee Assignment Payments ──────────────────────────────────────────────
  getFeeAssignmentPayments: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { feeAssignmentId } = req.params;

      console.log('Get Fee Assignment Payments:', feeAssignmentId);

      const payments = await FeePayment.find({
        school: schoolId,
        feeAssignment: feeAssignmentId,
        isReverted: false
      })
        .sort({ paymentDate: -1 })
        .lean();

      res.status(200).json({
        success: true,
        message: "Payments fetched successfully",
        data: payments
      });

    } catch (error) {
      console.log("Error in getFeeAssignmentPayments", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch payments. Please try again later"
      });
    }
  },

  // ─── Get Student All Receipts ─────────────────────────────────────────────────
  getStudentAllReceipts: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { studentId } = req.params;

      console.log('Get Student All Receipts:', studentId);

      const receipts = await FeePayment.find({
        school: schoolId,
        student: studentId,
        isReverted: false
      })
        .populate({
          path: 'feeAssignment',
          populate: {
            path: 'feeMaster',
            select: 'feesGroup feesCode'
          }
        })
        .sort({ paymentDate: -1 })
        .lean();

      res.status(200).json({
        success: true,
        message: "Receipts fetched successfully",
        data: receipts
      });

    } catch (error) {
      console.log("Error in getStudentAllReceipts", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch receipts. Please try again later"
      });
    }
  },

  // ─── Get Receipt Details ──────────────────────────────────────────────────────
  getReceiptDetails: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { receiptId } = req.params;

      console.log('Get Receipt Details:', receiptId);

      const receipt = await FeePayment.findOne({
        _id: receiptId,
        school: schoolId
      })
        .populate({
          path: 'student',
          select: 'firstName lastName admissionNo class fatherName mobileNumber',
          populate: {
            path: 'class',
            select: 'class_text class_num'
          }
        })
        .populate({
          path: 'feeAssignment',
          populate: {
            path: 'feeMaster',
            select: 'feesGroup feesCode'
          }
        })
        .lean();

      if (!receipt) {
        return res.status(404).json({
          success: false,
          message: "Receipt not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Receipt details fetched successfully",
        data: receipt
      });

    } catch (error) {
      console.log("Error in getReceiptDetails", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch receipt details. Please try again later"
      });
    }
  },

  // ─── Revert Payment ───────────────────────────────────────────────────────────
  revertPayment: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { paymentId } = req.params;

      console.log('Revert Payment Request:', paymentId);

      // Find payment
      const payment = await FeePayment.findOne({
        _id: paymentId,
        school: schoolId,
        isReverted: false
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found or already reverted"
        });
      }

      // Find fee assignment
      const feeAssignment = await StudentFeeAssignment.findById(payment.feeAssignment);

      if (!feeAssignment) {
        return res.status(404).json({
          success: false,
          message: "Fee assignment not found"
        });
      }

      // Revert the payment amounts
      feeAssignment.paidAmount -= payment.amount;
      feeAssignment.discountAmount -= payment.discountAmount;
      feeAssignment.fineAmount -= payment.fineAmount;
      feeAssignment.balance = feeAssignment.amount - feeAssignment.paidAmount - feeAssignment.discountAmount + feeAssignment.fineAmount;

      // Update status
      if (feeAssignment.paidAmount <= 0) {
        feeAssignment.status = 'Unpaid';
      } else if (feeAssignment.balance > 0) {
        feeAssignment.status = 'Partial';
      } else {
        feeAssignment.status = 'Paid';
      }

      await feeAssignment.save();

      // Mark payment as reverted
      payment.isReverted = true;
      payment.revertedAt = new Date();
      payment.revertedBy = req.user.id;
      payment.revertedByName = req.user.school_name || '';

      await payment.save();

      console.log('Payment Reverted:', payment.paymentId);

      res.status(200).json({
        success: true,
        message: "Payment reverted successfully",
        data: {
          payment,
          feeAssignment
        }
      });

    } catch (error) {
      console.log("Error in revertPayment", error);
      res.status(500).json({
        success: false,
        message: "Failed to revert payment. Please try again later"
      });
    }
  },

  // ─── Get Discount Groups ──────────────────────────────────────────────────────
  getDiscountGroups: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;

      console.log('Fetching discount groups for school:', schoolId);

      const discountGroups = await FeeDiscount.find({ 
        school: schoolId,
        isActive: true 
      })
        .select('name discountCode discountType amount percentage')
        .lean();

      console.log('Discount groups found:', discountGroups.length);

      res.status(200).json({
        success: true,
        message: "Discount groups fetched successfully",
        data: discountGroups
      });

    } catch (error) {
      console.log("Error in getDiscountGroups", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch discount groups. Please try again later"
      });
    }
  },

  // ─── Assign Fee Master to Students ────────────────────────────────────────────
  assignFeeToStudents: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { feeMasterId, studentIds, classId, section } = req.body;

      console.log('Assign Fee Request:', { feeMasterId, studentIds, classId, section });

      // Validate fee master
      const feeMaster = await FeeMaster.findOne({
        _id: feeMasterId,
        school: schoolId
      });

      if (!feeMaster) {
        return res.status(404).json({
          success: false,
          message: "Fee master not found"
        });
      }

      let targetStudents = [];

      // Get students based on criteria
      if (studentIds && studentIds.length > 0) {
        // Specific students
        targetStudents = await StudentAdmission.find({
          _id: { $in: studentIds },
          school: schoolId
        });
      } else if (classId) {
        // All students in class/section
        const filter = { school: schoolId, class: classId };
        if (section) filter.section = section;
        
        targetStudents = await StudentAdmission.find(filter);
      } else {
        return res.status(400).json({
          success: false,
          message: "Please provide student IDs or class/section"
        });
      }

      if (targetStudents.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No students found"
        });
      }

      // Create fee assignments
      const assignments = [];
      for (const student of targetStudents) {
        // Check if already assigned
        const existing = await StudentFeeAssignment.findOne({
          school: schoolId,
          student: student._id,
          feeMaster: feeMasterId
        });

        if (!existing) {
          const assignment = new StudentFeeAssignment({
            school: schoolId,
            student: student._id,
            feeMaster: feeMasterId,
            amount: feeMaster.amount,
            dueDate: feeMaster.dueDate || new Date(),
            status: 'Unpaid',
            balance: feeMaster.amount
          });

          await assignment.save();
          assignments.push(assignment);
        }
      }

      console.log('Fee Assignments Created:', assignments.length);

      res.status(201).json({
        success: true,
        message: `Fee assigned to ${assignments.length} student(s) successfully`,
        data: {
          assigned: assignments.length,
          skipped: targetStudents.length - assignments.length
        }
      });

    } catch (error) {
      console.log("Error in assignFeeToStudents", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to assign fee. Please try again later"
      });
    }
  }
};
