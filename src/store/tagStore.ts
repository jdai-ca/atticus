import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    TagMetadata,
    TagCategory,
    TagRelationship,
    TagUsageStats,
    TagFilterPreset,
    TagStore as TagStoreType,
    TagSuggestion
} from '../types/tags';

/**
 * Zustand store for managing tags, relationships, and metadata
 */
interface TagStoreState extends TagStoreType {
    // Actions
    addTag: (tag: TagMetadata) => void;
    removeTag: (tagId: string) => void;
    updateTag: (tagId: string, updates: Partial<TagMetadata>) => void;
    incrementTagUsage: (tagId: string) => void;
    addRecentTag: (tagId: string) => void;
    toggleFavoriteTag: (tagId: string) => void;

    // Relationship management
    addRelationship: (relationship: TagRelationship) => void;
    removeRelationship: (sourceId: string, targetId: string) => void;
    getRelatedTags: (tagId: string) => string[];

    // Usage statistics
    updateUsageStats: (tagId: string, updates: Partial<TagUsageStats>) => void;
    getTopTags: (limit: number) => TagMetadata[];
    getTagsByCategory: (category: TagCategory) => TagMetadata[];

    // Filter presets
    addFilterPreset: (preset: TagFilterPreset) => void;
    removeFilterPreset: (presetId: string) => void;

    // Search & suggestions
    searchTags: (query: string) => TagMetadata[];
    generateSuggestions: (messageContent: string, existingTags: string[]) => TagSuggestion[];

    // Initialization
    initializeSystemTags: (practiceAreas: any[], advisoryAreas: any[]) => void;
}

/**
 * Helper function to normalize tag IDs
 */
const normalizeTagId = (input: string): string => {
    return input.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

/**
 * Helper function to extract keywords for suggestion matching
 */
const extractKeywords = (text: string): string[] => {
    // Remove common words and extract meaningful terms
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const words = text.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && !commonWords.has(w));
    return Array.from(new Set(words));
};

