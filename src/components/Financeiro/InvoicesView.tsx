import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

export const InvoicesView = ({ invoices = [] }: { invoices: any[] }) => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const statusMap = {
    paid: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={12} /> },
    pending: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock size={12} /> },
    overdue: { color: 'bg-rose-100 text-rose-700 border-rose-200', icon: <XCircle size={12} /> },
    voided: { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: <XCircle size={12} /> }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesFilter = filter === 'all' || inv.status === filter;
    const matchesSearch = inv.studentName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      paid: 'PAGA',
      pending: 'PENDENTE',
      overdue: 'ATRASADA',
      voided: 'ANULADA'
    };
    return labels[status] || status.toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight font-display">Faturas</h2>
          <p className="text-zinc-500 text-sm">Acompanhe eventos de faturamento e histórico de pagamentos</p>
        </div>
      </div>

      <div className="premium-card overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-50/50 dark:bg-white/2">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-lg px-3 py-2 flex-1 max-w-md focus-within:ring-2 focus-within:ring-zinc-900">
            <Search size={16} className="text-zinc-400" />
            <input 
              type="text" 
              placeholder="Buscar faturas..." 
              className="bg-transparent border-none outline-none w-full text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'paid', label: 'Pagas' },
              { id: 'pending', label: 'Pendentes' },
              { id: 'overdue', label: 'Atrasadas' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider border transition-all ${
                  filter === f.id 
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white shadow-md' 
                    : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-white/5 hover:border-zinc-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-white/5 text-zinc-500 font-bold text-[10px] uppercase tracking-widest">
                <th className="px-6 py-4">Fatura #</th>
                <th className="px-6 py-4">Aluno</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Vencimento</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv, index) => (
                <motion.tr 
                  key={inv.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-b border-zinc-100 dark:border-white/5 last:border-0 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4 font-mono text-zinc-500 text-[10px] uppercase">INV-{inv.id.slice(0, 8)}</td>
                  <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white text-xs">{inv.studentName}</td>
                  <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white text-sm">R$ {inv.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 text-xs">
                    {inv.dueDate ? format(inv.dueDate.toDate(), 'dd/MM/yyyy') : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase ${statusMap[inv.status as keyof typeof statusMap]?.color}`}>
                      {statusMap[inv.status as keyof typeof statusMap]?.icon}
                      {getStatusLabel(inv.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors" title="Baixar PDF">
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filteredInvoices.length === 0 && (
            <div className="py-20 text-center text-zinc-500">
              <FileText className="mx-auto h-10 w-10 text-zinc-200 dark:text-zinc-800 mb-4" />
              <p className="text-sm">Nenhuma fatura encontrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
