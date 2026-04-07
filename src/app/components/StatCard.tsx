import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconColor,
  iconBgColor 
}: StatCardProps) {
  return (
    <div className="bg-white rounded-lg p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm text-gray-600 uppercase tracking-wide">{title}</h3>
        <div className={`${iconBgColor} p-3 rounded-lg`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
      <div>
        <div className="text-4xl font-semibold text-gray-900 mb-1">{value}</div>
        <div className="text-sm text-gray-500">{subtitle}</div>
      </div>
    </div>
  );
}
