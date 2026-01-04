import snowflake from 'snowflake-sdk';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sql, limit = 100 } = req.body;
  
  if (!sql) {
    return res.status(400).json({ error: 'SQL query required' });
  }

  // Validate query is SELECT only (prevent destructive operations)
  const trimmedSql = sql.trim().toUpperCase();
  if (!trimmedSql.startsWith('SELECT')) {
    return res.status(403).json({ error: 'Only SELECT queries allowed from frontend' });
  }

  try {
    const connection = snowflake.createConnection({
      account: process.env.SNOWFLAKE_ACCOUNT,
      username: process.env.SNOWFLAKE_USER,
      password: process.env.SNOWFLAKE_PASSWORD,
      warehouse: 'COMPUTE_WH',
      database: 'SOVEREIGN_MIND',
      schema: 'RAW'
    });

    await new Promise((resolve, reject) => {
      connection.connect((err, conn) => {
        if (err) reject(err);
        else resolve(conn);
      });
    });

    const result = await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: sql,
        complete: (err, stmt, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      });
    });

    connection.destroy();
    
    return res.status(200).json({ 
      success: true, 
      data: result.slice(0, limit),
      rowCount: result.length 
    });
    
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}