export const useTagStore = create<TagStoreState>()(
    persist(
        (set, get) => ({
            // Initial state
            tags: new Map(),
            relationships: [],
            usageStats: new Map(),
            filterPresets: [],
            recentTags: [],
            favoriteTags: [],

            // Add a new tag
            addTag: (tag: TagMetadata) => {
                set((state) => {
                    const newTags = new Map(state.tags);
                    newTags.set(tag.id, tag);

                    // Initialize usage stats
                    const newStats = new Map(state.usageStats);
                    if (!newStats.has(tag.id)) {
                        newStats.set(tag.id, {
                            tagId: tag.id,
                            totalMessages: 0,
                            totalConversations: 0,
                            lastUsed: new Date().toISOString(),
                            coOccurrenceTags: new Map(),
                        });
                    }

                    return { tags: newTags, usageStats: newStats };
                });
            },

            // Remove a tag
            removeTag: (tagId: string) => {
                set((state) => {
                    const newTags = new Map(state.tags);
                    newTags.delete(tagId);

                    const newStats = new Map(state.usageStats);
                    newStats.delete(tagId);

                    // Remove from recent and favorites
                    const newRecentTags = state.recentTags.filter(id => id !== tagId);
                    const newFavoriteTags = state.favoriteTags.filter(id => id !== tagId);

                    // Remove relationships
                    const newRelationships = state.relationships.filter(
                        r => r.sourceTagId !== tagId && r.targetTagId !== tagId
                    );

                    return {
                        tags: newTags,
                        usageStats: newStats,
                        recentTags: newRecentTags,
                        favoriteTags: newFavoriteTags,
                        relationships: newRelationships
                    };
                });
            },

            // Update tag metadata
            updateTag: (tagId: string, updates: Partial<TagMetadata>) => {
                set((state) => {
                    const newTags = new Map(state.tags);
                    const existingTag = newTags.get(tagId);
                    if (existingTag) {
                        newTags.set(tagId, { ...existingTag, ...updates });
                    }
                    return { tags: newTags };
                });
            },

            // Increment usage count
            incrementTagUsage: (tagId: string) => {
                set((state) => {
                    const newTags = new Map(state.tags);
                    const tag = newTags.get(tagId);
                    if (tag) {
                        newTags.set(tagId, { ...tag, usageCount: tag.usageCount + 1 });
                    }

                    const newStats = new Map(state.usageStats);
                    const stats = newStats.get(tagId);
                    if (stats) {
                        newStats.set(tagId, {
                            ...stats,
                            totalMessages: stats.totalMessages + 1,
                            lastUsed: new Date().toISOString()
                        });
                    }

                    return { tags: newTags, usageStats: newStats };
                });
            },

            // Add to recent tags
            addRecentTag: (tagId: string) => {
                set((state) => {
                    const newRecentTags = [tagId, ...state.recentTags.filter(id => id !== tagId)].slice(0, 20);
                    return { recentTags: newRecentTags };
                });
            },

            // Toggle favorite status
            toggleFavoriteTag: (tagId: string) => {
                set((state) => {
                    const newTags = new Map(state.tags);
                    const tag = newTags.get(tagId);
                    if (tag) {
                        const isFavorite = !tag.isFavorite;
                        newTags.set(tagId, { ...tag, isFavorite });

                        const newFavoriteTags = isFavorite
                            ? [...state.favoriteTags, tagId]
                            : state.favoriteTags.filter(id => id !== tagId);

                        return { tags: newTags, favoriteTags: newFavoriteTags };
                    }
                    return state;
                });
            },

            // Add relationship between tags
            addRelationship: (relationship: TagRelationship) => {
                set((state) => {
                    const newRelationships = [...state.relationships, relationship];
                    return { relationships: newRelationships };
                });
            },

            // Remove relationship
            removeRelationship: (sourceId: string, targetId: string) => {
                set((state) => {
                    const newRelationships = state.relationships.filter(
                        r => !(r.sourceTagId === sourceId && r.targetTagId === targetId)
                    );
                    return { relationships: newRelationships };
                });
            },

            // Get related tags
            getRelatedTags: (tagId: string): string[] => {
                const state = get();
                const related = new Set<string>();

                state.relationships.forEach(r => {
                    if (r.sourceTagId === tagId) {
                        related.add(r.targetTagId);
                    } else if (r.targetTagId === tagId && r.relationshipType !== 'parent-child') {
                        related.add(r.sourceTagId);
                    }
                });

                return Array.from(related);
            },

            // Update usage statistics
            updateUsageStats: (tagId: string, updates: Partial<TagUsageStats>) => {
                set((state) => {
                    const newStats = new Map(state.usageStats);
                    const existingStats = newStats.get(tagId);
                    if (existingStats) {
                        newStats.set(tagId, { ...existingStats, ...updates });
                    }
                    return { usageStats: newStats };
                });
            },

            // Get top tags by usage
            getTopTags: (limit: number): TagMetadata[] => {
                const state = get();
                return Array.from(state.tags.values())
                    .sort((a, b) => b.usageCount - a.usageCount)
                    .slice(0, limit);
            },

            // Get tags by category
            getTagsByCategory: (category: TagCategory): TagMetadata[] => {
                const state = get();
                return Array.from(state.tags.values()).filter(tag => tag.category === category);
            },

            // Add filter preset
            addFilterPreset: (preset: TagFilterPreset) => {
                set((state) => {
                    const newPresets = [...state.filterPresets, preset];
                    return { filterPresets: newPresets };
                });
            },

            // Remove filter preset
            removeFilterPreset: (presetId: string) => {
                set((state) => {
                    const newPresets = state.filterPresets.filter(p => p.id !== presetId);
                    return { filterPresets: newPresets };
                });
            },

            // Search tags
            searchTags: (query: string): TagMetadata[] => {
                const state = get();
                const lowerQuery = query.toLowerCase();

                return Array.from(state.tags.values()).filter(tag =>
                    tag.id.includes(lowerQuery) ||
                    tag.label.toLowerCase().includes(lowerQuery) ||
                    tag.description?.toLowerCase().includes(lowerQuery) ||
                    tag.aliases?.some(alias => alias.toLowerCase().includes(lowerQuery))
                );
            },

            // Generate AI suggestions based on content
            generateSuggestions: (messageContent: string, existingTags: string[]): TagSuggestion[] => {
                const state = get();
                const keywords = extractKeywords(messageContent);
                const suggestions: TagSuggestion[] = [];
                const contentLower = messageContent.toLowerCase();

                // Rule-based suggestions
                state.tags.forEach(tag => {
                    if (existingTags.includes(tag.id)) return; // Skip already applied tags
                    if (tag.isSystemTag) return; // Skip practice/advisory area tags

                    let confidence = 0;
                    let matchReasons: string[] = [];

                    // Check if tag keywords match content
                    if (tag.description) {
                        const tagKeywords = extractKeywords(tag.description);
                        const matchingKeywords = tagKeywords.filter(kw => keywords.includes(kw));
                        if (matchingKeywords.length > 0) {
                            confidence += matchingKeywords.length * 0.15;
                            matchReasons.push(`Matches keywords: ${matchingKeywords.slice(0, 3).join(', ')}`);
                        }
                    }

                    // Check if tag label appears in content
                    if (contentLower.includes(tag.label.toLowerCase())) {
                        confidence += 0.4;
                        matchReasons.push('Tag name mentioned in content');
                    }

                    // Check aliases
                    if (tag.aliases) {
                        const matchingAliases = tag.aliases.filter(alias =>
                            contentLower.includes(alias.toLowerCase())
                        );
                        if (matchingAliases.length > 0) {
                            confidence += 0.3;
                            matchReasons.push(`Alias mentioned: ${matchingAliases[0]}`);
                        }
                    }

                    // Boost frequently used tags slightly
                    if (tag.usageCount > 10) {
                        confidence += 0.05;
                    }

                    // Boost favorite tags
                    if (tag.isFavorite) {
                        confidence += 0.1;
                    }

                    if (confidence > 0.3) {
                        suggestions.push({
                            tagId: tag.id,
                            confidence: Math.min(confidence, 0.95),
                            reason: matchReasons.join('; '),
                            source: 'rule'
                        });
                    }
                });

                // Sort by confidence
                suggestions.sort((a, b) => b.confidence - a.confidence);

                return suggestions.slice(0, 5);
            },

            // Initialize system tags from practice and advisory areas
            initializeSystemTags: (practiceAreas: any[], advisoryAreas: any[]) => {
                set((state) => {
                    const newTags = new Map(state.tags);

                    // Add practice areas as system tags
                    practiceAreas.forEach(area => {
                        const tagId = area.id || normalizeTagId(area.name);
                        if (!newTags.has(tagId)) {
                            newTags.set(tagId, {
                                id: tagId,
                                label: area.name,
                                category: 'subject-matter',
                                description: area.description,
                                color: area.color || '#3B82F6',
                                icon: '⚖️',
                                createdAt: new Date().toISOString(),
                                usageCount: 0,
                                isSystemTag: true
                            });
                        }
                    });

                    // Add advisory areas as system tags
                    advisoryAreas.forEach(area => {
                        const tagId = area.id || normalizeTagId(area.name);
                        if (!newTags.has(tagId)) {
                            newTags.set(tagId, {
                                id: tagId,
                                label: area.name,
                                category: 'subject-matter',
                                description: area.description,
                                color: area.color || '#F59E0B',
                                icon: '💼',
                                createdAt: new Date().toISOString(),
                                usageCount: 0,
                                isSystemTag: true
                            });
                        }
                    });

                    return { tags: newTags };
                });
            }
        }),
        {
            name: 'atticus-tag-store',
            // Custom serialization to handle Map objects
            partialize: (state) => ({
                tags: Array.from(state.tags.entries()),
                relationships: state.relationships,
                usageStats: Array.from(state.usageStats.entries()),
                filterPresets: state.filterPresets,
                recentTags: state.recentTags,
                favoriteTags: state.favoriteTags
            }),
            // Custom deserialization
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // Convert arrays back to Maps
                    state.tags = new Map(state.tags as any);
                    state.usageStats = new Map(state.usageStats as any);
                }
            }
        }
    )
);
