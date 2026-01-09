#!/usr/bin/env python3
"""
Gemini MCP Server using Vertex AI REST API
Uses service account authentication with bearer tokens
"""

import os
import json
import logging
from typing import Any
from datetime import datetime

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request as GoogleRequest

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Gemini MCP Server", version="2.0")

# Configuration
PROJECT_ID = os.environ.get("GOOGLE_PROJECT_ID", "innate-concept-481918-h9")
LOCATION = os.environ.get("GOOGLE_LOCATION", "us-central1")
CREDENTIALS_JSON = os.environ.get("GOOGLE_CREDENTIALS_JSON")
CREDENTIALS_FILE = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

# Available models
AVAILABLE_MODELS = [
    "gemini-2.0-flash-exp",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
]

DEFAULT_MODEL = "gemini-2.0-flash-exp"

class GenerateRequest(BaseModel):
    prompt: str
    model: str = DEFAULT_MODEL
    max_tokens: int = 8192
    temperature: float = 0.7

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list
    model: str = DEFAULT_MODEL
    system_instruction: str = None

class AnalyzeRequest(BaseModel):
    document_text: str
    analysis_prompt: str
    model: str = "gemini-1.5-pro"

def get_credentials():
    """Get Google credentials from environment"""
    try:
        if CREDENTIALS_JSON:
            # Parse JSON from environment variable
            creds_dict = json.loads(CREDENTIALS_JSON)
            creds = service_account.Credentials.from_service_account_info(
                creds_dict,
                scopes=['https://www.googleapis.com/auth/cloud-platform']
            )
        elif CREDENTIALS_FILE and os.path.exists(CREDENTIALS_FILE):
            creds = service_account.Credentials.from_service_account_file(
                CREDENTIALS_FILE,
                scopes=['https://www.googleapis.com/auth/cloud-platform']
            )
        else:
            raise ValueError("No credentials configured")
        
        # Refresh token
        creds.refresh(GoogleRequest())
        return creds
    except Exception as e:
        logger.error(f"Failed to get credentials: {e}")
        raise

def call_vertex_ai(prompt: str, model: str = DEFAULT_MODEL, max_tokens: int = 8192, temperature: float = 0.7):
    """Call Vertex AI Gemini API using REST"""
    try:
        creds = get_credentials()
        
        url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{model}:generateContent"
        
        headers = {
            "Authorization": f"Bearer {creds.token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "contents": [{
                "role": "user",
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "maxOutputTokens": max_tokens,
                "temperature": temperature
            }
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            text = result['candidates'][0]['content']['parts'][0]['text']
            return {"success": True, "text": text, "model": model}
        else:
            return {"success": False, "error": f"API error {response.status_code}: {response.text[:500]}"}
            
    except Exception as e:
        logger.error(f"Vertex AI call failed: {e}")
        return {"success": False, "error": str(e)}

def call_vertex_ai_chat(messages: list, model: str = DEFAULT_MODEL, system_instruction: str = None):
    """Call Vertex AI Gemini API for multi-turn chat"""
    try:
        creds = get_credentials()
        
        url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{model}:generateContent"
        
        headers = {
            "Authorization": f"Bearer {creds.token}",
            "Content-Type": "application/json"
        }
        
        # Convert messages to Vertex AI format
        contents = []
        for msg in messages:
            role = "user" if msg.get("role") == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg.get("content", "")}]
            })
        
        payload = {"contents": contents}
        
        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }
        
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            text = result['candidates'][0]['content']['parts'][0]['text']
            return {"success": True, "response": text, "model": model}
        else:
            return {"success": False, "error": f"API error {response.status_code}: {response.text[:500]}"}
            
    except Exception as e:
        logger.error(f"Vertex AI chat failed: {e}")
        return {"success": False, "error": str(e)}

# Health check
@app.get("/health")
async def health():
    return {"status": "healthy", "service": "gemini-mcp", "version": "2.0"}

