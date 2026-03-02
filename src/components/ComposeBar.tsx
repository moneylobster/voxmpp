import { useState, useRef, useCallback } from 'react';

interface ComposeBarProps {
  onSend: (body: string) => void;
  onFileSelect?: (file: File) => void;
  disabled?: boolean;
}

export default function ComposeBar({ onSend, onFileSelect, disabled }: ComposeBarProps) {
  const [text, setText] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onFileSelect) return;

    setPendingFile(file);
    setUploading(true);
    try {
      await onFileSelect(file);
    } finally {
      setUploading(false);
      setPendingFile(null);
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <div className="bg-[var(--color-surface-1)] border-t border-white/5">
      {/* File upload preview */}
      {pendingFile && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <div className="flex items-center gap-2 bg-[var(--color-surface-2)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-secondary)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="truncate max-w-[200px]">{pendingFile.name}</span>
            {uploading && (
              <svg className="animate-spin w-4 h-4 text-[var(--color-amber-500)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 019.95 9" />
              </svg>
            )}
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 px-4 py-3">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
        />

        {/* Attachment button */}
        <button
          onClick={handleAttachClick}
          disabled={disabled || uploading || !onFileSelect}
          className={`
            shrink-0 w-10 h-10 flex items-center justify-center rounded-full
            transition-colors
            ${uploading
              ? 'text-[var(--color-amber-500)] animate-pulse'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]'
            }
            disabled:opacity-40
          `}
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
    </div>
  );
}
