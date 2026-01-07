/**
 * Auth utilities for Recall web app
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.recall.team';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  githubUsername: string;
  onboardingCompleted: boolean;
  lastMcpConnection: string | null;
  profile: {
    role: string | null;
    company: string | null;
    teamSize: string | null;
  };
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
 * Exchange an auth code for a JWT token
 * This is used after OAuth redirect to avoid exposing the JWT in the URL
 */
export async function exchangeAuthCode(code: string): Promise<string | null> {
  try {
    const response = await fetch(`${API_URL}/auth/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      console.error('Failed to exchange auth code:', await response.text());
      return null;
    }

    const data = await response.json() as { token: string };
    return data.token;
  } catch (err) {
    console.error('Error exchanging auth code:', err);
    return null;
  }
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
