import React, { useState, useEffect, useRef } from "react";
import { X, Tag, Search, Star, TrendingUp, Grid, Network } from "lucide-react";
import {
  TagMetadata,
  TagCategory,
  TagSuggestion,
  TagAutocompleteResult,
} from "../types/tags";

interface TagManagerProps {
  messageId: string;
  existingTags: string[];
  allAvailableTags: Map<string, TagMetadata>;
  recentTags?: string[];
  suggestedTags?: TagSuggestion[];
  onAddTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
  onCreateTag?: (tagId: string, category: TagCategory) => void;
  onClose: () => void;
  compact?: boolean; // Compact mode for inline use
}

const TAG_CATEGORY_CONFIG: Record<
  TagCategory,
  { label: string; icon: string; color: string }
> = {
  "content-type": { label: "Content Type", icon: "📄", color: "blue" },
  "subject-matter": { label: "Subject", icon: "📚", color: "purple" },
  quality: { label: "Quality", icon: "⭐", color: "yellow" },
  workflow: { label: "Workflow", icon: "🔄", color: "green" },
  priority: { label: "Priority", icon: "🔥", color: "red" },
  client: { label: "Client", icon: "👤", color: "cyan" },
  project: { label: "Project", icon: "📁", color: "indigo" },
  jurisdiction: { label: "Jurisdiction", icon: "⚖️", color: "gray" },
  research: { label: "Research", icon: "🔬", color: "pink" },
  custom: { label: "Custom", icon: "🏷️", color: "gray" },
};

const COLOR_MAP: Record<
  string,
  { bg: string; text: string; border: string; hover: string }
> = {
  blue: {
    bg: "bg-blue-900/30",
    text: "text-blue-300",
    border: "border-blue-700",
    hover: "hover:bg-blue-900/50",
  },
  purple: {
    bg: "bg-purple-900/30",
    text: "text-purple-300",
    border: "border-purple-700",
    hover: "hover:bg-purple-900/50",
  },
  yellow: {
    bg: "bg-yellow-900/30",
    text: "text-yellow-300",
    border: "border-yellow-700",
    hover: "hover:bg-yellow-900/50",
  },
  green: {
    bg: "bg-green-900/30",
    text: "text-green-300",
    border: "border-green-700",
    hover: "hover:bg-green-900/50",
  },
  red: {
    bg: "bg-red-900/30",
    text: "text-red-300",
    border: "border-red-700",
    hover: "hover:bg-red-900/50",
  },
  cyan: {
    bg: "bg-cyan-900/30",
    text: "text-cyan-300",
    border: "border-cyan-700",
    hover: "hover:bg-cyan-900/50",
  },
  indigo: {
    bg: "bg-indigo-900/30",
    text: "text-indigo-300",
    border: "border-indigo-700",
    hover: "hover:bg-indigo-900/50",
  },
  gray: {
    bg: "bg-gray-700/30",
    text: "text-gray-300",
    border: "border-gray-600",
    hover: "hover:bg-gray-700/50",
  },
  pink: {
    bg: "bg-pink-900/30",
    text: "text-pink-300",
    border: "border-pink-700",
    hover: "hover:bg-pink-900/50",
  },
};

