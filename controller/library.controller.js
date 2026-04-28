const LibraryBook = require("../model/library.model");
const BookIssue = require("../model/bookIssue.model");
const mongoose = require("mongoose");

module.exports = {
  // Add book
  addBook: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const bookData = { ...req.body, school: schoolId };

      const book = new LibraryBook(bookData);
      await book.save();

      res.status(201).json({ success: true, message: "Book added successfully", data: book });
    } catch (error) {
      console.error("Error adding book:", error);
      res.status(500).json({ success: false, message: "Error adding book", error: error.message });
    }
  },

  // Get all books
  getAllBooks: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { category, status, search } = req.query;

      const filter = { school: schoolId };
      if (category) filter.category = category;
      if (status) filter.status = status;
      if (search) {
        filter.$or = [
          { book_title: { $regex: search, $options: "i" } },
          { author: { $regex: search, $options: "i" } },
          { isbn: { $regex: search, $options: "i" } },
        ];
      }

      const books = await LibraryBook.find(filter).sort({ createdAt: -1 });

      res.status(200).json({ success: true, data: books });
    } catch (error) {
      console.error("Error fetching books:", error);
      res.status(500).json({ success: false, message: "Error fetching books", error: error.message });
    }
  },

  // Get book by ID
  getBookById: async (req, res) => {
    try {
      const { id } = req.params;
      const book = await LibraryBook.findById(id);

      if (!book) {
        return res.status(404).json({ success: false, message: "Book not found" });
      }

      res.status(200).json({ success: true, data: book });
    } catch (error) {
      console.error("Error fetching book:", error);
      res.status(500).json({ success: false, message: "Error fetching book", error: error.message });
    }
  },

  // Update book
  updateBook: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const book = await LibraryBook.findByIdAndUpdate(id, updates, { new: true });

      if (!book) {
        return res.status(404).json({ success: false, message: "Book not found" });
      }

      res.status(200).json({ success: true, message: "Book updated successfully", data: book });
    } catch (error) {
      console.error("Error updating book:", error);
      res.status(500).json({ success: false, message: "Error updating book", error: error.message });
    }
  },

  // Delete book
  deleteBook: async (req, res) => {
    try {
      const { id } = req.params;
      const book = await LibraryBook.findByIdAndDelete(id);

      if (!book) {
        return res.status(404).json({ success: false, message: "Book not found" });
      }

      res.status(200).json({ success: true, message: "Book deleted successfully" });
    } catch (error) {
      console.error("Error deleting book:", error);
      res.status(500).json({ success: false, message: "Error deleting book", error: error.message });
    }
  },

  // Issue book
  issueBook: async (req, res) => {
    try {
      const { bookId, member_type, memberId, due_date } = req.body;
      const schoolId = req.user.schoolId;
      const issuedBy = req.user.id;

      // Check if book is available
      const book = await LibraryBook.findById(bookId);
      if (!book || book.available_quantity <= 0) {
        return res.status(400).json({ success: false, message: "Book not available" });
      }

      const issue = new BookIssue({
        school: schoolId,
        book: bookId,
        member_type,
        member: memberId,
        due_date,
        issued_by: issuedBy,
      });

      await issue.save();

      // Update book availability
      book.available_quantity -= 1;
      if (book.available_quantity === 0) {
        book.status = "Unavailable";
      }
      await book.save();

      res.status(201).json({ success: true, message: "Book issued successfully", data: issue });
    } catch (error) {
      console.error("Error issuing book:", error);
      res.status(500).json({ success: false, message: "Error issuing book", error: error.message });
    }
  },

  // Return book
  returnBook: async (req, res) => {
    try {
      const { issueId } = req.params;
      const { fine, remarks } = req.body;

      const issue = await BookIssue.findById(issueId);
      if (!issue) {
        return res.status(404).json({ success: false, message: "Issue record not found" });
      }

      issue.return_date = new Date();
      issue.status = "Returned";
      issue.fine = fine || 0;
      issue.remarks = remarks || "";
      await issue.save();

      // Update book availability
      const book = await LibraryBook.findById(issue.book);
      if (book) {
        book.available_quantity += 1;
        book.status = "Available";
        await book.save();
      }

      res.status(200).json({ success: true, message: "Book returned successfully", data: issue });
    } catch (error) {
      console.error("Error returning book:", error);
      res.status(500).json({ success: false, message: "Error returning book", error: error.message });
    }
  },

  // Get all issued books
  getAllIssuedBooks: async (req, res) => {
    try {
      const schoolId = req.user.schoolId;
      const { status, member_type } = req.query;

      const filter = { school: schoolId };
      if (status) filter.status = status;
      if (member_type) filter.member_type = member_type;

      const issues = await BookIssue.find(filter)
        .populate("book", "book_title book_number author")
        .populate("member", "name email roll_number")
        .populate("issued_by", "name")
        .sort({ issue_date: -1 });

      res.status(200).json({ success: true, data: issues });
    } catch (error) {
      console.error("Error fetching issued books:", error);
      res.status(500).json({ success: false, message: "Error fetching issued books", error: error.message });
    }
  },
};
