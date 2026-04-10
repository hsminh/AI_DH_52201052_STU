'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { 
  Brain, 
  Dumbbell, 
  LogOut, 
  LayoutDashboard, 
  Settings,
  User as UserIcon,
  Home,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

export default function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth('CONSUMER');
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'AI Chat', href: '/chat', icon: Brain },
    { name: 'Fitness Analyst', href: '/fitness', icon: Dumbbell },
    { name: 'Profile', href: '/profile', icon: UserIcon },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <div className="flex flex-col h-screen bg-[#F0F9FF]">
      {/* Header */}
      <header className="h-16 bg-[#A3DAFF] border-b border-[#87C6EE] flex items-center justify-between px-6 z-40 shadow-sm relative">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-[#87C6EE] rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          {/* Logo - Logout on click */}
          <div 
            className="flex items-center space-x-2 text-[#005596] cursor-pointer hover:opacity-75 transition-opacity"
            onClick={logout}
            title="Click logo to Logout"
          >
            <Home size={24} />
            <span className="text-xl font-bold tracking-tight text-[#004070]">Consumer Portal</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 relative">
          <button 
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-[#87C6EE]/30 transition-all focus:outline-none"
          >
            <div className="hidden md:flex flex-col items-end mr-1">
              <span className="text-sm font-semibold text-[#004070]">{user?.full_name || 'Consumer User'}</span>
              <span className="text-xs text-[#005596] capitalize">{user?.role || 'Consumer'}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-white border-2 border-[#87C6EE] flex items-center justify-center text-[#005596] font-bold shadow-sm">
              {user?.full_name?.[0] || 'C'}
            </div>
          </button>

          {/* Profile Dropdown */}
          {isProfileDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsProfileDropdownOpen(false)}
              ></div>
              <div className="absolute top-14 right-0 w-56 bg-white rounded-2xl shadow-2xl border border-[#A3DAFF]/30 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-[#F0F9FF] md:hidden">
                  <p className="text-sm font-bold text-[#004070]">{user?.full_name || 'Consumer User'}</p>
                  <p className="text-xs text-gray-400 capitalize">{user?.role || 'Consumer'}</p>
                </div>
                <Link 
                  href="/profile" 
                  className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-[#F0F9FF] transition-colors"
                  onClick={() => setIsProfileDropdownOpen(false)}
                >
                  <UserIcon size={18} className="text-[#005596]" />
                  <span>Your Profile</span>
                </Link>
                <Link 
                  href="/settings" 
                  className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-[#F0F9FF] transition-colors"
                  onClick={() => setIsProfileDropdownOpen(false)}
                >
                  <Settings size={18} className="text-[#005596]" />
                  <span>Account Settings</span>
                </Link>
                <div className="border-t border-[#F0F9FF] mt-2">
                  <button 
                    onClick={logout}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors font-semibold"
                  >
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside 
          className={`${
            isSidebarOpen ? 'w-64' : 'w-0'
          } bg-white border-r border-[#A3DAFF] transition-all duration-300 flex flex-col z-20 overflow-hidden shadow-lg`}
        >
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 p-3 rounded-xl transition-all ${
                    isActive(item.href)
                      ? 'bg-[#A3DAFF] text-[#004070] font-bold shadow-sm'
                      : 'text-gray-600 hover:bg-[#F0F9FF] hover:text-[#005596]'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium whitespace-nowrap">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-[#F0F9FF]">
            <button 
              onClick={logout}
              className="w-full flex items-center space-x-3 p-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative flex flex-col">
          <div className="flex-1">
            {children}
          </div>
          
          {/* Footer */}
          <footer className="py-6 px-8 bg-white border-t border-[#A3DAFF] text-center text-sm text-[#005596]">
            <div className="flex flex-col md:flex-row justify-between items-center max-w-6xl mx-auto space-y-2 md:space-y-0">
              <p>© 2026 Consumer Health AI. All rights reserved.</p>
              <div className="flex space-x-6">
                <Link href="/privacy" className="hover:text-[#004070] transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-[#004070] transition-colors">Terms of Service</Link>
                <Link href="/support" className="hover:text-[#004070] transition-colors">Support</Link>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
