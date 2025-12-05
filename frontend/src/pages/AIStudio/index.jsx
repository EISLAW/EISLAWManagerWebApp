import React, { useState, useEffect, useRef } from 'react'
import { getStoredApiBase } from '../../utils/apiBase.js'
import { MessageSquare, Send, Loader2, Plus, Trash2, ChevronDown, Bot, User, Wrench, CheckCircle2, AlertCircle } from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Provider Selector Component
// ─────────────────────────────────────────────────────────────

function ProviderSelect({ value, onChange, providers }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-petrol/30"
      >
        {providers.map((p) => (
          <option key={p.id} value={p.id} disabled={!p.available}>
            {p.name} {!p.available && '(לא מוגדר)'}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Tool Call Display Component
// ─────────────────────────────────────────────────────────────

function ToolCallDisplay({ toolCall, toolResult }) {
  const [expanded, setExpanded] = useState(false)
  const isSuccess = toolResult?.result?.success !== false

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 my-2">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <Wrench className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-800">
          {toolCall.tool}
        </span>
        {isSuccess ? (
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        ) : (
          <AlertCircle className="w-4 h-4 text-red-600" />
        )}
        <ChevronDown className={`w-4 h-4 text-amber-600 mr-auto transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>
      {expanded && (
        <div className="mt-2 text-xs space-y-2">
          <div className="bg-white rounded p-2">
            <div className="text-slate-500 mb-1">Arguments:</div>
            <pre className="text-slate-700 overflow-x-auto" dir="ltr">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>
          {toolResult && (
            <div className={`rounded p-2 ${isSuccess ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="text-slate-500 mb-1">Result:</div>
              <pre className={`overflow-x-auto ${isSuccess ? 'text-green-700' : 'text-red-700'}`} dir="ltr">
                {JSON.stringify(toolResult.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Chat Message Component
// ─────────────────────────────────────────────────────────────

function ChatMessage({ message, isUser }) {
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-petrol text-white' : 'bg-copper/20 text-copper'
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
        isUser
          ? 'bg-petrol text-white rounded-br-md'
          : 'bg-slate-100 text-slate-800 rounded-bl-md'
      }`}>
        <div className="whitespace-pre-wrap text-sm leading-relaxed" dir="auto">
          {message.content}
        </div>
        {/* Display tool calls if present */}
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="mt-2 border-t border-slate-200 pt-2">
            {message.tool_calls.map((tc, idx) => (
              <div key={idx} className="text-xs text-slate-500 flex items-center gap-1">
                <Wrench className="w-3 h-3" />
                Used: {tc.tool}
              </div>
            ))}
          </div>
        )}
        {message.timestamp && (
          <div className={`text-xs mt-1 ${isUser ? 'text-white/60' : 'text-slate-400'}`}>
            {new Date(message.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Conversation List Component
// ─────────────────────────────────────────────────────────────

function ConversationList({ conversations, activeId, onSelect, onNew, onDelete }) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 bg-petrol text-white rounded-lg px-4 py-2 hover:bg-petrol/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          שיחה חדשה
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 && (
          <div className="text-center text-slate-400 text-sm py-8">
            אין שיחות עדיין
          </div>
        )}
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
              activeId === conv.id
                ? 'bg-petrol/10 text-petrol'
                : 'hover:bg-slate-100 text-slate-700'
            }`}
            onClick={() => onSelect(conv.id)}
          >
            <MessageSquare className="w-4 h-4 flex-shrink-0" />
            <div className="flex-1 truncate text-sm" dir="auto">
              {conv.title || 'שיחה ללא כותרת'}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(conv.id)
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
            >
              <Trash2 className="w-3 h-3 text-red-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main AI Studio Component
// ─────────────────────────────────────────────────────────────

export default function AIStudio() {
  const base = getStoredApiBase() || import.meta.env.VITE_API_URL || "http://20.217.86.4:8799"

  // State
  const [providers, setProviders] = useState([])
  const [selectedProvider, setSelectedProvider] = useState('gemini')
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState(null)
  const [toolsEnabled, setToolsEnabled] = useState(false)
  const [toolsAvailable, setToolsAvailable] = useState(false)
  const [currentToolEvents, setCurrentToolEvents] = useState([]) // Tool events during streaming

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])

  // Load providers and tools on mount
  useEffect(() => {
    loadProviders()
    loadConversations()
    loadToolsAvailability()
  }, [])

  const loadToolsAvailability = async () => {
    try {
      const res = await fetch(`${base}/api/ai-studio/tools`)
      if (res.ok) {
        const data = await res.json()
        setToolsAvailable(data.available || false)
      }
    } catch (err) {
      console.error('Failed to load tools:', err)
    }
  }

  const loadProviders = async () => {
    try {
      const res = await fetch(`${base}/api/ai-studio/providers`)
      if (res.ok) {
        const data = await res.json()
        setProviders(data.providers || [])
        // Select first available provider
        const available = data.providers?.find(p => p.available)
        if (available) {
          setSelectedProvider(available.id)
        }
      }
    } catch (err) {
      console.error('Failed to load providers:', err)
    }
  }

  const loadConversations = async () => {
    try {
      const res = await fetch(`${base}/api/ai-studio/conversations`)
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch (err) {
      console.error('Failed to load conversations:', err)
    }
  }

  const loadConversation = async (id) => {
    try {
      const res = await fetch(`${base}/api/ai-studio/conversations/${id}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
        setActiveConversationId(id)
      }
    } catch (err) {
      console.error('Failed to load conversation:', err)
    }
  }

  const deleteConversation = async (id) => {
    try {
      await fetch(`${base}/api/ai-studio/conversations/${id}`, { method: 'DELETE' })
      setConversations(prev => prev.filter(c => c.id !== id))
      if (activeConversationId === id) {
        setActiveConversationId(null)
        setMessages([])
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err)
    }
  }

  const startNewConversation = () => {
    setActiveConversationId(null)
    setMessages([])
    setError(null)
    inputRef.current?.focus()
  }

  const sendMessage = async () => {
    if (!inputValue.trim() || isStreaming) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setError(null)
    setIsStreaming(true)
    setStreamingContent('')
    setCurrentToolEvents([])

    // Add user message to UI immediately
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, newUserMessage])

    try {
      const res = await fetch(`${base}/api/ai-studio/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConversationId,
          message: userMessage,
          provider: selectedProvider,
          tools_enabled: toolsEnabled && toolsAvailable
        })
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let newConversationId = activeConversationId
      let toolEvents = []
      let currentToolCall = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n')

        for (const line of lines) {
          // Parse event type
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7).trim()
            // Store for next data line
            currentToolCall = eventType
          }
          else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.content) {
                fullContent += data.content
                setStreamingContent(fullContent)
              }

              if (data.conversation_id) {
                newConversationId = data.conversation_id
              }

              // Handle tool events
              if (data.tool) {
                if (data.arguments !== undefined) {
                  // This is a tool_call event
                  const toolEvent = { type: 'call', tool: data.tool, arguments: data.arguments }
                  toolEvents.push(toolEvent)
                  setCurrentToolEvents([...toolEvents])
                } else if (data.result !== undefined) {
                  // This is a tool_result event
                  const toolEvent = { type: 'result', tool: data.tool, result: data.result }
                  toolEvents.push(toolEvent)
                  setCurrentToolEvents([...toolEvents])
                }
              }

              if (data.error) {
                throw new Error(data.error)
              }
            } catch (e) {
              if (e.message && !e.message.includes('JSON')) {
                throw e
              }
            }
          }
        }
      }

      // Add assistant message with tool calls
      if (fullContent || toolEvents.length > 0) {
        const assistantMessage = {
          role: 'assistant',
          content: fullContent,
          timestamp: new Date().toISOString()
        }
        // Add tool calls to message if any
        if (toolEvents.length > 0) {
          assistantMessage.tool_calls = toolEvents.filter(e => e.type === 'call')
        }
        setMessages(prev => [...prev, assistantMessage])
      }

      // Update conversation ID if new
      if (newConversationId && newConversationId !== activeConversationId) {
        setActiveConversationId(newConversationId)
        loadConversations()
      }

    } catch (err) {
      console.error('Chat error:', err)
      setError(err.message || 'שגיאה בשליחת ההודעה')
    } finally {
      setIsStreaming(false)
      setStreamingContent('')
      setCurrentToolEvents([])
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="h-[calc(100vh-64px)] flex" dir="rtl">
      {/* Sidebar */}
      <div className="w-64 bg-white border-l border-slate-200 flex-shrink-0">
        <ConversationList
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={loadConversation}
          onNew={startNewConversation}
          onDelete={deleteConversation}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-petrol to-copper flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">AI Studio</h1>
              <p className="text-xs text-slate-500">צ'אט עם AI</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Tools Toggle */}
            {toolsAvailable && (
              <button
                onClick={() => setToolsEnabled(!toolsEnabled)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  toolsEnabled
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                }`}
                title={toolsEnabled ? 'Tools enabled - AI can perform actions' : 'Enable tools to let AI perform actions'}
              >
                <Wrench className="w-4 h-4" />
                <span className="hidden sm:inline">{toolsEnabled ? 'Agent Mode' : 'Chat Mode'}</span>
              </button>
            )}
            <ProviderSelect
              value={selectedProvider}
              onChange={setSelectedProvider}
              providers={providers}
            />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && !isStreaming && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Bot className="w-16 h-16 mb-4 text-slate-300" />
              <p className="text-lg">התחל שיחה חדשה</p>
              <p className="text-sm">שאל כל שאלה או בקש עזרה</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <ChatMessage
              key={idx}
              message={msg}
              isUser={msg.role === 'user'}
            />
          ))}

          {/* Tool events during streaming */}
          {isStreaming && currentToolEvents.length > 0 && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Wrench className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 space-y-2">
                {currentToolEvents.map((event, idx) => {
                  if (event.type === 'call') {
                    return (
                      <div key={idx} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm text-amber-800">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Calling: <strong>{event.tool}</strong></span>
                        </div>
                        <pre className="text-xs text-amber-700 mt-1 overflow-x-auto" dir="ltr">
                          {JSON.stringify(event.arguments, null, 2)}
                        </pre>
                      </div>
                    )
                  } else {
                    const isSuccess = event.result?.success !== false
                    return (
                      <div key={idx} className={`border rounded-lg p-3 ${isSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className={`flex items-center gap-2 text-sm ${isSuccess ? 'text-green-800' : 'text-red-800'}`}>
                          {isSuccess ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          <span>Result: <strong>{event.tool}</strong></span>
                        </div>
                        <pre className={`text-xs mt-1 overflow-x-auto ${isSuccess ? 'text-green-700' : 'text-red-700'}`} dir="ltr">
                          {JSON.stringify(event.result, null, 2)}
                        </pre>
                      </div>
                    )
                  }
                })}
              </div>
            </div>
          )}

          {/* Streaming message */}
          {isStreaming && streamingContent && (
            <ChatMessage
              message={{ content: streamingContent, timestamp: null }}
              isUser={false}
            />
          )}

          {/* Loading indicator */}
          {isStreaming && !streamingContent && currentToolEvents.length === 0 && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-copper/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-copper" />
              </div>
              <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-slate-200 p-4">
          <div className="max-w-4xl mx-auto flex gap-3">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="הקלד הודעה..."
              className="flex-1 resize-none border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-petrol/30 text-sm"
              rows={1}
              dir="auto"
              disabled={isStreaming}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isStreaming}
              className="bg-petrol text-white rounded-xl px-4 py-3 hover:bg-petrol/90 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              {isStreaming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
