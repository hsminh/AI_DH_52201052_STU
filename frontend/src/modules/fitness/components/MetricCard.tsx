import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white p-4 rounded-lg shadow-sm border-b-4 border-green-600 text-center transition-transform hover:scale-105">
    <Icon className="mx-auto mb-2 text-green-600" size={20} />
    <span className="text-xs text-gray-500 uppercase font-bold">{label}</span>
    <strong className={`block text-xl ${color || 'text-green-800'}`}>{value}</strong>
  </div>
);
