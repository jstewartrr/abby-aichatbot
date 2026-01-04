export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Read from Hive Mind
      const { limit = 10, category, workstream, source } = req.query;
      
      const response = await fetch('https://sm-mcp-gateway.lemoncoast-87756bcf.eastus.azurecontainerapps.io/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'hivemind_read',
            arguments: { 
              limit: parseInt(limit),
              ...(category && { category }),
              ...(workstream && { workstream }),
              ...(source && { source })
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
      
      return res.status(500).json({ success: false, error: 'No data returned' });
      
    } else if (req.method === 'POST') {
      // Write to Hive Mind
      const { source, category, workstream, summary, details, priority, tags } = req.body;
      
      if (!source || !category || !summary) {
        return res.status(400).json({ error: 'source, category, and summary required' });
      }

      const response = await fetch('https://sm-mcp-gateway.lemoncoast-87756bcf.eastus.azurecontainerapps.io/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'hivemind_write',
            arguments: {
              source,
              category,
              workstream: workstream || 'GENERAL',
              summary,
              details: details || {},
              priority: priority || 'MEDIUM',
              tags: tags || []
            }
          },
          id: Date.now()
        })
      });

      const data = await response.json();
      return res.status(200).json({ success: true, data });
      
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
