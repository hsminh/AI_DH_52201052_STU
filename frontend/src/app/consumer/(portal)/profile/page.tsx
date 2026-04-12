'use client';

import React from 'react';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  MapPin, 
  Edit3, 
  Camera,
  Weight,
  Ruler,
  Activity,
  Heart
} from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth('CONSUMER');

  const mockProfile = {
    weight: 70,
    height: 175,
    age: 25,
    gender: 'Male',
    activityLevel: 'Moderate',
    goal: 'Weight Loss',
    joinDate: 'January 2024',
    location: 'Ho Chi Minh City, VN'
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center gap-8 bg-white p-8 rounded-[40px] shadow-xl border border-[#A3DAFF]/20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-[#A3DAFF] to-[#87C6EE] opacity-20"></div>
        
        <div className="relative">
          <div className="w-32 h-32 rounded-3xl bg-[#A3DAFF] flex items-center justify-center text-[#004070] text-4xl font-black border-4 border-white shadow-lg">
            {user?.username?.[0].toUpperCase() || 'C'}
          </div>
          <button className="absolute -bottom-2 -right-2 p-2 bg-[#005596] text-white rounded-xl shadow-lg hover:scale-110 transition-transform">
            <Camera size={18} />
          </button>
        </div>

        <div className="flex-1 text-center md:text-left space-y-2 z-10">
          <h1 className="text-3xl font-black text-[#004070]">{user?.username || 'Consumer'}</h1>
          <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm font-medium text-gray-500">
            <span className="flex items-center gap-1"><Mail size={14} className="text-[#A3DAFF]" /> {user?.email || 'user@example.com'}</span>
            <span className="flex items-center gap-1"><MapPin size={14} className="text-[#A3DAFF]" /> {mockProfile.location}</span>
            <span className="flex items-center gap-1"><Calendar size={14} className="text-[#A3DAFF]" /> Joined {mockProfile.joinDate}</span>
          </div>
          <div className="pt-2 flex justify-center md:justify-start gap-2">
            <span className="bg-[#A3DAFF]/20 text-[#004070] text-xs font-bold px-3 py-1 rounded-full border border-[#A3DAFF]/30 uppercase tracking-wider flex items-center gap-1">
              <Shield size={12} /> {user?.role || 'Consumer'}
            </span>
          </div>
        </div>

        <Button className="bg-[#A3DAFF] text-[#004070] hover:bg-[#87C6EE] font-bold rounded-2xl px-6 z-10">
          <Edit3 size={18} className="mr-2" />
          Edit Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-[#A3DAFF]/30 rounded-[32px] shadow-sm hover:shadow-md transition-all group">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
              <Weight size={16} className="text-[#A3DAFF]" /> Physical
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-end border-b border-gray-50 pb-2">
              <span className="text-sm text-gray-500">Weight</span>
              <span className="text-xl font-black text-[#004070]">{mockProfile.weight} <small className="text-[10px] text-gray-400">KG</small></span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-sm text-gray-500">Height</span>
              <span className="text-xl font-black text-[#004070]">{mockProfile.height} <small className="text-[10px] text-gray-400">CM</small></span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#A3DAFF]/30 rounded-[32px] shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
              <Activity size={16} className="text-[#A3DAFF]" /> Lifestyle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-end border-b border-gray-50 pb-2">
              <span className="text-sm text-gray-500">Activity</span>
              <span className="text-lg font-black text-[#004070]">{mockProfile.activityLevel}</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-sm text-gray-500">Gender</span>
              <span className="text-lg font-black text-[#004070]">{mockProfile.gender}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#A3DAFF]/30 rounded-[32px] shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
              <Heart size={16} className="text-[#A3DAFF]" /> Fitness Goal
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-2">
            <span className="text-2xl font-black text-[#005596]">{mockProfile.goal}</span>
            <span className="text-[10px] font-bold text-green-500 mt-1 uppercase tracking-tighter italic">Progress: 65% achieved</span>
          </CardContent>
        </Card>
      </div>

      <div className="bg-[#004070] rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10 space-y-4">
          <h2 className="text-2xl font-black">Your Health Journey</h2>
          <p className="text-blue-100 opacity-80 max-w-xl">You've been consistent for 14 days straight! Keep up the great work and reach your targets.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
              <p className="text-[10px] font-bold text-blue-300 uppercase">Avg Calories</p>
              <p className="text-xl font-bold">1,950</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
              <p className="text-[10px] font-bold text-blue-300 uppercase">Avg Sleep</p>
              <p className="text-xl font-bold">7.5h</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
              <p className="text-[10px] font-bold text-blue-300 uppercase">Water Intake</p>
              <p className="text-xl font-bold">2.4L</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
              <p className="text-[10px] font-bold text-blue-300 uppercase">Daily Steps</p>
              <p className="text-xl font-bold">8,420</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#A3DAFF] opacity-10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
      </div>
    </div>
  );
}
