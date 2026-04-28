const mongoose = require("mongoose");

const libraryBookSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.ObjectId, ref: "School", required: true },
  book_title: { type: String, required: true },
  book_number: { type: String, required: true, unique: true },
  isbn: { type: String, default: "" },
  author: { type: String, required: true },
  publisher: { type: String, default: "" },
  category: { type: String, default: "General" },
  quantity: { type: Number, default: 1 },
  available_quantity: { type: Number, default: 1 },
  rack_number: { type: String, default: "" },
  price: { type: Number, default: 0 },
  description: { type: String, default: "" },
  book_cover: { type: String, default: "" },
  status: { type: String, enum: ["Available", "Unavailable"], default: "Available" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("LibraryBook", libraryBookSchema);
