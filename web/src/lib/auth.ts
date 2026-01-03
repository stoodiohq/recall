/**
 * Auth utilities for Recall web app
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://recall-api.stoodiohq.workers.dev';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  githubUsername: string;
  team: {
    id: string;
    name: string;
    slug: string;
    role: string;
    tier: string;
    seats: number;
  } | null;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

/**
 * Get the stored auth token
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('recall_token');
}

/**
 * Set the auth token
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('recall_token', token);
}

/**
 * Clear the auth token
 */
export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('recall_token');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getToken();
}

/**
 * Get the GitHub OAuth URL
 */
export function getGitHubAuthUrl(): string {
  return `${API_URL}/auth/github`;
}

/**
 * Fetch current user from API
 */
export async function fetchUser(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearToken();
      }
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Log out
 */
export function logout(): void {
  clearToken();
  window.location.href = '/';
}
