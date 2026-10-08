const pool = require('../config/db');

async function getPosts(req, res) {
  try {
    const [posts] = await pool.query(`
      SELECT
        p.id,
        p.caption,
        p.media_url,
        p.media_type,
        p.created_at,
        u.id AS user_id,
        u.username,
        COUNT(DISTINCT l.id) AS likes,
        EXISTS(
          SELECT 1 FROM likes my_like
          WHERE my_like.post_id = p.id AND my_like.user_id = ?
        ) AS liked_by_me
      FROM posts p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN likes l ON l.post_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [req.user.id]);

    for (const post of posts) {
      const [comments] = await pool.query(`
        SELECT c.id, c.content, c.created_at, u.username, c.user_id
        FROM comments c
        JOIN users u ON u.id = c.user_id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
      `, [post.id]);
      post.comments = comments;
      post.likes = Number(post.likes);
      post.liked_by_me = Boolean(post.liked_by_me);
    }

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to load posts.' });
  }
}

async function createPost(req, res) {
  try {
    const { caption = '' } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Please select an image or video.' });
    }

    const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
    const mediaUrl = `/uploads/${req.file.filename}`;

    const [result] = await pool.query(
      'INSERT INTO posts (user_id, caption, media_url, media_type) VALUES (?, ?, ?, ?)',
      [req.user.id, caption.trim(), mediaUrl, mediaType]
    );

    const [rows] = await pool.query(`
      SELECT p.id, p.caption, p.media_url, p.media_type, p.created_at,
             u.id AS user_id, u.username
      FROM posts p JOIN users u ON u.id = p.user_id
      WHERE p.id = ?
    `, [result.insertId]);

    const post = { ...rows[0], likes: 0, liked_by_me: false, comments: [] };
    req.app.locals.broadcast('postCreated', post);
    res.status(201).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to create post.' });
  }
}

async function deletePost(req, res) {
  try {
    const [result] = await pool.query(
      'DELETE FROM posts WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Post not found or you are not the owner.' });
    }

    req.app.locals.broadcast('postDeleted', { postId: Number(req.params.id) });
    res.json({ message: 'Post deleted.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to delete post.' });
  }
}

async function toggleLike(req, res) {
  try {
    const postId = req.params.id;
    const [existing] = await pool.query(
      'SELECT id FROM likes WHERE post_id = ? AND user_id = ?',
      [postId, req.user.id]
    );

    let liked;
    if (existing.length) {
      await pool.query('DELETE FROM likes WHERE id = ?', [existing[0].id]);
      liked = false;
    } else {
      await pool.query('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, req.user.id]);
      liked = true;
    }

    const [countRows] = await pool.query(
      'SELECT COUNT(*) AS likes FROM likes WHERE post_id = ?',
      [postId]
    );

    const result = { postId: Number(postId), liked, likes: Number(countRows[0].likes) };
    req.app.locals.broadcast('likeUpdated', result);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to update like.' });
  }
}

module.exports = { getPosts, createPost, deletePost, toggleLike };
