'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthApi } from '@/modules/auth/api/auth.api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function UserLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await AuthApi.userLogin({ username, password });
      
      // No need to verify role since backend already validates
      router.push('/space/documents');
    } catch (err: any) {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center text-blue-600">Admin Login</CardTitle>
          <CardDescription className="text-center">
            Access document management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-sm text-center text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Sign In as Admin
            </Button>
          </form>
          <div className="text-center space-y-2">
            <Link href="/consumer/login" className="text-sm text-blue-600 hover:text-blue-500 block">
              Are you a consumer? Login here
            </Link>
            <Link href="/register" className="text-sm text-blue-600 hover:text-blue-500 block">
              Don't have an account? Register here
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
