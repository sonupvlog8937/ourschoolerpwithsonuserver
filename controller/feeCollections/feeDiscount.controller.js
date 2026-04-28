const FeeDiscount = require('../../model/feeCollections/feeDiscount.model');
const asyncHandler = require('express-async-handler');

// @desc    Create new fee discount
// @route   POST /api/fee-discounts
// @access  Private (School Admin)
const createFeeDiscount = asyncHandler(async (req, res) => {
  const {
    name,
    discountCode,
    discountType,
    percentage,
    amount,
    description,
    applicableOn,
    applicableFeeTypes,
    validFrom,
    validTo
  } = req.body;

  // Check if discount code already exists for this school
  const existingDiscount = await FeeDiscount.findOne({
    discountCode: discountCode.toUpperCase(),
    school: req.user.schoolId
  });

  if (existingDiscount) {
    res.status(400);
    throw new Error('Discount code already exists');
  }

  // Validate discount type specific fields
  if (discountType === 'percentage' && (!percentage || percentage <= 0 || percentage > 100)) {
    res.status(400);
    throw new Error('Valid percentage (1-100) is required for percentage discount');
  }

  if (discountType === 'fixAmount' && (!amount || amount <= 0)) {
    res.status(400);
    throw new Error('Valid amount is required for fix amount discount');
  }

  // Validate applicable fee types if specific
  if (applicableOn === 'specific' && (!applicableFeeTypes || applicableFeeTypes.length === 0)) {
    res.status(400);
    throw new Error('At least one fee type must be selected for specific discount');
  }

  const feeDiscount = await FeeDiscount.create({
    name,
    discountCode: discountCode.toUpperCase(),
    discountType,
    percentage: discountType === 'percentage' ? percentage : undefined,
    amount: discountType === 'fixAmount' ? amount : undefined,
    description,
    applicableOn,
    applicableFeeTypes: applicableOn === 'specific' ? applicableFeeTypes : [],
    validFrom,
    validTo,
    school: req.user.schoolId,
    createdBy: req.user._id
  });

  const populatedDiscount = await FeeDiscount.findById(feeDiscount._id)
    .populate('applicableFeeTypes', 'name code')
    .populate('createdBy', 'name email');

  res.status(201).json({
    success: true,
    message: 'Fee discount created successfully',
    data: populatedDiscount
  });
});

// @desc    Get all fee discounts with pagination, search, and filters
// @route   GET /api/fee-discounts
// @access  Private (School Admin)
const getFeeDiscounts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    discountType,
    isActive,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build query
  const query = { school: req.user.schoolId };

  // Search filter
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { discountCode: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Discount type filter
  if (discountType && ['percentage', 'fixAmount'].includes(discountType)) {
    query.discountType = discountType;
  }

  // Active status filter
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query with pagination
  const [discounts, total] = await Promise.all([
    FeeDiscount.find(query)
      .populate('applicableFeeTypes', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    FeeDiscount.countDocuments(query)
  ]);

  // Add computed fields
  const now = new Date();
  const enrichedDiscounts = discounts.map(discount => ({
    ...discount,
    isCurrentlyValid: (() => {
      if (discount.validFrom && discount.validTo) {
        return now >= new Date(discount.validFrom) && now <= new Date(discount.validTo);
      }
      if (discount.validFrom) {
        return now >= new Date(discount.validFrom);
      }
      if (discount.validTo) {
        return now <= new Date(discount.validTo);
      }
      return true;
    })()
  }));

  res.status(200).json({
    success: true,
    data: enrichedDiscounts,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalRecords: total,
      limit: limitNum,
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }
  });
});

// @desc    Get single fee discount by ID
// @route   GET /api/fee-discounts/:id
// @access  Private (School Admin)
const getFeeDiscountById = asyncHandler(async (req, res) => {
  const discount = await FeeDiscount.findOne({
    _id: req.params.id,
    school: req.user.school
  })
    .populate('applicableFeeTypes', 'name code')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  if (!discount) {
    res.status(404);
    throw new Error('Fee discount not found');
  }

  res.status(200).json({
    success: true,
    data: discount
  });
});

