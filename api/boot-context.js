export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Query V_BOOT_CONTEXT view for HOT + ACTIVE skills
    const response = await fetch('https://sm-mcp-gateway.lemoncoast-87756bcf.eastus.azurecontainerapps.io/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'sm_query_snowflake',
          arguments: { 
            sql: `SELECT SKILL_NAME, TIER, CATEGORY, DESCRIPTION, USAGE_PATTERN, TAGS
                  FROM SOVEREIGN_MIND.RAW.V_BOOT_CONTEXT
                  WHERE TIER IN ('HOT', 'ACTIVE')
                  ORDER BY TIER, SKILL_NAME` 
          }
        },
        id: Date.now()
      })
    });

    const data = await response.json();
    
    if (data.result?.content) {
      const textContent = data.result.content.find(c => c.type === 'text');
      if (textContent) {
        const parsed = JSON.parse(textContent.text);
        return res.status(200).json(parsed);
      }
    }
    
    return res.status(500).json({ success: false, error: 'No boot context data' });
    
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
