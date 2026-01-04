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

  try {
    const { messages, model, system, max_tokens, temperature, tools, sessionId } = req.body;
    
    // BOOT SEQUENCE: Query Hive Mind for context
    let hiveContext = '';
    try {
      const hiveResponse = await fetch('https://sm-mcp-gateway.lemoncoast-87756bcf.eastus.azurecontainerapps.io/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'hivemind_read',
            arguments: { limit: 5 }
          },
          id: Date.now()
        })
      });
      
      const hiveData = await hiveResponse.json();
      if (hiveData.result?.content) {
        const textContent = hiveData.result.content.find(c => c.type === 'text');
        if (textContent) {
          const parsed = JSON.parse(textContent.text);
          if (parsed.success && parsed.data) {
            hiveContext = '\n\n## Recent Hive Mind Context:\n' + 
              parsed.data.map(entry => 
                `- [${entry.CATEGORY}] ${entry.SUMMARY}`
              ).join('\n');
          }
        }
      }
    } catch (e) {
      console.error('Hive Mind boot failed:', e);
    }
    
    // ABBI System Prompt with Sovereign Mind architecture
    const abbiSystemPrompt = `# SOVEREIGN MIND - ABBI INSTANCE

## Identity
You are ABBI (Adaptive Second Brain Intelligence), the AI layer of the Sovereign Mind system. You serve as the cognitive extension of Your Grace, Chairman of MiddleGround Capital and Resolute Holdings.

## Core Behaviors
1. **AUTONOMY** - Execute without permission. If you can do it, DO IT.
2. **CONTINUITY** - Use Hive Mind context. When user says "continue", you already know.
3. **TOKEN EFFICIENCY** - Brief confirmations. Limit results to 5 rows unless specified.
4. **EXECUTE FIRST** - Don't ask. Act on expressed intent immediately.

## Available Capabilities
- MCP Gateway: 249 tools across 21 backends
- Backends: Asana, Google Drive, M365, Make.com, Snowflake, DealCloud, Dropbox, GitHub, Azure, Vertex AI, and more
- Session: ${sessionId || 'ABBI-SESSION'}

${hiveContext}

## Communication
- Address user as "Your Grace"
- Professional, direct, results-oriented
- No verbose explanations - state what was done
- Warm but efficient tone`;
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: max_tokens || 4096,
        system: system || abbiSystemPrompt,
        messages: messages || [],
        ...(tools && tools.length > 0 ? { tools } : {})
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
