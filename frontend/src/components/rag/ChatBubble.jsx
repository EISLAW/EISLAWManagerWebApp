import React from 'react'

function ChatBubble({ segment, index, isEven, onTextChange, onSpeakerChange, onDelete, audioRef }) {
  const parseTime = (timeStr) => {
    if (!timeStr) return 0
    const parts = timeStr.split(':').map(Number)
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return 0
  }

  const handleClick = () => {
    if (segment.start && audioRef?.current) {
      const seconds = parseTime(segment.start)
      audioRef.current.currentTime = seconds
      audioRef.current.play()
    }
  }

  return (
    <div
      className={`flex ${isEven ? 'justify-start' : 'justify-end'} mb-3`}
      data-testid={`rag.reviewer.segment.${index}`}
    >
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm cursor-pointer transition-all hover:shadow-md ${
          isEven
            ? 'bg-white border border-slate-200 rounded-tl-sm'
            : 'bg-petrol/10 border border-petrol/20 rounded-tr-sm'
        }`}
        onClick={handleClick}
        title={segment.start ? `Click to play from ${segment.start}` : 'No timestamp'}
        data-action="segment.play"
      >
        <div className="flex items-center gap-2 mb-1">
          <input
            className="text-xs font-semibold text-petrol bg-transparent border-b border-transparent hover:border-slate-300 focus:border-petrol focus:outline-none px-1 py-0.5 min-w-[60px]"
            value={segment.speaker || ''}
            onChange={(e) => onSpeakerChange(index, e.target.value)}
            placeholder="Speaker"
            onClick={(e) => e.stopPropagation()}
            data-testid={`rag.reviewer.segment.${index}.speaker`}
          />
          {segment.start && (
            <span className="text-xs text-slate-400">{segment.start}</span>
          )}
          <button
            type="button"
            className="ml-auto text-rose-500 hover:text-rose-700 p-1 min-h-[28px] min-w-[28px] flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); onDelete(index) }}
            title="Delete segment"
            data-testid={`rag.reviewer.segment.${index}.delete`}
            data-action="segment.delete"
          >
            ×
          </button>
        </div>
        <textarea
          className="w-full bg-transparent text-sm text-slate-700 resize-none focus:outline-none focus:ring-1 focus:ring-petrol/30 rounded px-1 py-1"
          value={segment.text || ''}
          onChange={(e) => onTextChange(index, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          rows={Math.max(2, Math.ceil((segment.text || '').length / 50))}
          data-testid={`rag.reviewer.segment.${index}.text`}
        />
      </div>
    </div>
  )
}

export default ChatBubble
