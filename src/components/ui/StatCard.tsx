import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/formatters';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
}

export const StatCard = ({ title, value, icon: Icon, trend, color }: StatCardProps) => (
  <div className="premium-card p-6 group">
    <div className="flex items-start justify-between">
      <div className="space-y-3">
        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-sans">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-3xl font-display font-medium text-zinc-900 dark:text-white tracking-tight">{value}</h3>
        </div>
        {trend && (
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full",
              trend.isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10'
            )}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}%
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">vs mês anterior</span>
          </div>
        )}
      </div>
      <div className={cn(
        "p-2.5 rounded-xl transition-all duration-500 group-hover:scale-110",
        color || "bg-zinc-50 dark:bg-white/5 text-zinc-400"
      )}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </div>
);