export const TagManager: React.FC<TagManagerProps> = ({
  messageId,
  existingTags,
  allAvailableTags,
  recentTags = [],
  suggestedTags = [],
  onAddTag,
  onRemoveTag,
  onCreateTag,
  onClose,
  compact = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TagCategory | "all">(
    "all"
  );
  const [autocompleteResults, setAutocompleteResults] = useState<
    TagAutocompleteResult[]
  >([]);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newTagCategory, setNewTagCategory] = useState<TagCategory>("custom");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchInputRef.current && !compact) {
      searchInputRef.current.focus();
    }
  }, [compact]);

  // Autocomplete logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setAutocompleteResults([]);
      setShowCreateNew(false);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results: TagAutocompleteResult[] = [];

    allAvailableTags.forEach((tag) => {
      if (existingTags.includes(tag.id)) return; // Skip already applied tags

      let matchType: TagAutocompleteResult["matchType"] | null = null;
      let relevanceScore = 0;

      // Exact match
      if (tag.id === query || tag.label.toLowerCase() === query) {
        matchType = "exact";
        relevanceScore = 1.0;
      }
      // Prefix match
      else if (
        tag.id.startsWith(query) ||
        tag.label.toLowerCase().startsWith(query)
      ) {
        matchType = "prefix";
        relevanceScore = 0.8;
      }
      // Alias match
      else if (
        tag.aliases?.some((alias) => alias.toLowerCase().includes(query))
      ) {
        matchType = "alias";
        relevanceScore = 0.7;
      }
      // Fuzzy match (contains)
      else if (
        tag.id.includes(query) ||
        tag.label.toLowerCase().includes(query)
      ) {
        matchType = "fuzzy";
        relevanceScore = 0.5;
      }

      if (matchType) {
        // Boost score for frequently used tags
        relevanceScore += (tag.usageCount / 1000) * 0.2;
        // Boost score for favorite tags
        if (tag.isFavorite) relevanceScore += 0.1;

        results.push({ tag, matchType, relevanceScore });
      }
    });

    // Sort by relevance
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    setAutocompleteResults(results.slice(0, 10));

    // Show "Create New" option if no exact match
    const hasExactMatch = results.some((r) => r.matchType === "exact");
    setShowCreateNew(!hasExactMatch && query.length >= 2);
  }, [searchQuery, allAvailableTags, existingTags]);

  const handleAddTag = (tagId: string) => {
    onAddTag(tagId);
    setSearchQuery("");
    setAutocompleteResults([]);
  };

  const handleCreateNewTag = () => {
    if (searchQuery.trim() && onCreateTag) {
      const tagId = searchQuery
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      onCreateTag(tagId, newTagCategory);
      setSearchQuery("");
      setShowCreateNew(false);
    }
  };

  const getTagColor = (tag: TagMetadata): string => {
    const categoryConfig = TAG_CATEGORY_CONFIG[tag.category];
    return categoryConfig?.color || "gray";
  };

  const getTagStyles = (colorName: string) => {
    return COLOR_MAP[colorName] || COLOR_MAP.gray;
  };

  // Get tags to display based on selected category
  const getFilteredTags = () => {
    const tagsArray = Array.from(allAvailableTags.values());
    if (selectedCategory === "all") {
      return tagsArray.filter((t) => existingTags.includes(t.id));
    }
    return tagsArray.filter(
      (t) => existingTags.includes(t.id) && t.category === selectedCategory
    );
  };

  // Group suggestions by confidence
  const highConfidenceSuggestions = suggestedTags.filter(
    (s) => s.confidence >= 0.7
  );
  const mediumConfidenceSuggestions = suggestedTags.filter(
    (s) => s.confidence >= 0.4 && s.confidence < 0.7
  );

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {/* Existing tags */}
        {existingTags.map((tagId) => {
          const tag = allAvailableTags.get(tagId);
          if (!tag) return null;
          const colorName = getTagColor(tag);
          const styles = getTagStyles(colorName);
          const categoryConfig = TAG_CATEGORY_CONFIG[tag.category];

          return (
            <div
              key={tagId}
              className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${styles.bg} ${styles.text} ${styles.border} transition-all`}
            >
              <span className="text-xs">{categoryConfig.icon}</span>
              <span className="text-xs font-medium">{tag.label}</span>
              <button
                onClick={() => onRemoveTag(tagId)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400 ml-1"
                title="Remove tag"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* Add tag button */}
        <button
          onClick={() => {
            /* Could open full dialog */
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-md border border-dashed border-gray-600 hover:border-gray-500 transition-colors"
          title="Add tag"
        >
          <Tag className="w-3 h-3" />
          <span>Add tag</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900/50">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-legal-gold" />
          <h3 className="text-lg font-semibold text-white">Tag Manager</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search bar */}
      <div className="p-4 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && autocompleteResults.length > 0) {
                handleAddTag(autocompleteResults[0].tag.id);
              } else if (e.key === "Escape") {
                setSearchQuery("");
              }
            }}
            placeholder="Search or create tags..."
            className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-legal-blue"
          />
        </div>

        {/* Autocomplete dropdown */}
        {autocompleteResults.length > 0 && (
          <div className="mt-2 bg-gray-700 rounded-lg border border-gray-600 max-h-64 overflow-y-auto">
            {autocompleteResults.map(({ tag, matchType, relevanceScore }) => {
              const colorName = getTagColor(tag);
              const styles = getTagStyles(colorName);
              const categoryConfig = TAG_CATEGORY_CONFIG[tag.category];

              return (
                <button
                  key={tag.id}
                  onClick={() => handleAddTag(tag.id)}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-600 transition-colors flex items-center justify-between group`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm">{categoryConfig.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {tag.label}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {categoryConfig.label} • Used {tag.usageCount} times
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {tag.isFavorite && (
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${styles.bg} ${styles.text} ${styles.border} border`}
                    >
                      {Math.round(relevanceScore * 100)}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Create new tag option */}
        {showCreateNew && (
          <div className="mt-2 bg-gray-700 rounded-lg border border-dashed border-gray-600 p-3">
            <div className="text-sm text-gray-300 mb-2">
              Create new tag:{" "}
              <span className="font-semibold text-white">#{searchQuery}</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={newTagCategory}
                onChange={(e) =>
                  setNewTagCategory(e.target.value as TagCategory)
                }
                className="flex-1 bg-gray-600 text-white text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-legal-blue"
              >
                {Object.entries(TAG_CATEGORY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.icon} {config.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCreateNewTag}
                className="px-3 py-1 bg-legal-blue hover:bg-blue-700 text-white text-xs rounded transition-colors font-medium"
              >
                Create
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Category filter tabs */}
      <div className="px-4 py-2 border-b border-gray-700 bg-gray-900/30 overflow-x-auto">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap ${
              selectedCategory === "all"
                ? "bg-legal-blue text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            All Tags
          </button>
          {Object.entries(TAG_CATEGORY_CONFIG).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key as TagCategory)}
              className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap ${
                selectedCategory === key
                  ? "bg-legal-blue text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {config.icon} {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {/* AI Suggestions */}
        {highConfidenceSuggestions.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span>AI Suggestions (High Confidence)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {highConfidenceSuggestions.map(
                ({ tagId, confidence, reason }) => {
                  const tag = allAvailableTags.get(tagId);
                  if (!tag || existingTags.includes(tagId)) return null;
                  const colorName = getTagColor(tag);
                  const styles = getTagStyles(colorName);
                  const categoryConfig = TAG_CATEGORY_CONFIG[tag.category];

                  return (
                    <button
                      key={tagId}
                      onClick={() => handleAddTag(tagId)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border ${styles.bg} ${styles.text} ${styles.border} ${styles.hover} transition-all group`}
                      title={reason}
                    >
                      <span className="text-xs">{categoryConfig.icon}</span>
                      <span className="text-xs font-medium">{tag.label}</span>
                      <span className="text-xs opacity-60">
                        {Math.round(confidence * 100)}%
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* Recent tags */}
        {recentTags.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Grid className="w-4 h-4 text-blue-400" />
              <span>Recently Used</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentTags.slice(0, 8).map((tagId) => {
                const tag = allAvailableTags.get(tagId);
                if (!tag || existingTags.includes(tagId)) return null;
                const colorName = getTagColor(tag);
                const styles = getTagStyles(colorName);
                const categoryConfig = TAG_CATEGORY_CONFIG[tag.category];

                return (
                  <button
                    key={tagId}
                    onClick={() => handleAddTag(tagId)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border ${styles.bg} ${styles.text} ${styles.border} ${styles.hover} transition-all`}
                  >
                    <span className="text-xs">{categoryConfig.icon}</span>
                    <span className="text-xs font-medium">{tag.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Applied tags */}
        {existingTags.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Tag className="w-4 h-4 text-legal-gold" />
              <span>Applied Tags ({existingTags.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {getFilteredTags().map((tag) => {
                const colorName = getTagColor(tag);
                const styles = getTagStyles(colorName);
                const categoryConfig = TAG_CATEGORY_CONFIG[tag.category];

                return (
                  <div
                    key={tag.id}
                    className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border ${styles.bg} ${styles.text} ${styles.border} transition-all`}
                  >
                    <span className="text-xs">{categoryConfig.icon}</span>
                    <span className="text-xs font-medium">{tag.label}</span>
                    <button
                      onClick={() => onRemoveTag(tag.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400 ml-1"
                      title="Remove tag"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {existingTags.length === 0 &&
          highConfidenceSuggestions.length === 0 &&
          recentTags.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No tags applied yet</p>
              <p className="text-xs mt-1">
                Search or browse categories to add tags
              </p>
            </div>
          )}
      </div>

      {/* Footer with actions */}
      <div className="px-4 py-3 border-t border-gray-700 bg-gray-900/30 flex items-center justify-between">
        <div className="text-xs text-gray-400">
          {existingTags.length} tag{existingTags.length !== 1 ? "s" : ""}{" "}
          applied
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};
