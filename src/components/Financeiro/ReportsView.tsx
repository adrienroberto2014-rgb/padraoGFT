import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line
} from 'recharts';
import { 
  Download, 
  Calendar, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart as PieChartIcon,
  Search,
  FileSpreadsheet
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, cn } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { useStudents } from '../../application/hooks/useStudents';
import { usePayments } from '../../application/hooks/usePayments';
import { useExpenses } from '../../application/hooks/useExpenses';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

export const ReportsView = () => {
  const { isAdmin, permissions, user } = useAuth();
  const { students } = useStudents(true, isAdmin || permissions.students, (isAdmin || permissions.students) ? undefined : user?.email);
  const { payments } = usePayments(true, isAdmin || permissions.finance);
  const { expenses } = useExpenses(isAdmin || permissions.finance);

  const [dateRange, setDateRange] = useState({
    start: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = useMemo(() => {
    const cats = new Set(expenses.map(e => e.category));
    return ['all', ...Array.from(cats)];
  }, [expenses]);

  const filteredData = useMemo(() => {
    const start = parseISO(dateRange.start);
    const end = parseISO(dateRange.end);

    const filteredPayments = payments.filter(p => {
      const pDate = p.date?.toDate ? p.date.toDate() : new Date(p.date || Date.now());
      return isWithinInterval(pDate, { start, end });
    });

    const filteredExpenses = expenses.filter(e => {
      const eDate = e.date?.toDate ? e.date.toDate() : new Date(e.date || Date.now());
      const matchesDate = isWithinInterval(eDate, { start, end });
      const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
      return matchesDate && matchesCategory;
    });

    return { payments: filteredPayments, expenses: filteredExpenses };
  }, [payments, expenses, dateRange, selectedCategory]);

  const stats = useMemo(() => {
    const totalIncome = filteredData.payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalExpenses = filteredData.expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const balance = totalIncome - totalExpenses;
    
    // Group payments by method
    const incomeByMethod: any = {};
    filteredData.payments.forEach(p => {
      incomeByMethod[p.method] = (incomeByMethod[p.method] || 0) + (p.amount || 0);
    });

    // Group expenses by category
    const expensesByCategory: any = {};
    filteredData.expenses.forEach(e => {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + (e.amount || 0);
    });

    return {
      totalIncome,
      totalExpenses,
      balance,
      incomeByMethod: Object.keys(incomeByMethod).map(name => ({ name, value: incomeByMethod[name] })),
      expensesByCategory: Object.keys(expensesByCategory).map(name => ({ name, value: expensesByCategory[name] }))
    };
  }, [filteredData]);

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Prepare payments sheet
      const paymentsSheet = filteredData.payments.map(p => ({
        Data: format(p.date?.toDate ? p.date.toDate() : new Date(p.date || Date.now()), 'dd/MM/yyyy'),
        Aluno: students.find(s => s.id === p.studentId)?.name || 'Visitante',
        Valor: p.amount,
        Metodo: p.method,
        Periodo: p.period,
        Descricao: p.description || ''
      }));
      const wsPayments = XLSX.utils.json_to_sheet(paymentsSheet);
      XLSX.utils.book_append_sheet(wb, wsPayments, "Recebimentos");

      // Prepare expenses sheet
      const expensesSheet = filteredData.expenses.map(e => ({
        Data: format(e.date?.toDate ? e.date.toDate() : new Date(e.date || Date.now()), 'dd/MM/yyyy'),
        Descricao: e.description,
        Valor: e.amount,
        Categoria: e.category
      }));
      const wsExpenses = XLSX.utils.json_to_sheet(expensesSheet);
      XLSX.utils.book_append_sheet(wb, wsExpenses, "Despesas");

      // Summary sheet
      const summaryData = [
        ["Resumo Financeiro", ""],
        ["Periodo", `${format(parseISO(dateRange.start), 'dd/MM/yyyy')} a ${format(parseISO(dateRange.end), 'dd/MM/yyyy')}`],
        ["", ""],
        ["Total Recebido", stats.totalIncome],
        ["Total Despesas", stats.totalExpenses],
        ["Saldo", stats.balance],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo");

      XLSX.writeFile(wb, `Relatorio_Financeiro_${dateRange.start}_a_${dateRange.end}.xlsx`);
      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao exportar relatório.");
    }
  };

  const COLORS = ['#111827', '#4b5563', '#9ca3af', '#e5e7eb', '#3b82f6', '#10b981', '#f43f5e', '#f59e0b'];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-black italic uppercase tracking-tighter leading-none">Relatórios Financeiros</h1>
          <p className="text-gray-500 font-medium">Análise detalhada de fluxo de caixa e exportação.</p>
        </div>
        <button 
          onClick={handleExportExcel}
          className="flex items-center justify-center px-6 py-3 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-xl shadow-black/10 italic uppercase tracking-tighter text-xs gap-2"
        >
          <FileSpreadsheet className="w-5 h-5" />
          Exportar para Excel
        </button>
      </header>

      {/* Filters */}
      <div className="p-8 bg-white border border-gray-100 rounded-[32px] shadow-sm flex flex-wrap items-center gap-6">
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Início</label>
          <div className="relative">
            <Calendar className="absolute w-4 h-4 text-gray-400 left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="date"
              className="pl-12 pr-6 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-bold text-sm"
              value={dateRange.start}
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Fim</label>
          <div className="relative">
            <Calendar className="absolute w-4 h-4 text-gray-400 left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="date"
              className="pl-12 pr-6 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-bold text-sm"
              value={dateRange.end}
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2 flex-grow sm:max-w-xs">
          <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Categoria Despesa</label>
          <div className="relative">
            <Filter className="absolute w-4 h-4 text-gray-400 left-4 top-1/2 -translate-y-1/2" />
            <select 
              className="w-full pl-12 pr-6 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-bold text-sm appearance-none"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat === 'all' ? 'Todas Categorias' : cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-8 bg-emerald-500 rounded-[32px] text-white shadow-2xl shadow-emerald-500/20 group hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-black uppercase tracking-widest opacity-80">Total Recebido</p>
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="text-4xl font-black italic tracking-tighter leading-none">{formatCurrency(stats.totalIncome)}</h3>
          <p className="text-[10px] mt-4 font-bold uppercase tracking-wider opacity-60">No período selecionado</p>
        </div>
        <div className="p-8 bg-rose-500 rounded-[32px] text-white shadow-2xl shadow-rose-500/20 group hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-black uppercase tracking-widest opacity-80">Total Despesas</p>
            <TrendingDown className="w-6 h-6" />
          </div>
          <h3 className="text-4xl font-black italic tracking-tighter leading-none">{formatCurrency(stats.totalExpenses)}</h3>
          <p className="text-[10px] mt-4 font-bold uppercase tracking-wider opacity-60">{selectedCategory === 'all' ? 'Todas categorias' : selectedCategory}</p>
        </div>
        <div className={cn(
          "p-8 rounded-[32px] text-white shadow-2xl group hover:scale-[1.02] transition-transform",
          stats.balance >= 0 ? "bg-black shadow-black/20" : "bg-gray-800 shadow-gray-800/20"
        )}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-black uppercase tracking-widest opacity-80">Saldo Líquido</p>
            <DollarSign className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-4xl font-black italic tracking-tighter leading-none">{formatCurrency(stats.balance)}</h3>
          <p className="text-[10px] mt-4 font-bold uppercase tracking-wider opacity-60">Resultato Operational</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Income Distribution Chart */}
        <div className="p-8 bg-white border border-gray-100 rounded-[32px] shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <PieChartIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 leading-none">Receitas por Método</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.incomeByMethod}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.incomeByMethod.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Distribution Chart */}
        <div className="p-8 bg-white border border-gray-100 rounded-[32px] shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-rose-50 rounded-xl">
              <TrendingDown className="w-5 h-5 text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 leading-none">Despesas por Categoria</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.expensesByCategory} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                  {stats.expensesByCategory.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white border border-gray-100 rounded-[32px] shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 leading-none">Transações no Período</h3>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{filteredData.payments.length + filteredData.expenses.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição / Aluno</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria / Método</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {/* Combine and sort by date */}
              {[
                ...filteredData.payments.map(p => ({ ...p, _type: 'payment' })),
                ...filteredData.expenses.map(e => ({ ...e, _type: 'expense' }))
              ].sort((a, b) => {
                const bDate = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date || 0).getTime();
                const aDate = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date || 0).getTime();
                return bDate - aDate;
              }).map((item: any) => (
                <tr key={`${item._type}-${item.id}`} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <span className="text-xs font-black text-gray-900">
                      {format(item.date?.toDate ? item.date.toDate() : new Date(item.date || Date.now()), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                      item._type === 'payment' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {item._type === 'payment' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900">
                        {item._type === 'payment' ? (students.find(s => s.id === item.studentId)?.name || 'Visitante') : item.description}
                      </span>
                      {item.description && item._type === 'payment' && <span className="text-[10px] text-gray-400 font-medium">{item.description}</span>}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-xs font-bold text-gray-500 uppercase">
                    {item._type === 'payment' ? item.method : item.category}
                  </td>
                  <td className={cn(
                    "px-8 py-5 text-right font-black italic tracking-tighter text-lg",
                    item._type === 'payment' ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {item._type === 'payment' ? '+' : '-'}{formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
