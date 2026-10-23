import { apiConfig, apiRequest } from '@/lib/api';
import { mockDelay, requireRecord } from '@/lib/mock-utils';
import { mockUsers } from '@/mocks/commerce';
import type { AuthSession, UserRole } from '@/types/index';
const KEY = 'commerce-auth-v1';
export const authService = {
  async login(
    email: string,
    _password: string,
    role?: UserRole,
  ): Promise<AuthSession> {
    if (!apiConfig.useMock)
      return apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: _password }),
      });
    await mockDelay();
    const user = requireRecord(
      mockUsers.find((u) => u.email === email || (role && u.role === role)),
      'User',
    );
    const session = {
      token: `mock_${user._id}_${Date.now()}`,
      user,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };
    if (typeof window !== 'undefined')
      localStorage.setItem(KEY, JSON.stringify(session));
    return session;
  },
  async session(): Promise<AuthSession | null> {
    if (!apiConfig.useMock) return apiRequest('/auth/session');
    await mockDelay(40);
    if (typeof window === 'undefined') return null;
    try {
      return JSON.parse(
        localStorage.getItem(KEY) || 'null',
      ) as AuthSession | null;
    } catch {
      return null;
    }
  },
  async logout(): Promise<void> {
    if (!apiConfig.useMock) {
      await apiRequest('/auth/logout', { method: 'POST' });
      return;
    }
    if (typeof window !== 'undefined') localStorage.removeItem(KEY);
  },
};
