const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.ObjectId, required: true },
  authorName: { type: String, default: "Campus member" },
  text: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const campusFeedSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: "School", required: true, index: true },
  authorId: { type: mongoose.Schema.ObjectId, required: true },
  authorName: { type: String, default: "Campus member" },
  authorRole: { type: String, default: "Student" },
  content: { type: String, required: true, trim: true, maxlength: 2000 },
  tags: [{ type: String, trim: true, lowercase: true }],
  likes: [{ type: mongoose.Schema.ObjectId }],
  comments: [commentSchema],
  visibility: { type: String, enum: ["school", "staff", "class"], default: "school" },
  createdAt: { type: Date, default: Date.now },
});

campusFeedSchema.index({ school: 1, createdAt: -1 });

module.exports = mongoose.model("CampusFeed", campusFeedSchema);