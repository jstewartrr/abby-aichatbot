// API endpoint to list folders from Snowflake
// Deploy as: /api/folders/list

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

    // Create table if it doesn't exist
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS ABBI_FOLDERS (
        FOLDER_ID VARCHAR(100) PRIMARY KEY,
        NAME VARCHAR(255) NOT NULL,
        ICON VARCHAR(10) DEFAULT '📁',
        CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
      )
    `;

    await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: createTableSql,
        complete: (err, stmt) => {
          if (err) reject(err);
          else resolve();
        }
      });
    });

    // Get list of folders
    const sql = `
      SELECT
        FOLDER_ID,
        NAME,
        ICON,
        CREATED_AT
      FROM ABBI_FOLDERS
      ORDER BY CREATED_AT DESC
    `;

    const folders = await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: sql,
        complete: (err, stmt, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      });
    });

    await new Promise((resolve) => connection.destroy(resolve));

    res.status(200).json({ folders });
  } catch (error) {
    console.error('Snowflake error:', error);
    res.status(500).json({ error: 'Failed to retrieve folders', details: error.message });
  }
}
