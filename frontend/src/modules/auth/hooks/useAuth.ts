import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthApi } from '../api/auth.api';
import { User, AccountRole } from '@/shared/types';

export const useAuth = (requiredRole?: AccountRole) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (!token) {
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            router.push('/login');
        }
        setLoading(false);
        return;
      }

      try {
        const profile = await AuthApi.getProfile();
        if (requiredRole && profile.role !== requiredRole) {
           router.push('/login');
           return;
        }
        setUser(profile);
      } catch (err) {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, requiredRole]);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/login');
  };

  return { user, loading, logout };
};
