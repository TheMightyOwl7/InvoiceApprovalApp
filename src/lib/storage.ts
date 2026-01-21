// Client-side storage for current user context
// Only stores which user you're "acting as" - actual user data comes from API

import type { CurrentUserContext } from './types';
export type { CurrentUserContext } from './types';

const STORAGE_KEY = 'paymentApproval_currentUser';

export function getCurrentUser(): CurrentUserContext | null {
    if (typeof window === 'undefined') return null;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    try {
        return JSON.parse(stored) as CurrentUserContext;
    } catch {
        return null;
    }
}

export function setCurrentUser(user: CurrentUserContext): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearCurrentUser(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
}
