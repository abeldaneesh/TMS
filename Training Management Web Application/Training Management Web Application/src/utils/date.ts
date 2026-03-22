import { format } from 'date-fns';

/**
 * Safely formats a date string or object.
 * Returns 'N/A' if date is missing, and 'Invalid Date' if parsing fails.
 */
export const safeFormatDate = (date: any, formatStr: string = 'MMM dd, yyyy'): string => {
    if (!date) return 'N/A';

    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) {
            console.warn('[DATE_SYNC] Malformed date encountered:', date);
            return 'Invalid Date';
        }
        return format(d, formatStr);
    } catch (error) {
        console.error('[DATE_SYNC] Fatal date parsing error:', error);
        return 'Invalid Date';
    }
};
