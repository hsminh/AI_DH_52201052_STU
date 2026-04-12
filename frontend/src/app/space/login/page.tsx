'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthApi } from '@/modules/auth/api/auth.api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Lock, User } from 'lucide-react';

export default function SpaceLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await AuthApi.userLogin({ username, password });
      router.push('/space/documents');
    } catch {
      setError('Tên đăng nhập hoặc mật khẩu không đúng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 py-12 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-900/40">
            <Brain size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Space Portal</h1>
          <p className="text-slate-400 text-sm">Quản lý tài liệu và cơ sở tri thức RAG</p>
        </div>

        <Card className="border-slate-800 bg-slate-900 shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-xl font-bold text-center">Đăng nhập</CardTitle>
            <CardDescription className="text-slate-400 text-center text-sm">
              Dành cho tài khoản USER — quản trị hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="text-sm text-center text-red-400 bg-red-950/50 border border-red-800 p-3 rounded-xl">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-300 text-sm font-semibold">
                  Tên đăng nhập
                </Label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Nhập tên đăng nhập..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 text-sm font-semibold">
                  Mật khẩu
                </Label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Nhập mật khẩu..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 font-bold py-3 rounded-xl"
              >
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập Space'}
              </Button>
            </form>
            <div className="text-center pt-2">
              <Link href="/consumer/login" className="text-sm text-slate-500 hover:text-blue-400 transition-colors">
                Bạn là Consumer? Đăng nhập tại đây →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
