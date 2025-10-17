/**
 * Date Utilities for Atticus
 * Standardizes date handling across the application
 */

/**
 * Get current timestamp as ISO string
 */
export function now(): string {
    return new Date().toISOString();
}

/**
 * Parse ISO string to Date object
 */
export function parse(isoString: string): Date {
    return new Date(isoString);
}

/**
 * Format date for display
 */
export function formatDateTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? parse(date) : date;
    return dateObj.toLocaleString();
}

/**
 * Format date for display (date only)
 */
export function formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? parse(date) : date;
    return dateObj.toLocaleDateString();
}

/**
 * Format time for display (time only)
 */
export function formatTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? parse(date) : date;
    return dateObj.toLocaleTimeString();
}

/**
 * Check if a date string is valid
 */
export function isValidDate(isoString: string): boolean {
    const date = new Date(isoString);
    return !Number.isNaN(date.getTime());
}

/**
 * Convert Date object to ISO string for persistence
 */
export function toISOString(date: Date): string {
    return date.toISOString();
}

/**
 * Get relative time description (e.g., "2 hours ago")
 */
export function getRelativeTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? parse(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
        return 'just now';
    } else if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
        return formatDate(dateObj);
    }
}

/**
 * Ensure timestamp is in ISO string format
 * Handles both Date objects and ISO strings
 */
export function ensureISOString(timestamp: Date | string): string {
    if (typeof timestamp === 'string') {
        return timestamp;
    }
    return timestamp.toISOString();
}

/**
 * Migration helper: convert Date objects to ISO strings in data structures
 */
export function migrateDateFields<T extends Record<string, unknown>>(
    obj: T,
    dateFields: (keyof T)[]
): T {
    const migrated = { ...obj };

    for (const field of dateFields) {
        const value = migrated[field];
        if (value instanceof Date) {
            migrated[field] = value.toISOString() as T[keyof T];
        }
    }

    return migrated;
}

export const DateUtils = {
    now,
    parse,
    formatDateTime,
    formatDate,
    formatTime,
    isValidDate,
    toISOString,
    getRelativeTime,
    ensureISOString,
    migrateDateFields,
};