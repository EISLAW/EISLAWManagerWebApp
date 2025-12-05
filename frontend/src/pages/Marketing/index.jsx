import React, { useState, useEffect, useCallback } from 'react'
import { getStoredApiBase } from '../../utils/apiBase.js'
import PromptSelector from '../../components/PromptSelector.jsx'

// ─────────────────────────────────────────────────────────────
// Reusable Components
// ─────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children, testId }) {
  return (
    <section className="card space-y-4" data-testid={testId}>
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-petrol">{title}</h2>
        {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
      </header>
      {children}
    </section>
  )
}

function StatusPill({ tone = 'info', children }) {
  const toneMap = {
    info: 'bg-blue-50 text-blue-700 border border-blue-100',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border border-amber-100',
    danger: 'bg-rose-50 text-rose-700 border border-rose-100',
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${toneMap[tone]}`}>{children}</span>
}

function Button({ onClick, disabled, variant = 'primary', children, className = '' }) {
  const variants = {
    primary: 'bg-petrol text-white hover:bg-petrol/90 disabled:bg-slate-300',
    secondary: 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50',
    ghost: 'text-petrol hover:bg-petrol/10',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

// Max custom text length (must match backend)
const MAX_CUSTOM_TEXT_LENGTH = 50000

function Toast({ message, type, onClose }) {
  React.useEffect(() => {
    // Errors need more time to read
    const duration = type === 'error' ? 5000 : 3000
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, type])

  const bgColor = type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-rose-500' : 'bg-petrol'

  return (
    <div className={`fixed bottom-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in`}>
      {message}
    </div>
  )
}

function StepIndicator({ currentStep, steps }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <div className={`flex items-center gap-2 ${index <= currentStep ? 'text-petrol' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              index < currentStep ? 'bg-petrol text-white' :
              index === currentStep ? 'bg-petrol/20 text-petrol border-2 border-petrol' :
              'bg-slate-100 text-slate-400'
            }`}>
              {index < currentStep ? '✓' : index + 1}
            </div>
            <span className="text-sm font-medium hidden sm:inline">{step}</span>
          </div>
          {index < steps.length - 1 && (
            <div className={`w-8 h-0.5 ${index < currentStep ? 'bg-petrol' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function Marketing() {
  const [apiBase, setApiBase] = useState(() => getStoredApiBase())
  const [activeTab, setActiveTab] = useState('create')

  // Wizard state
  const [wizardStep, setWizardStep] = useState(0)
  const [selectedFormat, setSelectedFormat] = useState('linkedin_medium')
  const [selectedPromptId, setSelectedPromptId] = useState(null)
  const [selectedPromptContent, setSelectedPromptContent] = useState(null)
  const [topicHint, setTopicHint] = useState('')
  const [sourceType, setSourceType] = useState('search') // 'search' | 'browse' | 'custom'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedTranscript, setSelectedTranscript] = useState(null)
  const [customText, setCustomText] = useState('')
  const [allTranscripts, setAllTranscripts] = useState([])

  // Generation state
  const [currentJob, setCurrentJob] = useState(null)
  const [hooks, setHooks] = useState([])
  const [selectedHookIndex, setSelectedHookIndex] = useState(0)
  const [generatedContent, setGeneratedContent] = useState('')
  const [qualityStatus, setQualityStatus] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  // History state
  const [savedContent, setSavedContent] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Initial loading state
  const [initialLoading, setInitialLoading] = useState(true)

  // Toast notification state
  const [toast, setToast] = useState(null)

  // ─────────────────────────────────────────────────────────────
  // API Calls
  // ─────────────────────────────────────────────────────────────

  const searchTranscripts = useCallback(async (query) => {
    if (!query.trim()) return
    try {
      const res = await fetch(`${apiBase}/api/marketing/transcripts/search?q=${encodeURIComponent(query)}&limit=5`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data)
      }
    } catch (e) {
      console.error('Search error:', e)
    }
  }, [apiBase])

  const loadAllTranscripts = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/marketing/transcripts`)
      if (res.ok) {
        const data = await res.json()
        setAllTranscripts(data)
      }
    } catch (e) {
      console.error('Load transcripts error:', e)
    }
  }, [apiBase])

  const loadSavedContent = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch(`${apiBase}/api/marketing/content?limit=20`)
      if (res.ok) {
        const data = await res.json()
        setSavedContent(data)
      }
    } catch (e) {
      console.error('Load content error:', e)
    } finally {
      setHistoryLoading(false)
    }
  }, [apiBase])

  const startGeneration = async () => {
    setIsGenerating(true)
    setError('')
    setHooks([])
    setGeneratedContent('')

    const payload = {
      format: selectedFormat,
      topic_hint: topicHint,
    }

    // Include custom prompt if selected
    if (selectedPromptContent) {
      payload.custom_prompt = selectedPromptContent
    }

    if (sourceType === 'custom') {
      payload.source_custom_text = customText
    } else if (selectedTranscript) {
      payload.source_transcript_id = selectedTranscript.id
    } else {
      setError('Please select a source')
      setIsGenerating(false)
      return
    }

    try {
      const res = await fetch(`${apiBase}/api/marketing/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Generation failed')
      }

      const job = await res.json()
      setCurrentJob(job)

      if (job.status === 'hooks_ready' && job.result_hooks) {
        setHooks(job.result_hooks)
        setWizardStep(2) // Move to hook selection
      } else if (job.status === 'completed' && job.result_content) {
        setGeneratedContent(job.result_content)
        setQualityStatus(job.quality_status)
        setWizardStep(2) // Move to review
      } else if (job.status === 'failed') {
        throw new Error(job.error_message || 'Generation failed')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const generateWithHook = async (hookText) => {
    if (!currentJob) return
    setIsGenerating(true)
    setError('')

    try {
      const res = await fetch(`${apiBase}/api/marketing/generate/${currentJob.id}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_hook: hookText }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Content generation failed')
      }

      const job = await res.json()
      setCurrentJob(job)

      if (job.status === 'completed' && job.result_content) {
        setGeneratedContent(job.result_content)
        setQualityStatus(job.quality_status)
      } else if (job.status === 'failed') {
        throw new Error(job.error_message || 'Generation failed')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const saveContent = async () => {
    if (!generatedContent) return

    try {
      const res = await fetch(`${apiBase}/api/marketing/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: currentJob?.id,
          content: generatedContent,
          format: selectedFormat,
          selected_hook_index: selectedHookIndex,
        }),
      })

      if (res.ok) {
        await loadSavedContent()
        showToast('Content saved!')
      }
    } catch (e) {
      console.error('Save error:', e)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent)
      showToast('Copied to clipboard!')
    } catch (e) {
      console.error('Copy error:', e)
      showToast('Failed to copy', 'error')
    }
  }

  const deleteContent = async (id) => {
    if (!confirm('Delete this content?')) return
    try {
      await fetch(`${apiBase}/api/marketing/content/${id}`, { method: 'DELETE' })
      await loadSavedContent()
    } catch (e) {
      console.error('Delete error:', e)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const loadInitialData = async () => {
      setInitialLoading(true)
      await Promise.all([loadAllTranscripts(), loadSavedContent()])
      setInitialLoading(false)
    }
    loadInitialData()
  }, []) // Empty deps - only run once on mount

  // Helper to show toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchTranscripts(searchQuery)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchTranscripts])

  // ─────────────────────────────────────────────────────────────
  // Reset wizard
  // ─────────────────────────────────────────────────────────────

  const resetWizard = () => {
    setWizardStep(0)
    setSelectedFormat('linkedin_medium')
    setSelectedPromptId(null)
    setSelectedPromptContent(null)
    setTopicHint('')
    setSourceType('search')
    setSearchQuery('')
    setSearchResults([])
    setSelectedTranscript(null)
    setCustomText('')
    setCurrentJob(null)
    setHooks([])
    setSelectedHookIndex(0)
    setGeneratedContent('')
    setQualityStatus(null)
    setError('')
  }

  // ─────────────────────────────────────────────────────────────
  // Render Steps
  // ─────────────────────────────────────────────────────────────

  const renderStep0 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">What do you want to create?</label>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: 'linkedin_short', label: 'LinkedIn Post', sub: 'Short (150-250 words)' },
            { value: 'linkedin_medium', label: 'LinkedIn Post', sub: 'Medium (250-400 words)' },
            { value: 'linkedin_long', label: 'LinkedIn Post', sub: 'Long (400-600 words)' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedFormat(opt.value)}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                selectedFormat === opt.value
                  ? 'border-petrol bg-petrol/5'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="font-medium text-slate-800">{opt.label}</div>
              <div className="text-sm text-slate-500">{opt.sub}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Topic or theme (optional)</label>
        <input
          type="text"
          value={topicHint}
          onChange={(e) => setTopicHint(e.target.value)}
          placeholder="e.g., regulatory challenges, client success story..."
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
        />
      </div>

      {/* Prompt Template Selector */}
      <PromptSelector
        value={selectedPromptId}
        onChange={(id, prompt) => {
          setSelectedPromptId(id)
          setSelectedPromptContent(prompt?.content || null)
        }}
        categoryFilter="content_formats"
        label="תבנית תוכן"
        labelEn="Content Template"
        placeholder="בחר תבנית (אופציונלי)..."
      />

      <div className="flex justify-end">
        <Button onClick={() => setWizardStep(1)}>Continue</Button>
      </div>
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Select source material</label>
        <div className="flex gap-4 mb-4">
          {[
            { value: 'search', label: 'Search' },
            { value: 'browse', label: 'Browse All' },
            { value: 'custom', label: 'Paste Text' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSourceType(opt.value)}
              className={`px-4 py-2 rounded-lg border ${
                sourceType === opt.value
                  ? 'border-petrol bg-petrol/5 text-petrol'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {sourceType === 'search' && (
          <div className="space-y-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transcripts..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
              dir="auto"
            />
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTranscript(t)}
                    className={`w-full text-right p-3 rounded-lg border transition-all ${
                      selectedTranscript?.id === t.id
                        ? 'border-petrol bg-petrol/5'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-medium text-slate-800">{t.title}</div>
                    <div className="text-sm text-slate-500">{t.client} - {t.date}</div>
                    {t.snippet && (
                      <div className="text-sm text-slate-600 mt-1 line-clamp-2" dir="auto">{t.snippet}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {sourceType === 'browse' && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {allTranscripts.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTranscript(t)}
                className={`w-full text-right p-3 rounded-lg border transition-all ${
                  selectedTranscript?.id === t.id
                    ? 'border-petrol bg-petrol/5'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-medium text-slate-800">{t.title}</div>
                <div className="text-sm text-slate-500">{t.client} - {t.domain} - {t.date}</div>
              </button>
            ))}
            {allTranscripts.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                No transcripts available. Add transcripts in the RAG tab first.
              </div>
            )}
          </div>
        )}

        {sourceType === 'custom' && (
          <div className="space-y-1">
            <textarea
              value={customText}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CUSTOM_TEXT_LENGTH) {
                  setCustomText(e.target.value)
                }
              }}
              placeholder="Paste your content here..."
              className={`w-full h-48 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-petrol/20 focus:border-petrol resize-none ${
                customText.length > MAX_CUSTOM_TEXT_LENGTH * 0.9 ? 'border-amber-400' : 'border-slate-300'
              }`}
              dir="auto"
            />
            <div className={`text-xs text-right ${
              customText.length > MAX_CUSTOM_TEXT_LENGTH * 0.9 ? 'text-amber-600' : 'text-slate-400'
            }`}>
              {customText.length.toLocaleString()} / {MAX_CUSTOM_TEXT_LENGTH.toLocaleString()} characters
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="secondary" onClick={() => setWizardStep(0)}>Back</Button>
        <Button
          onClick={startGeneration}
          disabled={isGenerating || (sourceType !== 'custom' && !selectedTranscript) || (sourceType === 'custom' && !customText.trim())}
        >
          {isGenerating ? 'Generating...' : 'Generate'}
        </Button>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      {/* Hook selection (if hooks available and no content yet) */}
      {hooks.length > 0 && !generatedContent && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Choose your opening hook</label>
          <div className="space-y-3">
            {hooks.map((hook, index) => (
              <button
                key={index}
                onClick={() => setSelectedHookIndex(index)}
                className={`w-full text-right p-4 rounded-xl border-2 transition-all ${
                  selectedHookIndex === index
                    ? 'border-petrol bg-petrol/5'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <StatusPill tone={index === 0 ? 'success' : 'info'}>
                    {hook.hook_type?.replace('_', ' ')}
                  </StatusPill>
                  <span className="text-sm text-slate-500">Score: {hook.score?.toFixed(1)}</span>
                </div>
                <div className="text-slate-800" dir="auto">{hook.hook_text_hebrew}</div>
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-4">
            <Button variant="secondary" onClick={() => setWizardStep(1)}>Back</Button>
            <Button
              onClick={() => generateWithHook(hooks[selectedHookIndex]?.hook_text_hebrew)}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate Content'}
            </Button>
          </div>
        </div>
      )}

      {/* Generated content review */}
      {generatedContent && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Quality:</span>
              {qualityStatus === 'ready' && <StatusPill tone="success">Ready to publish</StatusPill>}
              {qualityStatus === 'needs_review' && <StatusPill tone="warning">Review suggested</StatusPill>}
            </div>
            <span className="text-sm text-slate-500">{generatedContent.split(/\s+/).length} words</span>
          </div>

          <div
            className="p-4 bg-white border border-slate-200 rounded-xl min-h-[200px] whitespace-pre-wrap text-slate-800"
            dir="auto"
          >
            {generatedContent}
          </div>

          {/* Hook variations */}
          {hooks.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Try different opening:</label>
              <div className="flex flex-wrap gap-2">
                {hooks.map((hook, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedHookIndex(index)
                      generateWithHook(hook.hook_text_hebrew)
                    }}
                    disabled={isGenerating}
                    className={`px-3 py-1 text-sm rounded-full border transition-all ${
                      selectedHookIndex === index
                        ? 'border-petrol bg-petrol/10 text-petrol'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {hook.hook_type?.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button onClick={copyToClipboard}>Copy to Clipboard</Button>
            <Button variant="secondary" onClick={saveContent}>Save Draft</Button>
            <Button
              variant="secondary"
              onClick={() => generateWithHook(hooks[selectedHookIndex]?.hook_text_hebrew || '')}
              disabled={isGenerating}
            >
              Regenerate
            </Button>
            <Button variant="ghost" onClick={resetWizard}>Start Over</Button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
          {error}
        </div>
      )}
    </div>
  )

  // ─────────────────────────────────────────────────────────────
  // Render History Tab
  // ─────────────────────────────────────────────────────────────

  const renderHistory = () => (
    <div className="space-y-4">
      {historyLoading && <div className="text-center py-8 text-slate-500">Loading...</div>}

      {!historyLoading && savedContent.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          No saved content yet. Create your first post!
        </div>
      )}

      {savedContent.map((item) => (
        <div key={item.id} className="p-4 bg-white border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <StatusPill tone={item.status === 'published' ? 'success' : 'info'}>
              {item.status}
            </StatusPill>
            <span className="text-sm text-slate-500">
              {new Date(item.created_at).toLocaleDateString('he-IL')}
            </span>
          </div>
          <div className="text-slate-800 whitespace-pre-wrap line-clamp-4" dir="auto">
            {item.content}
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              variant="ghost"
              onClick={async () => {
                await navigator.clipboard.writeText(item.content)
                showToast('Copied!')
              }}
            >
              Copy
            </Button>
            <Button variant="ghost" onClick={() => deleteContent(item.id)}>Delete</Button>
          </div>
        </div>
      ))}
    </div>
  )

  // ─────────────────────────────────────────────────────────────
  // Main Render
  // ─────────────────────────────────────────────────────────────

  // Show loading state while initial data loads
  if (initialLoading) {
    return (
      <div className="space-y-6">
        <h1 className="heading" data-testid="marketing-title">Marketing Content</h1>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-petrol"></div>
          <span className="ml-3 text-slate-500">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <h1 className="heading" data-testid="marketing-title">Marketing Content</h1>
      </div>

      {/* Tabs - min-h-10 ensures 40px height for touch targets */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('create')}
          className={`min-h-10 pb-2 px-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'create'
              ? 'border-petrol text-petrol'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Create
        </button>
        <button
          onClick={() => { setActiveTab('history'); loadSavedContent() }}
          className={`min-h-10 pb-2 px-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-petrol text-petrol'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          History ({savedContent.length})
        </button>
      </div>

      {activeTab === 'create' && (
        <SectionCard
          title="Create Marketing Content"
          subtitle="Generate LinkedIn posts from your transcripts"
        >
          <StepIndicator
            currentStep={wizardStep}
            steps={['Format', 'Source', 'Review']}
          />
          {wizardStep === 0 && renderStep0()}
          {wizardStep === 1 && renderStep1()}
          {wizardStep === 2 && renderStep2()}
        </SectionCard>
      )}

      {activeTab === 'history' && (
        <SectionCard
          title="Saved Content"
          subtitle="Your generated marketing content"
        >
          {renderHistory()}
        </SectionCard>
      )}
    </div>
  )
}
