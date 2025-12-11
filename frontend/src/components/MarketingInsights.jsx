import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getStoredApiBase } from '../utils/apiBase.js'
import {
  Sparkles, Send, RefreshCw, ChevronRight, User,
  Bot, AlertCircle, Lightbulb, TrendingUp, Users, Target
} from 'lucide-react'

/**
 * MarketingInsights - AI-powered chat interface for marketing data insights
 */
export default function MarketingInsights() {
  const [apiBase] = useState(() => getStoredApiBase())
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Add welcome message on mount
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `שלום! אני עוזר הניתוח השיווקי שלך.

אני יכול לעזור לך עם:
• ניתוח איכות הלידים ומגמות
• השוואת ביצועי קמפיינים
• זיהוי מקורות התנועה הטובים ביותר
• המלצות לשיפור

איך אוכל לעזור?`,
      timestamp: new Date()
    }])
  }, [])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${apiBase}/api/marketing/insights/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
        })
      })

      if (!res.ok) {
        throw new Error('Failed to get response')
      }

      const data = await res.json()

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || 'אין תשובה זמינה כרגע.',
        data: data.data,
        timestamp: new Date()
      }])
    } catch (e) {
      setError(e.message)
      // Still add a message to show the error
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'מצטער, נתקלתי בבעיה. נסה שוב מאוחר יותר.',
        isError: true,
        timestamp: new Date()
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const suggestedQuestions = [
    { icon: TrendingUp, text: 'מה המגמה בלידים החודש?' },
    { icon: Users, text: 'מאיפה הגיעו הלידים הכי איכותיים?' },
    { icon: Target, text: 'איזה קמפיין הכי משתלם?' },
    { icon: Lightbulb, text: 'תן לי המלצות לשיפור' }
  ]

  const handleSuggestedQuestion = (question) => {
    setInput(question)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]" data-testid="marketing-insights">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link to="/marketing" className="p-2 hover:bg-slate-100 rounded-lg">
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </Link>
          <div className="p-2 rounded-lg bg-purple-50">
            <Sparkles className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">תובנות AI</h1>
            <p className="text-sm text-slate-500">AI Marketing Insights</p>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 card p-0 flex flex-col overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' ? 'bg-petrol' : 'bg-purple-100'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-purple-600" />
                )}
              </div>
              <div className={`max-w-[80%] ${message.role === 'user' ? 'text-left' : 'text-right'}`}>
                <div className={`rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-petrol text-white rounded-tr-sm'
                    : message.isError
                      ? 'bg-rose-50 text-rose-700 rounded-tl-sm'
                      : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                }`}>
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                </div>

                {/* Data visualization if present */}
                {message.data && (
                  <div className="mt-2 bg-white border border-slate-200 rounded-lg p-3">
                    {message.data.type === 'stats' && (
                      <div className="grid grid-cols-3 gap-3">
                        {Object.entries(message.data.values || {}).map(([key, value]) => (
                          <div key={key} className="text-center">
                            <div className="text-lg font-bold text-slate-800">{value}</div>
                            <div className="text-xs text-slate-500">{key}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {message.data.type === 'chart' && (
                      <div className="text-sm text-slate-500 text-center py-2">
                        [תרשים יוצג כאן]
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-slate-400 mt-1">
                  {message.timestamp?.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-purple-600" />
              </div>
              <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-3">
            <div className="text-xs text-slate-500 mb-2">שאלות מוצעות:</div>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestedQuestion(q.text)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-full text-sm text-slate-600 transition-colors"
                >
                  <q.icon className="w-3 h-3" />
                  {q.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="שאל אותי על הלידים והקמפיינים שלך..."
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
              rows={1}
              disabled={loading}
              dir="rtl"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="px-4 py-3 bg-petrol text-white rounded-xl hover:bg-petrol/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
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
