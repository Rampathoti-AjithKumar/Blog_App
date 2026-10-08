const pool = require('../config/db');

async function addComment(req, res) {
  try {
    const content = (req.body.content || '').trim();
    const postId = req.params.id;

    if (!content) {
      return res.status(400).json({ message: 'Comment cannot be empty.' });
    }

    const [post] = await pool.query('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post.length) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const [result] = await pool.query(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [postId, req.user.id, content]
    );

    const [rows] = await pool.query(`
      SELECT c.id, c.post_id, c.user_id, c.content, c.created_at, u.username
      FROM comments c JOIN users u ON u.id = c.user_id
      WHERE c.id = ?
    `, [result.insertId]);

    req.app.locals.broadcast('commentAdded', rows[0]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to add comment.' });
  }
}

module.exports = { addComment };
