import { Paperclip, Send } from "lucide-react";
import type { AttachmentMeta } from "../types";

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  attachments: AttachmentMeta[];
  onAttachmentRemove: (id: string) => void;
  onFileUpload: () => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  attachmentDataRef: React.MutableRefObject<Map<string, string>>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export default function ChatInput({
  input,
  onInputChange,
  attachments,
  onAttachmentRemove,
  onFileUpload,
  onSend,
  onKeyDown,
  isLoading,
  attachmentDataRef,
  textareaRef,
}: ChatInputProps) {
  return (
    <div className="border-t border-gray-700 bg-gray-800 p-4 relative z-10">
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((att): JSX.Element => (
            <div
              key={att.id || att.name}
              className="bg-gray-700 px-3 py-1 rounded-full text-xs flex items-center gap-2"
            >
              <Paperclip className="w-3 h-3" />
              <span>{att.name}</span>
              <button
                onClick={() => {
                  attachmentDataRef.current.delete(att.id);
                  onAttachmentRemove(att.id);
                }}
                className="text-red-400 hover:text-red-300"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onFileUpload}
          disabled={isLoading}
          className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          title="Upload Document"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          onMouseDown={(e) => {
            // Ensure focus happens on mouse down
            e.currentTarget.focus();
          }}
          placeholder="Ask a legal/business question..."
          className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-legal-blue resize-none cursor-text"
          rows={3}
          tabIndex={0}
          autoComplete="off"
        />

        <button
          onClick={onSend}
          disabled={!input.trim() || isLoading}
          className="p-3 bg-legal-blue hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Send Message"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
