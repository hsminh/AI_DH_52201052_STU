'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Settings, 
  Bell, 
  Lock, 
  Eye, 
  Moon, 
  Globe, 
  Smartphone,
  ChevronRight,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function SettingsPage() {
  const settingSections = [
    {
      title: 'Account & Security',
      description: 'Manage your personal information and security settings.',
      icon: ShieldCheck,
      items: [
        { name: 'Change Password', icon: Lock, type: 'link' },
        { name: 'Two-Factor Authentication', icon: Smartphone, type: 'switch', default: true },
        { name: 'Privacy Settings', icon: Eye, type: 'link' },
      ]
    },
    {
      title: 'Notifications',
      description: 'Choose how you want to be notified about your progress.',
      icon: Bell,
      items: [
        { name: 'Email Notifications', icon: Bell, type: 'switch', default: true },
        { name: 'Meal Reminders', icon: Moon, type: 'switch', default: false },
        { name: 'Weekly Reports', icon: Globe, type: 'switch', default: true },
      ]
    },
    {
      title: 'Preferences',
      description: 'Customize your app experience.',
      icon: Settings,
      items: [
        { name: 'Language', icon: Globe, value: 'English', type: 'link' },
        { name: 'Dark Mode', icon: Moon, type: 'switch', default: false },
        { name: 'Unit System', icon: Settings, value: 'Metric (kg, cm)', type: 'link' },
      ]
    }
  ];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-4 border-b border-[#A3DAFF]/30 pb-6">
        <div className="p-3 bg-[#F0F9FF] rounded-2xl text-[#005596] border border-[#A3DAFF]/30 shadow-sm">
          <Settings size={32} className="animate-spin-slow" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-[#004070]">Settings</h1>
          <p className="text-sm text-gray-500 font-medium">Customize your health tracking experience</p>
        </div>
      </div>

      <div className="space-y-6">
        {settingSections.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <div className="px-2">
              <h2 className="text-lg font-bold text-[#004070] flex items-center gap-2">
                <section.icon size={20} className="text-[#A3DAFF]" />
                {section.title}
              </h2>
              <p className="text-xs text-gray-400 font-medium">{section.description}</p>
            </div>
            
            <Card className="border-[#A3DAFF]/20 rounded-[32px] shadow-sm overflow-hidden bg-white">
              <CardContent className="p-0">
                <div className="divide-y divide-gray-50">
                  {section.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="flex items-center justify-between p-5 hover:bg-[#F0F9FF]/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-gray-50 text-[#005596]">
                          <item.icon size={18} />
                        </div>
                        <span className="text-sm font-bold text-[#004070]">{item.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {item.value && (
                          <span className="text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">{item.value}</span>
                        )}
                        {item.type === 'switch' ? (
                          <Switch defaultChecked={item.default} />
                        ) : (
                          <ChevronRight size={18} className="text-gray-300" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <div className="pt-4 flex justify-end gap-4">
        <button className="px-6 py-2 rounded-xl text-gray-400 font-bold hover:text-gray-600 transition-colors">
          Discard Changes
        </button>
        <button className="px-8 py-3 bg-[#004070] text-white rounded-xl font-bold shadow-xl hover:bg-[#005596] transition-all hover:-translate-y-0.5">
          Save Settings
        </button>
      </div>
    </div>
  );
}
