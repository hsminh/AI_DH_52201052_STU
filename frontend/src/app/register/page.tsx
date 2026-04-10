'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthApi } from '@/modules/auth/api/auth.api';
import Link from 'next/link';
import { UserPlus, User, Mail, Lock, ShieldCheck, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'CONSUMER'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await AuthApi.register(formData);
      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F9FF] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-xl border border-[#A3DAFF]/30">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-[#A3DAFF] rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <UserPlus className="text-[#004070] w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-[#004070]">Create Account</h2>
          <p className="mt-2 text-sm text-gray-500">Join our community and start tracking</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-[#A3DAFF]" />
              </div>
              <input
                type="text"
                required
                className="appearance-none rounded-xl relative block w-full pl-10 px-3 py-3 border border-gray-200 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#A3DAFF] focus:border-transparent sm:text-sm transition-all"
                placeholder="Username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-[#A3DAFF]" />
              </div>
              <input
                type="email"
                required
                className="appearance-none rounded-xl relative block w-full pl-10 px-3 py-3 border border-gray-200 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#A3DAFF] focus:border-transparent sm:text-sm transition-all"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-[#A3DAFF]" />
              </div>
              <input
                type="password"
                required
                className="appearance-none rounded-xl relative block w-full pl-10 px-3 py-3 border border-gray-200 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#A3DAFF] focus:border-transparent sm:text-sm transition-all"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <ShieldCheck className="h-5 w-5 text-[#A3DAFF]" />
              </div>
              <select
                className="appearance-none rounded-xl relative block w-full pl-10 px-3 py-3 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#A3DAFF] focus:border-transparent sm:text-sm transition-all bg-white"
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              >
                <option value="CONSUMER">Consumer (Regular User)</option>
                <option value="USER">User (Admin/Training)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-[#004070] bg-[#A3DAFF] hover:bg-[#87C6EE] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A3DAFF] transition-all shadow-sm disabled:opacity-50 mt-6"
          >
            {loading ? 'Creating account...' : 'Create Account'}
            {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-[#005596] hover:text-[#004070] transition-colors">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
