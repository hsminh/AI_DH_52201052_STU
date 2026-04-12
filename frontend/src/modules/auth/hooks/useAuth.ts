import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthApi } from '../api/auth.api';
import { User } from '@/shared/types';
import { TOKEN_KEYS, TokenRole } from '@/shared/api/base.api';

const LOGIN_PAGE: Record<TokenRole, string> = {
  CONSUMER: '/consumer/login',
  USER:     '/space/login',
};

export const useAuth = (requiredRole?: TokenRole) => {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const role  = requiredRole ?? 'CONSUMER';
      const token = typeof window !== 'undefined'
        ? localStorage.getItem(TOKEN_KEYS[role].access)
        : null;

      if (!token) {
        const loginPath = LOGIN_PAGE[role];
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          router.push(loginPath);
        }
        setLoading(false);
        return;
      }

      try {
        const profile = await AuthApi.getProfile(role);
        // Nếu role không khớp, đẩy về trang login đúng
        if (requiredRole && profile.role !== requiredRole) {
          router.push(LOGIN_PAGE[role]);
          return;
        }
        setUser(profile);
      } catch {
        if (typeof window !== 'undefined') {
          AuthApi.logout(role);
          router.push(LOGIN_PAGE[role]);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, requiredRole]);

  const logout = () => {
    const role = requiredRole ?? 'CONSUMER';
    AuthApi.logout(role);
    router.push(LOGIN_PAGE[role]);
  };

  return { user, loading, logout };
};
