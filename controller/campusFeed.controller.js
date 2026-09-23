const CampusFeed = require("../model/campusFeed.model");

const schoolId = (req) => req.user?.schoolId || req.user?.school;
const authorName = (req) => req.user?.name || req.user?.username || "Campus member";

const toTags = (content, tags) => {
  const explicit = Array.isArray(tags) ? tags : [];
  const hashtags = String(content).match(/#[a-z0-9_]+/gi) || [];
  return [...new Set([...explicit, ...hashtags].map((tag) => String(tag).replace(/^#/, "").toLowerCase()).filter(Boolean))];
};

module.exports = {
  getFeed: async (req, res) => {
    try {
      const posts = await CampusFeed.find({ school: schoolId(req) }).sort({ createdAt: -1 }).limit(50).lean();
      const tagCounts = {};
      const contributors = {};
      posts.forEach((post) => {
        (post.tags || []).forEach((tag) => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; });
        const key = String(post.authorId);
        contributors[key] = contributors[key] || { authorId: post.authorId, name: post.authorName, posts: 0, likes: 0 };
        contributors[key].posts += 1;
        contributors[key].likes += (post.likes || []).length;
      });
      res.json({ success: true, data: { posts, trending: Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag, count]) => ({ tag, count })), contributors: Object.values(contributors).sort((a, b) => b.posts - a.posts).slice(0, 5), upcomingEvents: [] } });
    } catch (error) {
      res.status(500).json({ success: false, message: "Unable to load campus feed", error: error.message });
    }
  },

  createPost: async (req, res) => {
    try {
      const { content, tags, visibility = "school" } = req.body;
      if (!content || !String(content).trim()) return res.status(400).json({ success: false, message: "Post content is required" });
      const post = await CampusFeed.create({ school: schoolId(req), authorId: req.user.id, authorName: authorName(req), authorRole: req.user.role || "Student", content: String(content).trim(), tags: toTags(content, tags), visibility });
      res.status(201).json({ success: true, data: post, message: "Post published" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Unable to publish post", error: error.message });
    }
  },

  toggleLike: async (req, res) => {
    try {
      const post = await CampusFeed.findOne({ _id: req.params.id, school: schoolId(req) });
      if (!post) return res.status(404).json({ success: false, message: "Post not found" });
      const index = post.likes.findIndex((id) => String(id) === String(req.user.id));
      if (index >= 0) post.likes.splice(index, 1); else post.likes.push(req.user.id);
      await post.save();
      res.json({ success: true, data: { liked: index < 0, likes: post.likes.length } });
    } catch (error) {
      res.status(500).json({ success: false, message: "Unable to update like", error: error.message });
    }
  },

  addComment: async (req, res) => {
    try {
      if (!req.body.text || !String(req.body.text).trim()) return res.status(400).json({ success: false, message: "Comment is required" });
      const post = await CampusFeed.findOneAndUpdate({ _id: req.params.id, school: schoolId(req) }, { $push: { comments: { authorId: req.user.id, authorName: authorName(req), text: String(req.body.text).trim() } } }, { new: true });
      if (!post) return res.status(404).json({ success: false, message: "Post not found" });
      res.status(201).json({ success: true, data: post.comments[post.comments.length - 1] });
    } catch (error) {
      res.status(500).json({ success: false, message: "Unable to add comment", error: error.message });
    }
  },

  removePost: async (req, res) => {
    try {
      const post = await CampusFeed.findOneAndDelete({ _id: req.params.id, school: schoolId(req), authorId: req.user.id });
      if (!post) return res.status(404).json({ success: false, message: "Post not found or not owned by you" });
      res.json({ success: true, data: req.params.id });
    } catch (error) {
      res.status(500).json({ success: false, message: "Unable to remove post", error: error.message });
    }
  },
};