import { useState, useRef, useCallback } from 'react';

interface ComposeBarProps {
  onSend: (body: string) => void;
  disabled?: boolean;
}

export default function ComposeBar({ onSend, disabled }: ComposeBarProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }, [text, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter sends, Shift+Enter for newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-grow textarea
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <div className="flex items-end gap-2 px-4 py-3 bg-[var(--color-surface-1)] border-t border-white/5">
      {/* Attachment button */}
      <button
        className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] transition-colors"
        aria-label="Attach file"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
        </svg>
      </button>

      {/* Text input */}
      <textarea
        ref={inputRef}
        value={text}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        placeholder="Message…"
        className="
          flex-1 resize-none bg-[var(--color-surface-2)] rounded-2xl
          px-4 py-2.5 text-[15px] text-[var(--color-text-primary)]
          placeholder:text-[var(--color-text-muted)]
          outline-none focus:ring-1 focus:ring-[var(--color-amber-500)]/30
          transition-shadow
          max-h-[120px]
          disabled:opacity-40
        "
      />

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!canSend}
        className={`
          shrink-0 w-10 h-10 flex items-center justify-center rounded-full
          transition-all duration-200
          ${canSend
            ? 'bg-[var(--color-amber-500)] text-[var(--color-surface-0)] scale-100 hover:bg-[var(--color-amber-400)]'
            : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] scale-90'
          }
        `}
        aria-label="Send message"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>
  );
}
