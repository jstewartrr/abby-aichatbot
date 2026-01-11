// API endpoint to create a new folder in Snowflake
// Deploy as: /api/folders/create

import snowflake from 'snowflake-sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, icon } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Folder name required' });
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

    // Generate folder ID
    const folderId = 'FOLDER-' + Math.random().toString(36).substr(2, 8).toUpperCase();

    // Insert folder
    const sql = `
      INSERT INTO ABBI_FOLDERS (FOLDER_ID, NAME, ICON)
      VALUES (?, ?, ?)
    `;

    await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: sql,
        binds: [folderId, name, icon || '📁'],
        complete: (err, stmt) => {
          if (err) reject(err);
          else resolve();
        }
      });
    });

    await new Promise((resolve) => connection.destroy(resolve));

    res.status(201).json({
      success: true,
      folder: { folderId, name, icon: icon || '📁' }
    });
  } catch (error) {
    console.error('Snowflake error:', error);
    res.status(500).json({ error: 'Failed to create folder', details: error.message });
  }
}
