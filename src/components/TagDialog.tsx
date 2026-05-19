import { Conversation } from "../types";

interface TagDialogProps {
  currentConversation: Conversation;
  tagDialogClusterStart: number;
  tagDialogClusterEnd: number;
  existingTags: string[];
  newTagInput: string;
  onNewTagInputChange: (value: string) => void;
  onTagToggle: (tag: string) => void;
  onAddNewTag: () => void;
  onClose: () => void;
}

export default function TagDialog({
  currentConversation,
  tagDialogClusterStart,
  tagDialogClusterEnd,
  existingTags,
  newTagInput,
  onNewTagInputChange,
  onTagToggle,
  onAddNewTag,
  onClose,
}: TagDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-xl">🏷️</span> Manage Tags
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            title="Close tag dialog"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Existing Tags */}
          {existingTags.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-300 mb-2">
                Existing Tags
              </div>
              <div className="flex flex-wrap gap-2">
                {existingTags.map((tag): JSX.Element => {
                  const isActive = currentConversation.messages
                    .slice(tagDialogClusterStart, tagDialogClusterEnd + 1)
                    .some((msg): boolean => Boolean(msg.tags?.includes(tag)));

                  return (
                    <button
                      key={tag}
                      onClick={() => onTagToggle(tag)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-legal-blue text-white border-2 border-legal-blue"
                          : "bg-gray-700 text-gray-300 border-2 border-gray-600 hover:border-gray-500"
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add New Tag */}
          <div>
            <label
              htmlFor="new-tag-input"
              className="text-sm font-medium text-gray-300 mb-2 block"
            >
              Add New Tag
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  #
                </span>
                <input
                  id="new-tag-input"
                  type="text"
                  value={newTagInput}
                  onChange={(e) => onNewTagInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onAddNewTag();
                    }
                  }}
                  placeholder="tag-name"
                  className="w-full bg-gray-700 text-white rounded-lg pl-8 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-legal-blue"
                />
              </div>
              <button
                onClick={onAddNewTag}
                disabled={!newTagInput.trim()}
                className="px-4 py-2 bg-legal-blue hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Tags help organize and search conversations
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
