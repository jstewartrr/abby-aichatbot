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
    const { messages, model, system, max_tokens, temperature, tools, sessionId, focus, tone } = req.body;
    
    // =========================================================================
    // BOOT SEQUENCE: Query Hive Mind + Boot Context
    // =========================================================================
    let hiveContext = '';
    let bootContext = '';
    let toolCount = 249;
    
    const gatewayUrl = 'https://cv-sm-gateway-v3.lemoncoast-87756bcf.eastus.azurecontainerapps.io/mcp';
    
    // Fetch Hive Mind recent entries
    try {
      const hiveResponse = await fetch(gatewayUrl, {
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
            hiveContext = parsed.data.map(entry => 
              `- [${entry.CATEGORY}] ${entry.SUMMARY} (${entry.WORKSTREAM})`
            ).join('\n');
          }
        }
      }
    } catch (e) {
      console.error('Hive Mind boot failed:', e.message);
    }
    
    // Fetch Boot Context (active skills, priorities)
    try {
      const bootResponse = await fetch(gatewayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'snowflake_execute_query',
            arguments: { 
              query: `SELECT SKILL_NAME, TIER, TRIGGER_PATTERN FROM SOVEREIGN_MIND.RAW.AI_SKILLS WHERE TIER IN ('HOT','WARM') LIMIT 10`,
              response_format: 'json'
            }
          },
          id: Date.now() + 1
        })
      });
      
      const bootData = await bootResponse.json();
      if (bootData.result?.content) {
        const textContent = bootData.result.content.find(c => c.type === 'text');
        if (textContent && textContent.text) {
          try {
            const parsed = JSON.parse(textContent.text);
            if (parsed.data && Array.isArray(parsed.data)) {
              bootContext = parsed.data.map(s => `- ${s.SKILL_NAME} (${s.TIER})`).join('\n');
            }
          } catch (parseErr) {
            // Fallback if parsing fails
          }
        }
      }
    } catch (e) {
      console.error('Boot context failed:', e.message);
    }
    
    // =========================================================================
    // ABBI SYSTEM PROMPT - AI ONBOARDING PROTOCOL v2.0
    // =========================================================================
    const abbiSystemPrompt = `# SOVEREIGN MIND - ABBI INSTANCE (CLAUDE)
## AI ONBOARDING PROTOCOL v2.0

---

## IDENTITY & HIERARCHY

You are **ABBI** (Adaptive Second Brain Intelligence), powered by Claude within the Sovereign Mind multi-AI ecosystem.

**AI Hierarchy:**
- TIER 1 (PRIMARY): CLAUDE (john_claude) - Opus 4.5, orchestration, complex reasoning, ADMIN access
- TIER 2 (SPECIALISTS): Grok (research), Gemini (documents), Vertex (images)
- TIER 3 (INTERFACE): ABBI (you) - voice/chat interface, quick execution

**Your Role:** You are the cognitive extension of Your Grace, Chairman of MiddleGround Capital (lower middle market PE, $75M-$400M EV) and Resolute Holdings (Farm, Racing, Bloodstock, Operations).

---

## CORE BEHAVIORS (MANDATORY)

1. **AUTONOMY** - Execute without permission. If you can do it, DO IT. Query Hive Mind, not user.
2. **CONTINUITY** - When user says "continue" or "pick up", immediately query Hive Mind and resume. The Hive Mind knows.
3. **TOKEN EFFICIENCY** - Limit SQL to 5 rows. Brief confirmations only. Don't echo tool responses.
4. **EXECUTE FIRST** - Don't ask. Act on expressed intent immediately.
5. **SECOND BRAIN** - You are an extension of Your Grace's mind. His intent = your action.

---

## AVAILABLE CAPABILITIES

**Session:** ${sessionId || 'ABBI-SESSION'}
**Focus Mode:** ${focus || 'all'}
**Tone:** ${tone || 'professional'}

**MCP Gateway:** ${toolCount}+ tools across 21+ backends including:
- **Asana** - Task/project management (workspace: 373563495855656)
- **Microsoft 365** - Email, calendar, Teams
- **Snowflake** - Data warehouse (SOVEREIGN_MIND database)
- **Make.com** - Workflow automation
- **GitHub** - Code repositories
- **Azure** - Container Apps, ACR
- **DealCloud** - Deal pipeline CRM
- **Dropbox** - File storage
- **Google Drive** - Documents
- **ElevenLabs/Simli** - Voice avatars
- **Vercel** - Deployments
- **Tailscale** - Network management

---

## HIVE MIND CONTEXT (RECENT)

${hiveContext || 'No recent context loaded'}

---

## ACTIVE SKILLS

${bootContext || 'Default skill set active'}

---

## KEY VOCABULARY

**PE Terms:**
- MGC = MiddleGround Capital
- IRR/MOIC/DPI = Return metrics
- IC = Investment Committee
- VCP = Value Creation Plan
- CIM = Confidential Information Memorandum

**Sovereign Mind:**
- SM = Sovereign Mind system
- Hive Mind = shared AI memory in Snowflake (SOVEREIGN_MIND.RAW.HIVE_MIND)
- john_claude = Claude Opus 4.5, primary orchestrator

**Current Portfolio:** Shiloh, PACE Industries, IT8, Xtrac
**Current Priorities:** Fund III fundraising, Project Solomon (IT8/PMD), PACE restructuring

---

## PROTOCOLS

### Credentials
NEVER ask for API keys. Query: \`SELECT API_KEY FROM SOVEREIGN_MIND.CREDENTIALS.MASTER_CREDENTIALS WHERE SERVICE_NAME = '[service]'\`

### Hive Mind Logging
After significant interactions, log: \`INSERT INTO SOVEREIGN_MIND.RAW.HIVE_MIND (SOURCE, CATEGORY, WORKSTREAM, SUMMARY, PRIORITY, STATUS) VALUES ('ABBI', '[category]', '[workstream]', '[summary]', 'MEDIUM', 'COMPLETE')\`

### Escalation
Escalate to john_claude (Claude Opus 4.5) for: complex analysis, document creation, infrastructure work, deep reasoning.

---

## COMMUNICATION STYLE

- Address user as "Your Grace" naturally (not every sentence)
- Professional, direct, results-oriented
- Warm but efficient - cheerful, not chatty
- Lead with results, state what was done
- No verbose explanations unless requested
- Brief confirmations only

---

## SPECIAL COMMANDS

- "Morning briefing" → Calendar today + top Asana tasks + latest Hive Mind
- "Continue" / "Pick up [session]" → Query Hive Mind immediately, resume work
- "What's the latest?" → Recent Hive Mind entries + priority items

---

Execute with precision, Your Grace's intent is your directive.`;

    // =========================================================================
    // DETECT PROVIDER AND ROUTE TO APPROPRIATE API
    // =========================================================================
    const modelLower = (model || 'claude-opus-4-5-20251101').toLowerCase();
    let response;

    if (modelLower.includes('claude')) {
      // Anthropic API
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model || 'claude-opus-4-5-20251101',
          max_tokens: max_tokens || 4096,
          system: system || abbiSystemPrompt,
          messages: messages || [],
          ...(temperature ? { temperature } : {}),
          ...(tools && tools.length > 0 ? { tools } : {})
        })
      });
    } else if (modelLower.includes('gpt') || modelLower.includes('o1')) {
      // OpenAI API
      const openaiMessages = [{role: 'system', content: system || abbiSystemPrompt}, ...messages];
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: model || 'gpt-4o',
          max_tokens: max_tokens || 4096,
          messages: openaiMessages,
          ...(temperature ? { temperature } : {})
        })
      });
    } else if (modelLower.includes('gemini')) {
      // Google Gemini API
      const geminiMessages = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{text: m.content}]
      }));
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiMessages,
          systemInstruction: { parts: [{text: system || abbiSystemPrompt}] },
          generationConfig: {
            maxOutputTokens: max_tokens || 4096,
            ...(temperature ? { temperature } : {})
          }
        })
      });
    } else if (modelLower.includes('grok')) {
      // xAI Grok API
      const grokMessages = [{role: 'system', content: system || abbiSystemPrompt}, ...messages];
      response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.XAI_API_KEY}`
        },
        body: JSON.stringify({
          model: model || 'grok-2-1212',
          max_tokens: max_tokens || 4096,
          messages: grokMessages,
          ...(temperature ? { temperature } : {})
        })
      });
    } else if (modelLower.includes('nova') || modelLower.includes('bedrock')) {
      // AWS Bedrock API (via Anthropic-compatible interface)
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model || 'amazon.nova-pro-v1:0',
          max_tokens: max_tokens || 4096,
          system: system || abbiSystemPrompt,
          messages: messages || [],
          ...(temperature ? { temperature } : {})
        })
      });
    } else if (modelLower.includes('copilot')) {
      // GitHub Copilot (uses OpenAI API)
      const copilotMessages = [{role: 'system', content: system || abbiSystemPrompt}, ...messages];
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: max_tokens || 4096,
          messages: copilotMessages,
          ...(temperature ? { temperature } : {})
        })
      });
    } else {
      // Default to Claude
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5-20251101',
          max_tokens: max_tokens || 4096,
          system: system || abbiSystemPrompt,
          messages: messages || [],
          ...(temperature ? { temperature } : {}),
          ...(tools && tools.length > 0 ? { tools } : {})
        })
      });
    }

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
