'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  Activity, 
  Calendar, 
  Flame, 
  Target, 
  Clock,
  ChevronRight,
  Plus
} from 'lucide-react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
);

export default function DashboardPage() {
  const mockStats = [
    { name: 'Total Calories', value: '1,840', unit: 'kcal', change: '+5%', icon: Flame, color: '#A3DAFF' },
    { name: 'Active Minutes', value: '45', unit: 'mins', change: '+12%', icon: Activity, color: '#87C6EE' },
    { name: 'Workouts', value: '12', unit: 'this month', change: '+2', icon: Target, color: '#005596' },
  ];

  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Calories Burned',
        data: [1800, 2100, 1950, 2400, 2200, 2800, 2500],
        borderColor: '#A3DAFF',
        backgroundColor: 'rgba(163, 218, 255, 0.2)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const recentActivities = [
    { title: 'Morning Jogging', time: 'Today, 06:30 AM', category: 'Workout', icon: Activity },
    { title: 'Dinner: Grilled Salmon', time: 'Yesterday, 07:45 PM', category: 'Meal', icon: Flame },
    { title: 'Leg Day Session', time: 'Oct 24, 05:00 PM', category: 'Workout', icon: Target },
  ];

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#004070]">Welcome back, Siminh! 👋</h1>
          <p className="text-gray-500">Here's your health overview for this week.</p>
        </div>
        <button className="flex items-center space-x-2 bg-[#A3DAFF] text-[#004070] px-6 py-3 rounded-xl font-bold hover:bg-[#87C6EE] transition-all shadow-sm">
          <Plus size={20} />
          <span>Add New Record</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {mockStats.map((stat) => (
          <Card key={stat.name} className="border-[#A3DAFF]/30 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">{stat.name}</p>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-bold text-[#004070]">{stat.value}</span>
                    <span className="text-xs text-gray-400 font-medium">{stat.unit}</span>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#F0F9FF] text-[#005596]">
                  <stat.icon size={28} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs font-bold text-green-600">
                <TrendingUp size={14} className="mr-1" />
                <span>{stat.change}</span>
                <span className="text-gray-400 ml-1 font-normal">from last week</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Chart */}
        <Card className="lg:col-span-2 border-[#A3DAFF]/30 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-[#F0F9FF]">
            <CardTitle className="text-[#004070] flex items-center gap-2">
              <Calendar className="text-[#A3DAFF]" size={20} />
              Weekly Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px] w-full">
              <Line data={chartData} options={{ maintainAspectRatio: false }} />
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="border-[#A3DAFF]/30 shadow-sm">
          <CardHeader className="border-b border-[#F0F9FF]">
            <CardTitle className="text-[#004070] flex items-center gap-2">
              <Clock className="text-[#A3DAFF]" size={20} />
              Recent Logs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#F0F9FF]">
              {recentActivities.map((activity, i) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-[#F0F9FF]/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-xl bg-[#F0F9FF] text-[#005596]">
                      <activity.icon size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#004070]">{activity.title}</p>
                      <p className="text-xs text-gray-400">{activity.time}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              ))}
            </div>
            <button className="w-full py-4 text-sm font-bold text-[#005596] hover:bg-[#F0F9FF] transition-colors">
              View All History
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
