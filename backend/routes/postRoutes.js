const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const authenticateToken = require('../middleware/authMiddleware');
const { getPosts, createPost, deletePost, toggleLike } = require('../controllers/postController');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
    cb(allowed ? null : new Error('Only image and video files are allowed.'), allowed);
  }
});

router.get('/', authenticateToken, getPosts);
router.post('/', authenticateToken, upload.single('media'), createPost);
router.delete('/:id', authenticateToken, deletePost);
router.post('/:id/like', authenticateToken, toggleLike);

module.exports = router;
