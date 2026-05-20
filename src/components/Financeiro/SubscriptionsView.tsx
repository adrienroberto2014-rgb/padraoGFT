import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Filter, 
  Search,
  MoreVertical,
  Plus,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Subscription {
  id: string;
  studentName: string;
  planName: string;
  amount: number;
  status: 'active' | 'past_due' | 'canceled' | 'unpaid';
  currentPeriodEnd: any;
}

export const SubscriptionsView = ({ subscriptions = [] }: { subscriptions: any[] }) => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const statusColors = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    past_due: 'bg-amber-100 text-amber-700 border-amber-200',
    canceled: 'bg-slate-100 text-slate-700 border-slate-200',
    unpaid: 'bg-rose-100 text-rose-700 border-rose-200'
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesFilter = filter === 'all' || sub.status === filter;
    const matchesSearch = sub.studentName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'ATIVA',
      past_due: 'ATRASADA',
      canceled: 'CANCELADA',
      unpaid: 'NÃO PAGA'
    };
    return labels[status] || status.toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight font-display">Assinaturas</h2>
          <p className="text-zinc-500">Gerencie cobranças recorrentes e o ciclo de vida dos alunos</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg font-medium hover:bg-zinc-800 transition-colors">
            <Plus size={18} />
            Nova Assinatura
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Ativas" value={subscriptions.filter(s => s.status === 'active').length} icon={<CheckCircle2 className="text-emerald-500" />} />
        <StatCard title="Atrasadas" value={subscriptions.filter(s => s.status === 'past_due').length} icon={<AlertCircle className="text-amber-500" />} />
        <StatCard title="Receita Mensal" value={`R$ ${subscriptions.reduce((acc, s) => acc + (s.status === 'active' ? s.amount : 0), 0).toFixed(2)}`} icon={<CreditCard className="text-blue-500" />} />
        <StatCard title="Total de Alunos" value={subscriptions.length} icon={<RefreshCw className="text-zinc-500" />} />
      </div>

      <div className="premium-card overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-50/50 dark:bg-white/2">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-lg px-3 py-2 flex-1 max-w-md focus-within:ring-2 focus-within:ring-zinc-900 transition-shadow">
            <Search size={18} className="text-zinc-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome do aluno..." 
              className="bg-transparent border-none outline-none text-sm w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-zinc-400" />
            <select 
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900 transition-shadow"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativas</option>
              <option value="past_due">Atrasadas</option>
              <option value="canceled">Canceladas</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-white/5 text-zinc-500 text-sm font-medium">
                <th className="px-6 py-4">Aluno</th>
                <th className="px-6 py-4">Plano</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Próxima Cobrança</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.map((sub, index) => (
                <motion.tr 
                  key={sub.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-zinc-100 dark:border-white/5 last:border-0 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors group"
                >
                  <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{sub.studentName}</td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{sub.planName}</td>
                  <td className="px-6 py-4 text-zinc-900 dark:text-white font-mono text-xs">R$ {sub.amount?.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[sub.status as keyof typeof statusColors] || 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                      {getStatusLabel(sub.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-500 text-xs flex items-center gap-2">
                    <Clock size={14} />
                    {sub.currentPeriodEnd ? format(sub.currentPeriodEnd.toDate(), 'dd/MM/yyyy') : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors text-zinc-400 opacity-0 group-hover:opacity-100">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filteredSubscriptions.length === 0 && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-zinc-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-zinc-400" />
              </div>
              <h3 className="text-zinc-900 dark:text-white font-medium whitespace-nowrap">Nenhuma assinatura encontrada</h3>
              <p className="text-zinc-500 text-sm">Tente ajustar seus filtros ou termo de busca.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
      {icon}
    </div>
  </div>
);
