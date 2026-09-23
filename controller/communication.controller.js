const Communication = require("../model/communication.model");

const resources = new Set([
  "group-message", "particular-student", "particular-staff", "particular-number-sms",
  "particular-email", "holidays", "events", "academic-calendar", "birthday", "gallery",
  "hobby-group-members", "circular", "popups", "home-content", "sms-student-username",
  "sms-staff-username", "homework",
]);

const isValidResource = (resource) => resources.has(resource);

const getSchoolId = (req) => req.user?.schoolId || req.user?.school;

module.exports = {
  list: async (req, res) => {
    try {
      const { resource } = req.params;
      const school = getSchoolId(req);
      if (!isValidResource(resource)) return res.status(400).json({ success: false, message: "Invalid communication resource" });
      const records = await Communication.find({ school, resource }).sort({ createdAt: -1 });
      res.json({ success: true, data: records });
    } catch (error) {
      res.status(500).json({ success: false, message: "Unable to load communication records", error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const { resource } = req.params;
      const school = getSchoolId(req);
      if (!isValidResource(resource)) return res.status(400).json({ success: false, message: "Invalid communication resource" });
      if (!req.body || typeof req.body !== "object") return res.status(400).json({ success: false, message: "Record data is required" });
      const record = await Communication.create({ school, resource, data: req.body, createdBy: req.user.id });
      res.status(201).json({ success: true, data: record, message: "Communication record created" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Unable to create communication record", error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const record = await Communication.findOneAndUpdate(
        { _id: req.params.id, school: getSchoolId(req), resource: req.params.resource },
        { data: req.body },
        { new: true, runValidators: true }
      );
      if (!record) return res.status(404).json({ success: false, message: "Communication record not found" });
      res.json({ success: true, data: record, message: "Communication record updated" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Unable to update communication record", error: error.message });
    }
  },

  remove: async (req, res) => {
    try {
      const record = await Communication.findOneAndDelete({ _id: req.params.id, school: getSchoolId(req), resource: req.params.resource });
      if (!record) return res.status(404).json({ success: false, message: "Communication record not found" });
      res.json({ success: true, data: record._id, message: "Communication record removed" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Unable to remove communication record", error: error.message });
    }
  },

  sendMessage: async (req, res) => {
    try {
      const { channel, recipients, subject = "", message } = req.body;
      if (!["sms", "email"].includes(channel) || !message || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ success: false, message: "Channel, recipients, and message are required" });
      }
      const record = await Communication.create({
        school: getSchoolId(req),
        resource: channel === "email" ? "particular-email" : "particular-number-sms",
        data: { channel, recipients, subject, message, sentAt: new Date() },
        createdBy: req.user.id,
      });
      res.status(201).json({ success: true, data: record, message: `${channel.toUpperCase()} queued successfully` });
    } catch (error) {
      res.status(500).json({ success: false, message: "Unable to send message", error: error.message });
    }
  },
};