const mongoose = require('mongoose');
const StudentAdmission = require('../../model/studentInformation/studentAdmission.model');
const ClassModel = require('../../model/class.model');
const Student = require('../../model/role/student.model');
const Parent = require('../../model/role/parent.model');
const bcrypt = require('bcrypt');

// Helper function to generate random password
const generatePassword = (length = 6) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const toObjectId = (id) => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null);

const buildFilter = (query, schoolId) => {
  const filter = { school: schoolId };

  if (query.search) {
    const rx = new RegExp(query.search.trim(), 'i');
    filter.$or = [
      { firstName: rx },
      { lastName: rx },
      { admissionNo: rx },
      { rollNumber: rx },
      { mobileNumber: rx },
    ];
  }

  if (query.class) {
    const classId = toObjectId(query.class);
    if (classId) filter.class = classId;
  }

  if (query.section) filter.section = query.section;
  if (query.gender) filter.gender = query.gender;
  if (query.category) filter.category = query.category;

  if (query.admissionYear) {
    const year = Number(query.admissionYear);
    if (!Number.isNaN(year)) {
      const start = new Date(year, 0, 1);
      const end = new Date(year + 1, 0, 1);
      filter.admissionDate = { $gte: start, $lt: end };
    }
  }

  return filter;
};

