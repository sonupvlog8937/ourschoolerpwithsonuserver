const AdmissionEnquiry = require("../../model/frontOffice/admissionEnquiry.model");
const Class = require("../../model/class.model");
const { Source, Reference } = require("../../model/frontOffice/setup.model");

const statusOptions = AdmissionEnquiry.schema.path("status")?.enumValues || [];
// sourceOptions will be fetched dynamically from Setup collection
const searchableFields = [
  "studentName",
  "guardianName",
  "contactNumber",
  "email",
  "classInterested",
  "source",
  "status",
  "notes",
];

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const priorityOptions = AdmissionEnquiry.schema.path("priority")?.enumValues || [];

const toDateOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

exports.createAdmissionEnquiry = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    
    // Fetch dynamic source and reference options from Setup
    const [sources, references] = await Promise.all([
      Source.find({ school: schoolId }).select("name").lean(),
      Reference.find({ school: schoolId }).select("name").lean(),
    ]);
    const sourceOptions = sources.map(s => s.name);
    const referenceOptions = references.map(r => r.name);
    
    // Use provided value if valid, otherwise use first option or fallback
    const finalSource = req.body.source && sourceOptions.includes(req.body.source)
      ? req.body.source
      : (sourceOptions[0] || "Walk-in");
    
    const finalReferredBy = req.body.referredBy && referenceOptions.includes(req.body.referredBy)
      ? req.body.referredBy
      : (req.body.referredBy || "");

    const payload = {
      ...req.body,
      school: schoolId,
      source: finalSource,
      referredBy: finalReferredBy,
      status: req.body.status || statusOptions[0] || "New",
      followUpDate: toDateOrNull(req.body.followUpDate),
    };

    const enquiry = await AdmissionEnquiry.create(payload);
    return res.status(201).json({ message: "Admission enquiry created.", enquiry });
  } catch (error) {
    console.error("createAdmissionEnquiry error:", error);
    return res.status(500).json({ message: "Unable to create admission enquiry.", error: error.message });
  }
};

exports.fetchAdmissionEnquiries = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const {
      q = "",
      status = "all",
      source = "all",
      classInterested = "all",
      sortBy = "createdAt_desc",
      page = 1,
      limit = 10,
    } = req.query;

    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

    const filter = { school: schoolId };
    if (status !== "all") filter.status = status;
    if (source !== "all") filter.source = source;
    if (classInterested !== "all") filter.classInterested = classInterested;

    const searchValue = q?.trim();
    if (searchValue) {
      const safeRegex = new RegExp(escapeRegex(searchValue), "i");
      filter.$or = searchableFields.map((field) => ({ [field]: safeRegex }));
    }

    const sortMap = {
      createdAt_desc: { createdAt: -1 },
      createdAt_asc: { createdAt: 1 },
      followUpDate_asc: { followUpDate: 1, createdAt: -1 },
      followUpDate_desc: { followUpDate: -1, createdAt: -1 },
      studentName_asc: { studentName: 1 },
      studentName_desc: { studentName: -1 },
      status_asc: { status: 1, createdAt: -1 },
      priority_desc: { priority: -1, createdAt: -1 },
    };
    const selectedSort = sortMap[sortBy] || sortMap.createdAt_desc;

    const sortConfigMap = {
      createdAt_desc: { createdAt: -1 },
      createdAt_asc: { createdAt: 1 },
      studentName_asc: { studentName: 1, createdAt: -1 },
      studentName_desc: { studentName: -1, createdAt: -1 },
      followUpDate_asc: { followUpDate: 1, createdAt: -1 },
      priority_desc: { priority: 1, createdAt: -1 },
    };
    const prioritySortOrder = ["High", "Medium", "Low"];
    const resolvedSort = sortConfigMap[sortBy] || sortConfigMap.createdAt_desc;

    // Fetch dynamic source and reference options from Setup
    const sources = await Source.find({ school: schoolId }).select("name").lean();
    const sourceOptions = sources.map(s => s.name);
    
    const references = await Reference.find({ school: schoolId }).select("name").lean();
    const referenceOptions = references.map(r => r.name);

    const [totalItems, rawItems, classesFromEnquiries, classesFromMaster, ...counts] = await Promise.all([
      AdmissionEnquiry.countDocuments(filter),
      AdmissionEnquiry.find(filter)
        .sort(resolvedSort)
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
      AdmissionEnquiry.distinct("classInterested", { school: schoolId }),
      Class.find({ school: schoolId }).sort({ class_num: 1, class_text: 1 }).select("class_text").lean(),
      ...statusOptions.map((statusItem) => AdmissionEnquiry.countDocuments({ school: schoolId, status: statusItem })),
    ]);

    let items = rawItems;
    if (sortBy === "priority_desc") {
      items = [...rawItems].sort((a, b) => {
        const aIndex = prioritySortOrder.indexOf(a.priority || "Medium");
        const bIndex = prioritySortOrder.indexOf(b.priority || "Medium");
        return aIndex - bIndex;
      });
    }

    const classes = Array.from(
      new Set([
        ...classesFromMaster.map((x) => x.class_text).filter(Boolean),
        ...classesFromEnquiries.filter(Boolean),
      ])
    );

    const stats = statusOptions.map((statusItem, index) => ({ _id: statusItem, count: counts[index] }));

    return res.json({
      items,
      stats,
      sourceOptions, // Dynamic from Setup → Source
      referenceOptions, // Dynamic from Setup → Reference
      statusOptions,
      priorityOptions,
      classes,
      pagination: {
        page: safePage,
        limit: safeLimit,
        totalItems,
        totalPages: Math.max(Math.ceil(totalItems / safeLimit), 1),
      },
    });
  } catch (error) {
    console.error("fetchAdmissionEnquiries error:", error);
    return res.status(500).json({ message: "Unable to fetch admission enquiries." });
  }
};

exports.updateAdmissionEnquiry = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;

    const updated = await AdmissionEnquiry.findOneAndUpdate(
      { _id: id, school: schoolId },
      {
        ...req.body,
        followUpDate: toDateOrNull(req.body.followUpDate),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Enquiry not found." });
    }

    return res.json({ message: "Admission enquiry updated.", enquiry: updated });
  } catch (error) {
    console.error("updateAdmissionEnquiry error:", error);
    return res.status(500).json({ message: "Unable to update admission enquiry." });
  }
};

exports.deleteAdmissionEnquiry = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;

    const deleted = await AdmissionEnquiry.findOneAndDelete({ _id: id, school: schoolId });

    if (!deleted) {
      return res.status(404).json({ message: "Enquiry not found." });
    }

    return res.json({ message: "Admission enquiry deleted." });
  } catch (error) {
    console.error("deleteAdmissionEnquiry error:", error);
    return res.status(500).json({ message: "Unable to delete admission enquiry." });
  }
};
