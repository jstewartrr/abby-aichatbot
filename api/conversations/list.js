// API endpoint to retrieve conversation history from Snowflake
// Deploy as: /api/conversations/list

import snowflake from 'snowflake-sdk';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
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

    // Get list of conversations with latest message timestamp
    const sql = `
      SELECT
        CONVERSATION_ID,
        CONVERSATION_TITLE,
        MAX(CREATED_AT) as LAST_UPDATED,
        COUNT(*) as MESSAGE_COUNT
      FROM ABBI_CONVERSATIONS
      GROUP BY CONVERSATION_ID, CONVERSATION_TITLE
      ORDER BY LAST_UPDATED DESC
      LIMIT 50
    `;

    const conversations = await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: sql,
        complete: (err, stmt, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      });
    });

    await new Promise((resolve) => connection.destroy(resolve));

    res.status(200).json({ conversations });
  } catch (error) {
    console.error('Snowflake error:', error);
    res.status(500).json({ error: 'Failed to retrieve conversations', details: error.message });
  }
}