module.exports = {
  async getStudents(req, res) {
    try {
      const schoolId = req.user.schoolId || req.user.id;
      const page = Math.max(parseInt(req.query.page || '1', 10), 1);
      const limit = Math.max(parseInt(req.query.limit || '10', 10), 1);
      const skip = (page - 1) * limit;

      const filter = buildFilter(req.query, schoolId);

      const [data, total] = await Promise.all([
        StudentAdmission.find(filter)
          .populate('class', 'class_text class_num')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        StudentAdmission.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        data,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1,
        },
      });
    } catch (error) {
      console.error('getStudents error', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch student admissions.' });
    }
  },

  async getStudentById(req, res) {
    try {
      const schoolId = req.user.schoolId || req.user.id;
      const student = await StudentAdmission.findOne({ _id: req.params.id, school: schoolId })
        .populate('class', 'class_text class_num')
        .populate('studentUser', 'email name')
        .populate('parentUser', 'email name')
        .lean();
      
      if (!student) return res.status(404).json({ success: false, message: 'Student admission not found.' });
      
      // Generate usernames from admission number if user accounts exist
      let loginDetails = null;
      if (student.studentUser || student.parentUser || student.studentPassword) {
        loginDetails = {
          studentUsername: `std${student.admissionNo}`,
          parentUsername: `parent${student.admissionNo}`,
          studentEmail: student.studentUser?.email || `std${student.admissionNo}@school.com`,
          parentEmail: student.parentUser?.email || `parent${student.admissionNo}@school.com`,
          studentPassword: student.studentPassword || null,
          parentPassword: student.parentPassword || null,
        };
      }
      
      return res.status(200).json({ success: true, data: { ...student, loginDetails } });
    } catch (error) {
      console.error('getStudentById error', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch student admission.' });
    }
  },

  async createStudent(req, res) {
    try {
      const schoolId = req.user.schoolId || req.user.id;
      
      // Clean up the payload - remove empty strings and handle new fields
      const {
        photo,
        aadharNumber,
        alternateMobileNumber,
        transportEnabled,
        route,
        pickupPoint,
        transportFeesMonth,
        hostelEnabled,
        hostel,
        roomNumber,
        feesDetails,
        ...restData
      } = req.body;

      const payload = {
        ...restData,
        school: schoolId,
        photo: photo || '',
        aadharNumber: aadharNumber || '',
        alternateMobileNumber: alternateMobileNumber || '',
        transportEnabled: transportEnabled || false,
        route: (transportEnabled && route) ? route : null,
        pickupPoint: (transportEnabled && pickupPoint) ? pickupPoint : '',
        transportFeesMonth: (transportEnabled && transportFeesMonth) ? transportFeesMonth : '',
        hostelEnabled: hostelEnabled || false,
        hostel: (hostelEnabled && hostel) ? hostel : null,
        roomNumber: (hostelEnabled && roomNumber) ? roomNumber : '',
        feesDetails: feesDetails || [],
      };

      console.log('Creating student with payload:', payload);

      // Create student admission
      const student = await StudentAdmission.create(payload);
      
      // Generate login credentials
      const studentUsername = `std${student.admissionNo}`;
      const parentUsername = `parent${student.admissionNo}`;
      const studentPassword = generatePassword(5);
      const parentPassword = generatePassword(6);
      
      // Hash passwords
      const hashedStudentPassword = await bcrypt.hash(studentPassword, 10);
      const hashedParentPassword = await bcrypt.hash(parentPassword, 10);
      
      // Create Student User Account
      const studentUser = await Student.create({
        school: schoolId,
        email: `${studentUsername}@school.com`,
        name: `${student.firstName} ${student.lastName}`,
        password: hashedStudentPassword,
        roll_number: student.rollNumber || '',
        address: student.address || '',
        aadhar_number: student.aadharNumber || '',
        student_class: student.class,
        age: student.dateOfBirth ? String(new Date().getFullYear() - new Date(student.dateOfBirth).getFullYear()) : '',
        gender: student.gender || '',
        guardian: student.fatherName || student.guardianName || '',
        guardian_phone: student.mobileNumber || '',
        student_image: student.photo || '',
      });
      
      // Create Parent User Account
      const parentUser = await Parent.create({
        school: schoolId,
        name: student.fatherName || student.guardianName || 'Parent',
        email: `${parentUsername}@school.com`,
        password: hashedParentPassword,
        phone: student.mobileNumber || '',
        address: student.address || '',
        children: [studentUser._id],
        relation: student.fatherName ? 'Father' : 'Guardian',
      });
      
      // Update student admission with user references and passwords using findOneAndUpdate
      await StudentAdmission.findByIdAndUpdate(student._id, {
        studentUser: studentUser._id,
        parentUser: parentUser._id,
        studentPassword: studentPassword,
        parentPassword: parentPassword,
      });
      
      const populated = await StudentAdmission.findById(student._id).populate('class', 'class_text class_num');
      
      return res.status(201).json({ 
        success: true, 
        message: 'Student admission created successfully.', 
        data: populated,
        loginCredentials: {
          studentUsername,
          studentPassword,
          parentUsername,
          parentPassword,
        }
      });
    } catch (error) {
      console.error('createStudent error:', error);
      const message = error.code === 11000 
        ? 'Admission number already exists.' 
        : error.message || 'Failed to create student admission.';
      return res.status(400).json({ success: false, message });
    }
  },

  async updateStudent(req, res) {
    try {
      const schoolId = req.user.schoolId || req.user.id;
      
      // Clean up the payload
      const {
        photo,
        aadharNumber,
        alternateMobileNumber,
        transportEnabled,
        route,
        pickupPoint,
        transportFeesMonth,
        hostelEnabled,
        hostel,
        roomNumber,
        feesDetails,
        ...restData
      } = req.body;

      const updateData = {
        ...restData,
        photo: photo || '',
        aadharNumber: aadharNumber || '',
        alternateMobileNumber: alternateMobileNumber || '',
        transportEnabled: transportEnabled || false,
        route: (transportEnabled && route) ? route : null,
        pickupPoint: (transportEnabled && pickupPoint) ? pickupPoint : '',
        transportFeesMonth: (transportEnabled && transportFeesMonth) ? transportFeesMonth : '',
        hostelEnabled: hostelEnabled || false,
        hostel: (hostelEnabled && hostel) ? hostel : null,
        roomNumber: (hostelEnabled && roomNumber) ? roomNumber : '',
        feesDetails: feesDetails || [],
      };

      // Sync isDisabled with status field
      if (restData.status === 'Inactive') {
        updateData.isDisabled = true;
        if (!updateData.disabledAt) updateData.disabledAt = new Date();
      } else if (restData.status === 'Active') {
        updateData.isDisabled = false;
        updateData.disabledAt = null;
        updateData.disableReason = '';
      }

      const student = await StudentAdmission.findOneAndUpdate(
        { _id: req.params.id, school: schoolId },
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate('class', 'class_text class_num');

      if (!student) return res.status(404).json({ success: false, message: 'Student admission not found.' });
      return res.status(200).json({ success: true, message: 'Student admission updated successfully.', data: student });
    } catch (error) {
      console.error('updateStudent error', error);
      return res.status(400).json({ success: false, message: error.message || 'Failed to update student admission.' });
    }
  },

  async deleteStudent(req, res) {
    try {
      const schoolId = req.user.schoolId || req.user.id;
      const deleted = await StudentAdmission.findOneAndDelete({ _id: req.params.id, school: schoolId });
      if (!deleted) return res.status(404).json({ success: false, message: 'Student admission not found.' });
      return res.status(200).json({ success: true, message: 'Student admission deleted successfully.' });
    } catch (error) {
      console.error('deleteStudent error', error);
      return res.status(500).json({ success: false, message: 'Failed to delete student admission.' });
    }
  },

  async getStudentStats(req, res) {
    try {
      const schoolId = req.user.schoolId || req.user.id;
      const [totalStudents, maleStudents, femaleStudents, newAdmissions] = await Promise.all([
        StudentAdmission.countDocuments({ school: schoolId }),
        StudentAdmission.countDocuments({ school: schoolId, gender: 'Male' }),
        StudentAdmission.countDocuments({ school: schoolId, gender: 'Female' }),
        StudentAdmission.countDocuments({ school: schoolId, createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }),
      ]);
      return res.status(200).json({ success: true, data: { totalStudents, maleStudents, femaleStudents, newAdmissions } });
    } catch (error) {
      console.error('getStudentStats error', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
    }
  },

  async getDropdownOptions(req, res) {
    try {
      const schoolId = req.user.schoolId || req.user.id;
      const [classes, sections, categories, religions, castes, houses] = await Promise.all([
        ClassModel.find({ school: schoolId }).sort({ class_num: 1 }).select('_id class_text class_num').lean(),
        StudentAdmission.distinct('section', { school: schoolId, section: { $ne: '' } }),
        StudentAdmission.distinct('category', { school: schoolId, category: { $ne: '' } }),
        StudentAdmission.distinct('religion', { school: schoolId, religion: { $ne: '' } }),
        StudentAdmission.distinct('caste', { school: schoolId, caste: { $ne: '' } }),
        StudentAdmission.distinct('house', { school: schoolId, house: { $ne: '' } }),
      ]);

      const routes = [];
      const hostels = [];
      const rooms = [];
      const feesStructure = [];

      return res.status(200).json({
        success: true,
        data: {
          classes: classes.map((cls) => ({ _id: cls._id, name: `${cls.class_text}` })),
          sections: sections.map((section) => ({ _id: section, name: section })),
          categories,
          religions,
          castes,
          houses,
          bloodGroups: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
          routes,
          hostels,
          rooms,
          feesStructure,
        },
      });
    } catch (error) {
      console.error('getDropdownOptions error', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch dropdown options.' });
    }
  },

  async generateLogin(req, res) {
    try {
      const schoolId = req.user.schoolId || req.user.id;
      const admission = await StudentAdmission.findOne({ _id: req.params.id, school: schoolId });
      if (!admission) return res.status(404).json({ success: false, message: 'Student not found.' });

      const studentUsername = `std${admission.admissionNo}`;
      const parentUsername = `parent${admission.admissionNo}`;
      const studentPassword = generatePassword(5);
      const parentPassword = generatePassword(6);

      const hashedStudentPassword = await bcrypt.hash(studentPassword, 10);
      const hashedParentPassword = await bcrypt.hash(parentPassword, 10);

      // Check if student user already exists - update or create
      let studentUser = await Student.findOne({
        $or: [
          { email: `${studentUsername}@school.com` },
          { _id: admission.studentUser },
        ]
      });

      if (studentUser) {
        await Student.findByIdAndUpdate(studentUser._id, { password: hashedStudentPassword, email: `${studentUsername}@school.com` });
      } else {
        studentUser = await Student.create({
          school: schoolId,
          email: `${studentUsername}@school.com`,
          name: `${admission.firstName} ${admission.lastName}`,
          password: hashedStudentPassword,
          roll_number: admission.rollNumber || '',
          address: admission.address || '',
          student_class: admission.class,
          gender: admission.gender || '',
          guardian: admission.fatherName || admission.guardianName || '',
          guardian_phone: admission.mobileNumber || '',
          student_image: admission.photo || '',
        });
      }

      // Check if parent user already exists - update or create
      let parentUser = await Parent.findOne({
        $or: [
          { email: `${parentUsername}@school.com` },
          { _id: admission.parentUser },
        ]
      });

      if (parentUser) {
        await Parent.findByIdAndUpdate(parentUser._id, { password: hashedParentPassword, email: `${parentUsername}@school.com` });
      } else {
        parentUser = await Parent.create({
          school: schoolId,
          name: admission.fatherName || admission.guardianName || 'Parent',
          email: `${parentUsername}@school.com`,
          password: hashedParentPassword,
          phone: admission.mobileNumber || '',
          address: admission.address || '',
          children: [studentUser._id],
          relation: admission.fatherName ? 'Father' : 'Guardian',
        });
      }

      // Save references and passwords in admission
      await StudentAdmission.findByIdAndUpdate(admission._id, {
        studentUser: studentUser._id,
        parentUser: parentUser._id,
        studentPassword,
        parentPassword,
      });

      return res.status(200).json({
        success: true,
        message: 'Login credentials generated successfully.',
        loginCredentials: { studentUsername, studentPassword, parentUsername, parentPassword },
      });
    } catch (error) {
      console.error('generateLogin error', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to generate login.' });
    }
  },

  async changePassword(req, res) {
    try {
      const schoolId = req.user.schoolId || req.user.id;
      const { userType, newPassword } = req.body; // userType: 'student' or 'parent'

      if (!userType || !newPassword) {
        return res.status(400).json({ success: false, message: 'userType and newPassword are required.' });
      }
      if (newPassword.length < 4) {
        return res.status(400).json({ success: false, message: 'Password must be at least 4 characters.' });
      }

      const admission = await StudentAdmission.findOne({ _id: req.params.id, school: schoolId });
      if (!admission) return res.status(404).json({ success: false, message: 'Student not found.' });

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      if (userType === 'student') {
        // Update Student user account
        if (admission.studentUser) {
          await Student.findByIdAndUpdate(admission.studentUser, { password: hashedPassword });
        }
        // Save plain password in admission record
        admission.studentPassword = newPassword;
      } else if (userType === 'parent') {
        // Update Parent user account
        if (admission.parentUser) {
          await Parent.findByIdAndUpdate(admission.parentUser, { password: hashedPassword });
        }
        // Save plain password in admission record
        admission.parentPassword = newPassword;
      } else {
        return res.status(400).json({ success: false, message: 'Invalid userType. Use "student" or "parent".' });
      }

      await admission.save();

      return res.status(200).json({
        success: true,
        message: `${userType === 'student' ? 'Student' : 'Parent'} password changed successfully.`,
      });
    } catch (error) {
      console.error('changePassword error', error);
      return res.status(500).json({ success: false, message: 'Failed to change password.' });
    }
  },

  // ─── BULK DELETE ──────────────────────────────────────────────────────────────

  async bulkDeleteStudents(req, res) {
    try {
      const schoolId = req.user.schoolId || req.user.id;
      const { studentIds } = req.body;

      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Student IDs are required.' });
      }

      // Delete student admissions
      const result = await StudentAdmission.deleteMany({
        _id: { $in: studentIds },
        school: schoolId,
      });

      // Also delete associated student and parent accounts
      await Student.deleteMany({ studentAdmission: { $in: studentIds } });
      await Parent.deleteMany({ children: { $in: studentIds } });

      return res.status(200).json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} student(s).`,
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      console.error('bulkDeleteStudents error', error);
      return res.status(500).json({ success: false, message: 'Failed to delete students.' });
    }
  },

  // ─── MULTI CLASS STUDENT ──────────────────────────────────────────────────────

  async updateAdditionalClasses(req, res) {
    try {
      const schoolId = req.user.schoolId || req.user.id;
      const { id } = req.params;
      const { additionalClasses } = req.body;

      if (!Array.isArray(additionalClasses)) {
        return res.status(400).json({ success: false, message: 'Additional classes must be an array.' });
      }

      const student = await StudentAdmission.findOneAndUpdate(
        { _id: id, school: schoolId },
        { additionalClasses },
        { new: true }
      ).populate('class additionalClasses');

      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Additional classes updated successfully.',
        data: student,
      });
    } catch (error) {
      console.error('updateAdditionalClasses error', error);
      return res.status(500).json({ success: false, message: 'Failed to update additional classes.' });
    }
  },

  // ─── DISABLE / ENABLE STUDENT ────────────────────────────────────────────────

  async getDisabledStudents(req, res) {
    try {
      const schoolId = req.user.schoolId || req.user.id;
      const page = Math.max(parseInt(req.query.page || '1', 10), 1);
      const limit = Math.max(parseInt(req.query.limit || '10', 10), 1);
      const skip = (page - 1) * limit;

      const filter = { school: schoolId, isDisabled: true };

      if (req.query.search) {
        const rx = new RegExp(req.query.search.trim(), 'i');
        filter.$or = [
          { firstName: rx },
          { lastName: rx },
          { admissionNo: rx },
          { mobileNumber: rx },
        ];
      }

      if (req.query.class) {
        const classId = toObjectId(req.query.class);
        if (classId) filter.class = classId;
      }

      const [data, total] = await Promise.all([
        StudentAdmission.find(filter)
          .populate('class', 'class_text class_num')
          .sort({ disabledAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        StudentAdmission.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        data,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1,
        },
      });
    } catch (error) {
      console.error('getDisabledStudents error', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch disabled students.' });
    }
  },

  async disableStudent(req, res) {
    try {
      const schoolId = req.user.schoolId || req.user.id;
      const { reason } = req.body;

      const student = await StudentAdmission.findOneAndUpdate(
        { _id: req.params.id, school: schoolId, isDisabled: { $ne: true } },
        {
          isDisabled: true,
          disableReason: reason?.trim() || '',
          disabledAt: new Date(),
          status: 'Inactive',
        },
        { new: true }
      ).populate('class', 'class_text class_num');

      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found or already disabled.' });
      }

      return res.status(200).json({ success: true, message: 'Student disabled successfully.', data: student });
    } catch (error) {
      console.error('disableStudent error', error);
      return res.status(500).json({ success: false, message: 'Failed to disable student.' });
    }
  },

  async enableStudent(req, res) {
    try {
      const schoolId = req.user.schoolId || req.user.id;

      const student = await StudentAdmission.findOneAndUpdate(
        { _id: req.params.id, school: schoolId, isDisabled: true },
        {
          isDisabled: false,
          disableReason: '',
          disabledAt: null,
          status: 'Active',
        },
        { new: true }
      ).populate('class', 'class_text class_num');

      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found or already active.' });
      }

      return res.status(200).json({ success: true, message: 'Student enabled successfully.', data: student });
    } catch (error) {
      console.error('enableStudent error', error);
      return res.status(500).json({ success: false, message: 'Failed to enable student.' });
    }
  },

  // ─── ONLINE ADMISSION ─────────────────────────────────────────────────────────

  async getOnlineAdmissions(req, res) {
    try {
      const OnlineAdmission = require('../../model/studentInformation/onlineAdmission.model');
      const schoolId = req.user.schoolId || req.user.id;
      const { status = 'Pending', page = 1, limit = 10, search = '' } = req.query;

      const pageNum = Math.max(parseInt(page, 10), 1);
      const limitNum = Math.max(parseInt(limit, 10), 1);
      const skip = (pageNum - 1) * limitNum;

      // Build filter
      const filter = { school: schoolId, status };
      
      if (search) {
        const searchRegex = new RegExp(search.trim(), 'i');
        filter.$or = [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
          { applicationNo: searchRegex },
          { mobileNumber: searchRegex },
        ];
      }

      const [applications, total] = await Promise.all([
        OnlineAdmission.find(filter)
          .populate('classApplied')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        OnlineAdmission.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        applications,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('getOnlineAdmissions error', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch applications.' });
    }
  },

  async getOnlineAdmissionById(req, res) {
    try {
      const OnlineAdmission = require('../../model/studentInformation/onlineAdmission.model');
      const schoolId = req.user.schoolId || req.user.id;
      const { id } = req.params;

      const application = await OnlineAdmission.findOne({ _id: id, school: schoolId })
        .populate('classApplied')
        .lean();

      if (!application) {
        return res.status(404).json({ success: false, message: 'Application not found.' });
      }

      return res.status(200).json({
        success: true,
        data: application,
      });
    } catch (error) {
      console.error('getOnlineAdmissionById error', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch application details.' });
    }
  },

  async approveOnlineAdmission(req, res) {
    try {
      const OnlineAdmission = require('../../model/studentInformation/onlineAdmission.model');
      const schoolId = req.user.schoolId || req.user.id;
      const { id } = req.params;

      const application = await OnlineAdmission.findOneAndUpdate(
        { _id: id, school: schoolId, status: 'Pending' },
        { status: 'Approved', approvedAt: new Date() },
        { new: true }
      );

      if (!application) {
        return res.status(404).json({ success: false, message: 'Application not found or already processed.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Application approved successfully.',
        data: application,
      });
    } catch (error) {
      console.error('approveOnlineAdmission error', error);
      return res.status(500).json({ success: false, message: 'Failed to approve application.' });
    }
  },

  async rejectOnlineAdmission(req, res) {
    try {
      const OnlineAdmission = require('../../model/studentInformation/onlineAdmission.model');
      const schoolId = req.user.schoolId || req.user.id;
      const { id } = req.params;
      const { rejectionReason } = req.body;

      const application = await OnlineAdmission.findOneAndUpdate(
        { _id: id, school: schoolId, status: 'Pending' },
        { status: 'Rejected', rejectionReason, rejectedAt: new Date() },
        { new: true }
      );

      if (!application) {
        return res.status(404).json({ success: false, message: 'Application not found or already processed.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Application rejected.',
        data: application,
      });
    } catch (error) {
      console.error('rejectOnlineAdmission error', error);
      return res.status(500).json({ success: false, message: 'Failed to reject application.' });
    }
  },
};
