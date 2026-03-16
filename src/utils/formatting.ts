/**
 * Utility functions for locale-aware formatting
 */

import { Language } from '../i18n/translations';

/**
 * Format a date according to the current locale
 */
export function formatDate(date: Date, language: Language, options?: Intl.DateTimeFormatOptions): string {
    const locale = getLocale(language);
    const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options
    };

    return new Intl.DateTimeFormat(locale, defaultOptions).format(date);
}

/**
 * Format a date and time according to the current locale
 */
export function formatDateTime(date: Date, language: Language, options?: Intl.DateTimeFormatOptions): string {
    const locale = getLocale(language);
    const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options
    };

    return new Intl.DateTimeFormat(locale, defaultOptions).format(date);
}

/**
 * Format a time according to the current locale
 */
export function formatTime(date: Date, language: Language, options?: Intl.DateTimeFormatOptions): string {
    const locale = getLocale(language);
    const defaultOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        ...options
    };

    return new Intl.DateTimeFormat(locale, defaultOptions).format(date);
}

/**
 * Format a number according to the current locale
 */
export function formatNumber(num: number, language: Language, options?: Intl.NumberFormatOptions): string {
    const locale = getLocale(language);
    return new Intl.NumberFormat(locale, options).format(num);
}

/**
 * Format currency according to the current locale
 */
export function formatCurrency(amount: number, language: Language, currency: string = 'USD', options?: Intl.NumberFormatOptions): string {
    const locale = getLocale(language);
    const defaultOptions: Intl.NumberFormatOptions = {
        style: 'currency',
        currency,
        ...options
    };

    return new Intl.NumberFormat(locale, defaultOptions).format(amount);
}

/**
 * Format large numbers with compact notation
 */
export function formatCompactNumber(num: number, language: Language): string {
    const locale = getLocale(language);
    return new Intl.NumberFormat(locale, { notation: 'compact', compactDisplay: 'short' }).format(num);
}

/**
 * Format a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date, language: Language, baseDate: Date = new Date()): string {
    const diffMs = baseDate.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    // Helper function to get the appropriate time translation key
    const getTimeKey = (): { value: number; key: string } => {
        if (diffSec < 60) return { value: 0, key: 'justNow' };
        if (diffMin === 1) return { value: 1, key: 'minuteAgo' };
        if (diffMin < 60) return { value: diffMin, key: 'minutesAgo' };
        if (diffHour === 1) return { value: 1, key: 'hourAgo' };
        if (diffHour < 24) return { value: diffHour, key: 'hoursAgo' };
        if (diffDay === 1) return { value: 1, key: 'dayAgo' };
        if (diffDay < 7) return { value: diffDay, key: 'daysAgo' };
        if (diffWeek === 1) return { value: 1, key: 'weekAgo' };
        if (diffWeek < 4) return { value: diffWeek, key: 'weeksAgo' };
        if (diffMonth === 1) return { value: 1, key: 'monthAgo' };
        if (diffMonth < 12) return { value: diffMonth, key: 'monthsAgo' };
        if (diffYear === 1) return { value: 1, key: 'yearAgo' };
        return { value: diffYear, key: 'yearsAgo' };
    };

    const { value, key } = getTimeKey();

    // Import translations dynamically
    // This function will be used with the translations object
    // For now, return a placeholder format
    return `${value} ${key}`;
}

/**
 * Format a percentage according to the current locale
 */
export function formatPercentage(value: number, language: Language, decimals: number = 1): string {
    const locale = getLocale(language);
    return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}

/**
 * Format bytes in a human-readable format
 */
export function formatBytes(bytes: number, language: Language, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return formatNumber(parseFloat((bytes / Math.pow(k, i)).toFixed(dm)), language) + ' ' + sizes[i];
}

/**
 * Get plural form for a count
 * This is a simplified version - for production, use a proper pluralization library
 */
export function pluralize(count: number, singular: string, plural: string): string {
    return count === 1 ? singular : plural;
}

/**
 * Get the locale string from a language code
 */
function getLocale(language: Language): string {
    const localeMap: Record<Language, string> = {
        'en': 'en-US',
        'fr': 'fr-FR',
        'es': 'es-ES'
    };

    return localeMap[language] || 'en-US';
}

/**
 * Format a duration in milliseconds to a human-readable string
 */
export function formatDuration(ms: number, language: Language): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }
    if (seconds > 0) {
        return `${seconds}s`;
    }
    return `${ms}ms`;
}

/**
 * Format a list of items with proper conjunctions (and/or)
 */
export function formatList(items: string[], language: Language, type: 'conjunction' | 'disjunction' = 'conjunction'): string {
    const locale = getLocale(language);

    if ('ListFormat' in Intl) {
        return new Intl.ListFormat(locale, { style: 'long', type }).format(items);
    }

    // Fallback for older browsers
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return items.join(type === 'conjunction' ? ' and ' : ' or ');

    const last = items[items.length - 1];
    const rest = items.slice(0, -1);
    return rest.join(', ') + (type === 'conjunction' ? ', and ' : ', or ') + last;
}