# MCP endpoint
@app.post("/mcp")
@app.get("/mcp")
async def mcp_handler(request: Request):
    """Handle MCP protocol requests"""
    if request.method == "GET":
        return JSONResponse({
            "jsonrpc": "2.0",
            "result": {
                "name": "gemini-mcp",
                "version": "2.0",
                "capabilities": ["tools"]
            }
        })
    
    try:
        body = await request.json()
        method = body.get("method", "")
        params = body.get("params", {})
        request_id = body.get("id", 1)
        
        if method == "initialize":
            return JSONResponse({
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "serverInfo": {"name": "gemini-mcp", "version": "2.0"},
                    "capabilities": {"tools": {"listChanged": False}}
                }
            })
        
        elif method == "tools/list":
            tools = [
                {
                    "name": "gemini_generate_content",
                    "description": "Generate content using Gemini",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "prompt": {"type": "string", "description": "The prompt to generate content from"},
                            "model": {"type": "string", "default": DEFAULT_MODEL},
                            "max_tokens": {"type": "integer", "default": 8192},
                            "temperature": {"type": "number", "default": 0.7}
                        },
                        "required": ["prompt"]
                    }
                },
                {
                    "name": "gemini_chat",
                    "description": "Multi-turn chat with Gemini",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "messages": {"type": "array", "description": "Chat messages"},
                            "model": {"type": "string", "default": DEFAULT_MODEL},
                            "system_instruction": {"type": "string"}
                        },
                        "required": ["messages"]
                    }
                },
                {
                    "name": "gemini_analyze_document",
                    "description": "Analyze document text with Gemini",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "document_text": {"type": "string"},
                            "analysis_prompt": {"type": "string"},
                            "model": {"type": "string", "default": "gemini-1.5-pro"}
                        },
                        "required": ["document_text", "analysis_prompt"]
                    }
                },
                {
                    "name": "gemini_list_models",
                    "description": "List available Gemini models",
                    "inputSchema": {"type": "object", "properties": {}}
                }
            ]
            return JSONResponse({
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {"tools": tools}
            })
        
        elif method == "tools/call":
            tool_name = params.get("name", "")
            arguments = params.get("arguments", {})
            
            if tool_name == "gemini_generate_content":
                result = call_vertex_ai(
                    prompt=arguments.get("prompt", ""),
                    model=arguments.get("model", DEFAULT_MODEL),
                    max_tokens=arguments.get("max_tokens", 8192),
                    temperature=arguments.get("temperature", 0.7)
                )
            elif tool_name == "gemini_chat":
                result = call_vertex_ai_chat(
                    messages=arguments.get("messages", []),
                    model=arguments.get("model", DEFAULT_MODEL),
                    system_instruction=arguments.get("system_instruction")
                )
            elif tool_name == "gemini_analyze_document":
                prompt = f"{arguments.get('analysis_prompt', 'Analyze this document:')}\n\n{arguments.get('document_text', '')}"
                result = call_vertex_ai(
                    prompt=prompt,
                    model=arguments.get("model", "gemini-1.5-pro")
                )
            elif tool_name == "gemini_list_models":
                result = {"models": AVAILABLE_MODELS, "default": DEFAULT_MODEL}
            else:
                result = {"error": f"Unknown tool: {tool_name}"}
            
            return JSONResponse({
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {"content": [{"type": "text", "text": json.dumps(result)}]}
            })
        
        else:
            return JSONResponse({
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {"code": -32601, "message": f"Method not found: {method}"}
            })
            
    except Exception as e:
        logger.error(f"MCP error: {e}")
        return JSONResponse({
            "jsonrpc": "2.0",
            "id": 1,
            "error": {"code": -32603, "message": str(e)}
        }, status_code=500)

# Direct API endpoints
@app.post("/generate")
async def generate(req: GenerateRequest):
    return call_vertex_ai(req.prompt, req.model, req.max_tokens, req.temperature)

@app.post("/chat")
async def chat(req: ChatRequest):
    return call_vertex_ai_chat(req.messages, req.model, req.system_instruction)

@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    prompt = f"{req.analysis_prompt}\n\n{req.document_text}"
    return call_vertex_ai(prompt, req.model)

@app.get("/models")
async def list_models():
    return {"models": AVAILABLE_MODELS, "default": DEFAULT_MODEL}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
