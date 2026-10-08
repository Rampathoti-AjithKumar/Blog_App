const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const { addComment } = require('../controllers/commentController');

const router = express.Router();
router.post('/posts/:id/comments', authenticateToken, addComment);

module.exports = router;