// @desc    Update fee discount
// @route   PUT /api/fee-discounts/:id
// @access  Private (School Admin)
const updateFeeDiscount = asyncHandler(async (req, res) => {
  const {
    name,
    discountCode,
    discountType,
    percentage,
    amount,
    description,
    applicableOn,
    applicableFeeTypes,
    validFrom,
    validTo,
    isActive
  } = req.body;

  const discount = await FeeDiscount.findOne({
    _id: req.params.id,
    school: req.user.schoolId
  });

  if (!discount) {
    res.status(404);
    throw new Error('Fee discount not found');
  }

  // Check if discount code is being changed and if it already exists
  if (discountCode && discountCode.toUpperCase() !== discount.discountCode) {
    const existingDiscount = await FeeDiscount.findOne({
      discountCode: discountCode.toUpperCase(),
      school: req.user.schoolId,
      _id: { $ne: req.params.id }
    });

    if (existingDiscount) {
      res.status(400);
      throw new Error('Discount code already exists');
    }
  }

  // Validate discount type specific fields
  if (discountType === 'percentage' && (!percentage || percentage <= 0 || percentage > 100)) {
    res.status(400);
    throw new Error('Valid percentage (1-100) is required for percentage discount');
  }

  if (discountType === 'fixAmount' && (!amount || amount <= 0)) {
    res.status(400);
    throw new Error('Valid amount is required for fix amount discount');
  }

  // Update fields
  discount.name = name || discount.name;
  discount.discountCode = discountCode ? discountCode.toUpperCase() : discount.discountCode;
  discount.discountType = discountType || discount.discountType;
  discount.percentage = discountType === 'percentage' ? percentage : undefined;
  discount.amount = discountType === 'fixAmount' ? amount : undefined;
  discount.description = description !== undefined ? description : discount.description;
  discount.applicableOn = applicableOn || discount.applicableOn;
  discount.applicableFeeTypes = applicableOn === 'specific' ? applicableFeeTypes : [];
  discount.validFrom = validFrom !== undefined ? validFrom : discount.validFrom;
  discount.validTo = validTo !== undefined ? validTo : discount.validTo;
  discount.isActive = isActive !== undefined ? isActive : discount.isActive;
  discount.updatedBy = req.user._id;

  await discount.save();

  const updatedDiscount = await FeeDiscount.findById(discount._id)
    .populate('applicableFeeTypes', 'name code')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  res.status(200).json({
    success: true,
    message: 'Fee discount updated successfully',
    data: updatedDiscount
  });
});

// @desc    Delete fee discount
// @route   DELETE /api/fee-discounts/:id
// @access  Private (School Admin)
const deleteFeeDiscount = asyncHandler(async (req, res) => {
  const discount = await FeeDiscount.findOne({
    _id: req.params.id,
    school: req.user.schoolId
  });

  if (!discount) {
    res.status(404);
    throw new Error('Fee discount not found');
  }

  // Soft delete - just mark as inactive
  discount.isActive = false;
  discount.updatedBy = req.user._id;
  await discount.save();

  res.status(200).json({
    success: true,
    message: 'Fee discount deleted successfully'
  });
});

// @desc    Get active discounts for dropdown
// @route   GET /api/fee-discounts/active/list
// @access  Private (School Admin)
const getActiveDiscounts = asyncHandler(async (req, res) => {
  const now = new Date();
  
  const discounts = await FeeDiscount.find({
    school: req.user.schoolId,
    isActive: true,
    $or: [
      { validFrom: { $lte: now }, validTo: { $gte: now } },
      { validFrom: { $lte: now }, validTo: null },
      { validFrom: null, validTo: { $gte: now } },
      { validFrom: null, validTo: null }
    ]
  })
    .select('name discountCode discountType percentage amount')
    .sort('name')
    .lean();

  res.status(200).json({
    success: true,
    data: discounts
  });
});

// @desc    Apply discount to fee amount
// @route   POST /api/fee-discounts/calculate
// @access  Private (School Admin)
const calculateDiscount = asyncHandler(async (req, res) => {
  const { discountId, feeAmount, feeTypeId } = req.body;

  if (!discountId || !feeAmount) {
    res.status(400);
    throw new Error('Discount ID and fee amount are required');
  }

  const discount = await FeeDiscount.findOne({
    _id: discountId,
    school: req.user.schoolId,
    isActive: true
  }).populate('applicableFeeTypes');

  if (!discount) {
    res.status(404);
    throw new Error('Active discount not found');
  }

  // Check if discount is applicable to this fee type
  if (discount.applicableOn === 'specific' && feeTypeId) {
    const isApplicable = discount.applicableFeeTypes.some(
      ft => ft._id.toString() === feeTypeId.toString()
    );
    
    if (!isApplicable) {
      res.status(400);
      throw new Error('This discount is not applicable to the selected fee type');
    }
  }

  const discountAmount = discount.calculateDiscount(feeAmount);
  const finalAmount = feeAmount - discountAmount;

  res.status(200).json({
    success: true,
    data: {
      originalAmount: feeAmount,
      discountAmount: discountAmount,
      finalAmount: finalAmount,
      discountDetails: {
        name: discount.name,
        code: discount.discountCode,
        type: discount.discountType,
        value: discount.discountType === 'percentage' ? discount.percentage : discount.amount
      }
    }
  });
});

module.exports = {
  createFeeDiscount,
  getFeeDiscounts,
  getFeeDiscountById,
  updateFeeDiscount,
  deleteFeeDiscount,
  getActiveDiscounts,
  calculateDiscount
};
