// API endpoint to save conversations to Snowflake
// Deploy as: /api/conversations/save

import snowflake from 'snowflake-sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { conversationId, messages, title } = req.body;

  if (!conversationId || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing required fields' });
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

    // Save each message
    for (const message of messages) {
      const messageId = `${conversationId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const sql = `
        INSERT INTO ABBI_CONVERSATIONS
        (CONVERSATION_ID, MESSAGE_ID, ROLE, CONTENT, CREATED_AT, CONVERSATION_TITLE)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(), ?)
      `;

      await new Promise((resolve, reject) => {
        connection.execute({
          sqlText: sql,
          binds: [conversationId, messageId, message.role, message.content, title || 'Untitled Chat'],
          complete: (err, stmt, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        });
      });
    }

    await new Promise((resolve) => connection.destroy(resolve));

    res.status(200).json({ success: true, conversationId });
  } catch (error) {
    console.error('Snowflake error:', error);
    res.status(500).json({ error: 'Failed to save conversation', details: error.message });
  }
}
