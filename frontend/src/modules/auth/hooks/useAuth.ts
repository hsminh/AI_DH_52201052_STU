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
            // Redirect to appropriate login page based on required role
            if (requiredRole === 'CONSUMER') {
                router.push('/consumer/login');
            } else if (requiredRole === 'USER') {
                router.push('/user/login');
            } else {
                router.push('/login');
            }
        }
        setLoading(false);
        return;
      }

      try {
        const profile = await AuthApi.getProfile();
        if (requiredRole && profile.role !== requiredRole) {
           // Redirect to appropriate login page for the required role
           if (requiredRole === 'CONSUMER') {
               router.push('/consumer/login');
           } else if (requiredRole === 'USER') {
               router.push('/user/login');
           } else {
               router.push('/login');
           }
           return;
        }
        setUser(profile);
      } catch (err) {
        console.error('Auth check failed:', err);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            // Redirect to appropriate login page based on required role
            if (requiredRole === 'CONSUMER') {
                router.push('/consumer/login');
            } else if (requiredRole === 'USER') {
                router.push('/user/login');
            } else {
                router.push('/login');
            }
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
