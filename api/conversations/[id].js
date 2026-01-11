// API endpoint to load a specific conversation from Snowflake
// Deploy as: /api/conversations/[id]

import snowflake from 'snowflake-sdk';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Conversation ID required' });
  }

  try {
    const connection = snowflake.createConnection({
      account: process.env.SNOWFLAKE_ACCOUNT,
      username: process.env.SNOWFLAKE_USERNAME,
      password: process.env.SNOWFLAKE_PASSWORD,
      database: 'SOVEREIGN_MIND',
      schema: 'RAW'
    });

    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const sql = `
      SELECT
        MESSAGE_ID,
        ROLE,
        CONTENT,
        CREATED_AT,
        CONVERSATION_TITLE
      FROM ABBI_CONVERSATIONS
      WHERE CONVERSATION_ID = ?
      ORDER BY CREATED_AT ASC
    `;

    const messages = await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: sql,
        binds: [id],
        complete: (err, stmt, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      });
    });

    await new Promise((resolve) => connection.destroy(resolve));

    if (messages.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.status(200).json({
      conversationId: id,
      title: messages[0].CONVERSATION_TITLE,
      messages: messages.map(m => ({
        role: m.ROLE,
        content: m.CONTENT,
        timestamp: m.CREATED_AT
      }))
    });
  } catch (error) {
    console.error('Snowflake error:', error);
    res.status(500).json({ error: 'Failed to load conversation', details: error.message });
  }
}
