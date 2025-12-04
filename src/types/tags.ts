/**
 * Tag System Types
 * 
 * Foundation for knowledge graph navigation and sophisticated tag management.
 * Supports hierarchical relationships, metadata, and cross-referencing.
 */

/**
 * Tag Category - Organizes tags into logical groups
 */
export type TagCategory =
    | 'content-type'      // Document types: contract, memo, brief, motion, etc.
    | 'subject-matter'    // Topics: m-a, securities, employment, etc.
    | 'quality'          // Quality markers: excellent, needs-review, verified, etc.
    | 'workflow'         // Process stages: draft, review, final, archived, etc.
    | 'priority'         // Importance: urgent, high, normal, low, etc.
    | 'client'           // Client-specific tags: client-acme, client-xyz, etc.
    | 'project'          // Project/matter tags: project-alpha, matter-12345, etc.
    | 'jurisdiction'     // Geographic: federal, state-ny, international, etc.
    | 'research'         // Research types: case-law, statute, regulation, etc.
    | 'custom';          // User-defined tags that don't fit other categories

/**
 * Tag Metadata - Rich information about each tag
 */
export interface TagMetadata {
    id: string;                    // Unique tag identifier (normalized: lowercase, hyphenated)
    label: string;                 // Display name (e.g., "Contract Review")
    category: TagCategory;         // Logical grouping
    description?: string;          // Optional detailed description
    color?: string;                // Hex color for visual distinction
    icon?: string;                 // Optional emoji or icon identifier
    createdAt: string;             // ISO timestamp when tag was first used
    usageCount: number;            // Number of times tag has been applied
    relatedTags?: string[];        // IDs of semantically related tags
    parentTag?: string;            // ID of parent tag (for hierarchies)
    childTags?: string[];          // IDs of child tags (for hierarchies)
    aliases?: string[];            // Alternative names (e.g., "M&A" for "mergers-acquisitions")
    isSystemTag: boolean;          // True for practice/advisory area tags
    isFavorite?: boolean;          // User-favorited tags for quick access
}

/**
 * Tag Suggestion - AI or rule-based tag recommendations
 */
export interface TagSuggestion {
    tagId: string;
    confidence: number;            // 0.0 to 1.0 confidence score
    reason: string;                // Explanation for suggestion
    source: 'ai' | 'rule' | 'frequency' | 'related';
}

/**
 * Tag Relationship - Explicit connections between tags
 */
export interface TagRelationship {
    sourceTagId: string;
    targetTagId: string;
    relationshipType: 'parent-child' | 'related' | 'synonym' | 'opposite' | 'see-also';
    strength?: number;             // Optional relationship strength (0.0 to 1.0)
    createdAt: string;
}

/**
 * Tag Usage Analytics - Track how tags are used over time
 */
export interface TagUsageStats {
    tagId: string;
    totalMessages: number;         // Messages tagged with this
    totalConversations: number;    // Conversations tagged with this
    lastUsed: string;              // ISO timestamp of last use
    averageMessageLength?: number; // Average length of tagged messages
    coOccurrenceTags: Map<string, number>; // Tags frequently used together
    usageByPracticeArea?: Map<string, number>; // Usage distribution across practice areas
    usageByAdvisoryArea?: Map<string, number>; // Usage distribution across advisory areas
    trendDirection?: 'increasing' | 'stable' | 'decreasing';
}

/**
 * Tag Filter Preset - Saved tag combinations for quick filtering
 */
export interface TagFilterPreset {
    id: string;
    name: string;
    description?: string;
    tagIds: string[];              // Tags in this preset
    logicalOperator: 'AND' | 'OR'; // How to combine tags
    createdAt: string;
    lastUsed?: string;
    usageCount: number;
}

/**
 * Tag Autocomplete Result - For intelligent tag suggestions
 */
export interface TagAutocompleteResult {
    tag: TagMetadata;
    matchType: 'exact' | 'prefix' | 'fuzzy' | 'alias';
    relevanceScore: number;
}

/**
 * Enhanced Message with Tag Metadata
 * (Extends the existing Message interface conceptually)
 */
export interface TaggedMessageMetadata {
    messageId: string;
    tags: string[];                // Tag IDs
    taggedAt: Map<string, string>; // Tag ID -> ISO timestamp when applied
    taggedBy?: Map<string, 'user' | 'ai'>; // Tag ID -> Source of tag
    tagConfidence?: Map<string, number>; // Tag ID -> Confidence score (for AI tags)
}

/**
 * Tag Cloud Data - For visualization
 */
export interface TagCloudItem {
    tagId: string;
    label: string;
    size: number;                  // Based on usage frequency
    color: string;
    category: TagCategory;
    isActive?: boolean;            // Currently selected in filter
}

/**
 * Tag Knowledge Graph Node - For graph visualization
 */
export interface TagGraphNode {
    id: string;
    label: string;
    category: TagCategory;
    size: number;                  // Node size based on usage
    color: string;
    x?: number;                    // Position for force-directed layout
    y?: number;
}

/**
 * Tag Knowledge Graph Edge - Connections between tags
 */
export interface TagGraphEdge {
    source: string;                // Source tag ID
    target: string;                // Target tag ID
    weight: number;                // Edge weight (co-occurrence frequency)
    type: TagRelationship['relationshipType'];
}

/**
 * Tag Store State - Global tag management
 */
export interface TagStore {
    tags: Map<string, TagMetadata>;
    relationships: TagRelationship[];
    usageStats: Map<string, TagUsageStats>;
    filterPresets: TagFilterPreset[];
    recentTags: string[];          // Recently used tag IDs (max 20)
    favoriteTags: string[];        // User-favorited tag IDs
}
