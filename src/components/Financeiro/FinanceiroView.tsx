import React, { useState, useEffect } from 'react';
import { 
  Download, 
  FileText, 
  Plus, 
  DollarSign, 
  Filter, 
  Edit2, 
  Trash2,
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  X,
  MessageCircle,
  Search,
  ShoppingCart
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useFinance } from '../../application/hooks/useFinance';
import { useExpenses } from '../../application/hooks/useExpenses';
import { useInstallments } from '../../application/hooks/useInstallments';
import { useSubscriptions } from '../../application/hooks/useSubscriptions';
import { useInvoices } from '../../application/hooks/useInvoices';
import { useStudents } from '../../application/hooks/useStudents';
import { usePlans } from '../../application/hooks/usePlans';
import { SubscriptionsView } from './SubscriptionsView';
import { InvoicesView } from './InvoicesView';
import { formatCurrency, cn } from '../../utils/formatters';
import toast from 'react-hot-toast';

interface FinanceiroViewProps {
  onNavigate: (tab: string) => void;
  settings: any;
}

export const FinanceiroView = ({ 
  onNavigate,
  settings
}: FinanceiroViewProps) => {
  const { isAdmin, isReceptionist, permissions } = useAuth();
  
  const { 
    payments, 
    registerPayment, 
    receiveInstallment, 
    updatePayment, 
    deletePayment,
    deleteInstallment,
    createInstallments
  } = useFinance();
  
  const { 
    expenses, 
    addExpense, 
    updateExpense, 
    deleteExpense 
  } = useExpenses(isAdmin || permissions.finance);
  
  const { 
    installments
  } = useInstallments(isAdmin || permissions.finance);
  
  const { subscriptions } = useSubscriptions(isAdmin || permissions.finance);
  const { invoices } = useInvoices(isAdmin || permissions.finance);
  const { students, updateStudent } = useStudents(true, isAdmin || permissions.students);
  const { plans } = usePlans(true);

  const [activeSubTab, setActiveSubTab] = useState('history');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<any>(null);
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [installmentPaymentData, setInstallmentPaymentData] = useState({ method: 'Pix' });

  const [paymentType, setPaymentType] = useState<'single' | 'installments'>('single');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [installmentFilter, setInstallmentFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    studentId: '',
    amount: '',
    method: 'Pix',
    period: format(new Date(), 'yyyy-MM'),
    date: new Date().toISOString().split('T')[0],
    productName: '',
    installmentsCount: '2',
    monthsCount: 1
  });

  const [expenseFormData, setExpenseFormData] = useState({
    description: '',
    amount: '',
    category: 'Aluguel',
    date: new Date().toISOString().split('T')[0]
  });

  // Chart Data
  const [chartData, setChartData] = useState<any[]>([]);
  const [expenseDistribution, setExpenseDistribution] = useState<any[]>([]);

  useEffect(() => {
    // Last 6 months data
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return format(d, 'MM/yyyy');
    }).reverse();

    const data = last6Months.map(month => {
      const monthRevenue = payments.filter(p => {
        const pDate = p.date?.seconds ? new Date(p.date.seconds * 1000) : (p.date instanceof Date ? p.date : new Date(p.date));
        return !isNaN(pDate.getTime()) && format(pDate, 'MM/yyyy') === month;
      }).reduce((acc, curr) => {
        const amount = Number(curr.amount);
        return acc + (isNaN(amount) ? 0 : amount);
      }, 0);

      const monthExpenses = (expenses || []).filter(e => {
        const eDate = e.date?.seconds ? new Date(e.date.seconds * 1000) : (e.date instanceof Date ? e.date : new Date(e.date));
        return !isNaN(eDate.getTime()) && format(eDate, 'MM/yyyy') === month;
      }).reduce((acc, curr) => {
        const amount = Number(curr.amount);
        return acc + (isNaN(amount) ? 0 : amount);
      }, 0);

      return {
        name: month,
        receita: monthRevenue,
        despesa: monthExpenses
      };
    });
    setChartData(data);

    // Expense Distribution
    const categories: any = {};
    (expenses || []).forEach(e => {
      const amount = Number(e.amount);
      const validAmount = isNaN(amount) ? 0 : amount;
      categories[e.category] = (categories[e.category] || 0) + validAmount;
    });
    const distribution = Object.keys(categories).map(cat => ({
      name: cat,
      value: categories[cat]
    }));
    setExpenseDistribution(distribution);

  }, [payments, expenses]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (paymentType === 'single') {
        const [rYear, rMonth] = formData.period.split('-').map(Number);
        const referenceDate = new Date(rYear, rMonth - 1, 1);
        const formattedPeriod = format(referenceDate, 'MMMM yyyy', { locale: ptBR });

        const data = {
          studentId: formData.studentId,
          amount: parseFloat(formData.amount),
          method: formData.method as any,
          period: formattedPeriod,
          date: new Date(formData.date),
          monthsCount: formData.monthsCount
        };

        if (editingPayment) {
          await updatePayment(editingPayment.id, data);
          toast.success("Pagamento atualizado!");
        } else {
          await registerPayment(data);
        }
      } else {
        // Handle Installments
        await createInstallments({
          studentId: formData.studentId,
          productName: formData.productName || 'Venda Diversa',
          totalAmount: parseFloat(formData.amount),
          installmentsCount: parseInt(formData.installmentsCount),
          startDate: new Date(formData.date),
          paymentMethod: formData.method
        });
      }

      setIsModalOpen(false);
      setEditingPayment(null);
      setFormData({
        studentId: '',
        amount: '',
        method: 'Pix',
        period: format(new Date(), 'yyyy-MM'),
        date: new Date().toISOString().split('T')[0],
        productName: '',
        installmentsCount: '2',
        monthsCount: 1
      });
    } catch (error) {
      console.error("Error processing payment:", error);
    }
  };

  const handleReceiveInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstallment) return;
    try {
      await receiveInstallment(selectedInstallment, installmentPaymentData.method);
      setIsInstallmentModalOpen(false);
      setSelectedInstallment(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteInstallment = async (id: string) => {
    if (window.confirm("Deseja realmente excluir esta parcela?")) {
      try {
        await deleteInstallment(id);
        toast.success("Parcela excluída.");
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleWhatsAppCollection = (inst: any) => {
    const student = students.find(s => s.id === inst.studentId);
    if (!student?.phone) {
      toast.error("Aluno sem telefone cadastrado.");
      return;
    }

    const message = `Olá ${student.name}, tudo bem? Passando para lembrar da sua parcela de ${inst.productName} (${inst.installmentNumber}/${inst.totalInstallments}) no valor de ${formatCurrency(inst.amount)}, com vencimento em ${format(new Date(inst.dueDate.seconds * 1000), 'dd/MM/yyyy')}. Segue nossa chave PIX para pagamento: [SUA CHAVE PIX AQUI]. Oss!`;
    const encodedMessage = encodeURIComponent(message);
    const phone = student.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${encodedMessage}`, '_blank');
  };

  const filteredInstallments = (installments || []).filter(inst => {
    const matchesSearch = inst.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         inst.productName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    const isOverdue = inst.status === 'pending' && 
                     inst.dueDate?.seconds && 
                     new Date(inst.dueDate.seconds * 1000) < new Date();

    if (installmentFilter === 'all') return true;
    if (installmentFilter === 'overdue') return isOverdue;
    if (installmentFilter === 'pending') return inst.status === 'pending' && !isOverdue;
    return inst.status === installmentFilter;
  });

  const filteredPayments = payments.filter(p => {
    const student = students.find(s => s.id === p.studentId);
    return student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
           p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           p.method?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredExpenses = (expenses || []).filter(e => 
    e.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const COLORS = ['#111827', '#4b5563', '#9ca3af', '#e5e7eb', '#3b82f6', '#10b981'];

  const totalRevenue = payments.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
  const totalExpenses = (expenses || []).reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-black italic uppercase tracking-tighter">Financeiro</h1>
          <p className="text-gray-500 font-medium">Controle de fluxo de caixa e mensalidades.</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button 
              onClick={() => onNavigate('reports')}
              className="flex items-center justify-center px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
            >
              <Download className="w-4 h-4 mr-2" />
              Relatórios
            </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center px-6 py-2 text-sm font-bold text-white bg-black rounded-xl hover:bg-gray-800 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Lançamento
          </button>
        </div>
      </header>

      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Financial Chart */}
          <div className="lg:col-span-2 p-6 bg-white border border-gray-100 shadow-sm rounded-[32px]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Fluxo de Caixa</h3>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Últimos 6 meses</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Receita</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Despesa</span>
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="despesa" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Distribution */}
          <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-[32px]">
            <div className="flex items-center gap-2 mb-8">
              <PieChartIcon className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-bold text-gray-900">Distribuição de Gastos</h3>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseDistribution}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 space-y-2">
              {expenseDistribution.slice(0, 4).map((item, i) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs font-bold text-gray-500 uppercase">{item.name}</span>
                  </div>
                  <span className="text-xs font-black text-gray-900">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-emerald-500 rounded-[32px] text-white shadow-xl shadow-emerald-500/20">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">Receita Total</p>
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-3xl font-black italic tracking-tighter">{formatCurrency(totalRevenue)}</h3>
          </div>
          <div className="p-6 bg-rose-500 rounded-[32px] text-white shadow-xl shadow-rose-500/20">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">Despesas Totais</p>
              <TrendingDown className="w-5 h-5" />
            </div>
            <h3 className="text-3xl font-black italic tracking-tighter">{formatCurrency(totalExpenses)}</h3>
          </div>
          <div className="p-6 bg-black rounded-[32px] text-white shadow-xl shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">Saldo em Caixa</p>
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-3xl font-black italic tracking-tighter">{formatCurrency(totalRevenue - totalExpenses)}</h3>
          </div>
        </div>
      )}

      {/* Tabs and List logic */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-[32px] overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => { setActiveSubTab('history'); setSearchTerm(''); }}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                activeSubTab === 'history' ? "bg-black text-white" : "text-gray-400 hover:bg-gray-50"
              )}
            >
              Fluxo de Caixa
            </button>
            <button 
              onClick={() => { setActiveSubTab('subscriptions'); setSearchTerm(''); }}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                activeSubTab === 'subscriptions' ? "bg-black text-white" : "text-gray-400 hover:bg-gray-50"
              )}
            >
              Assinaturas
            </button>
            <button 
              onClick={() => { setActiveSubTab('invoices'); setSearchTerm(''); }}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                activeSubTab === 'invoices' ? "bg-black text-white" : "text-gray-400 hover:bg-gray-50"
              )}
            >
              Faturas
            </button>
            <button 
              onClick={() => { setActiveSubTab('expenses'); setSearchTerm(''); }}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                activeSubTab === 'expenses' ? "bg-black text-white" : "text-gray-400 hover:bg-gray-50"
              )}
            >
              Despesas
            </button>
            <button 
              onClick={() => { setActiveSubTab('installments'); setSearchTerm(''); }}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                activeSubTab === 'installments' ? "bg-black text-white" : "text-gray-400 hover:bg-gray-50"
              )}
            >
              Parcelas Vendas
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute w-4 h-4 text-gray-400 left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-gray-200 outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {activeSubTab === 'installments' && (
              <div className="flex bg-gray-100 p-1 rounded-xl">
                {(['all', 'pending', 'overdue', 'paid'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setInstallmentFilter(f)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      installmentFilter === f ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendentes' : f === 'overdue' ? 'Atrasadas' : 'Pagas'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-8">
          {activeSubTab === 'subscriptions' ? (
            <SubscriptionsView subscriptions={subscriptions} />
          ) : activeSubTab === 'invoices' ? (
            <InvoicesView invoices={invoices} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                {activeSubTab === 'installments' ? (
                  <>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cliente / Produto</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Parcela</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vencimento</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valor</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ações</th>
                  </>
                ) : (
                  <>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descrição / Aluno</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valor</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Categoria / Método</th>
                    {isAdmin && <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Ações</th>}
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {activeSubTab === 'history' ? (
                filteredPayments.length > 0 ? filteredPayments.map(p => (
                  <tr key={`payment-${p.id}`} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{students.find(s => s.id === p.studentId)?.name || 'Visitante'}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{p.period}</p>
                          {p.description && <p className="text-[9px] text-gray-400 italic">{p.description}</p>}
                        </div>
                      </div>
                    </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-black text-emerald-600">{formatCurrency(p.amount)}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm text-gray-500 font-medium">
                      {p.date?.seconds ? format(new Date(p.date.seconds * 1000), 'dd/MM/yyyy') : 
                       (p.date ? format(new Date(p.date), 'dd/MM/yyyy') : 'N/A')}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      {p.method === 'Pix' ? 'Pix' : 
                       p.method === 'Card' ? 'Cartão' : 
                       p.method === 'Cash' ? 'Dinheiro' : 
                       p.method === 'Transfer' ? 'Transferência' : p.method}
                    </span>
                  </td>
                    {isAdmin && (
                      <td className="px-8 py-5 text-right">
                        <button 
                          onClick={async () => {
                            if (window.confirm("Deseja excluir este pagamento?")) {
                              await deletePayment(p.id);
                              toast.success("Pagamento excluído.");
                            }
                          }}
                        className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              )) : null) : activeSubTab === 'expenses' ? filteredExpenses.map(e => (
                <tr key={`expense-${e.id}`} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-gray-900">{e.description}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-black text-rose-600">{formatCurrency(e.amount)}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm text-gray-500 font-medium">
                      {e.date?.seconds ? format(new Date(e.date.seconds * 1000), 'dd/MM/yyyy') : 
                       (e.date ? format(new Date(e.date), 'dd/MM/yyyy') : 'N/A')}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-gray-900 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                      {e.category}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={async () => {
                          if (window.confirm("Deseja excluir esta despesa?")) {
                            await deleteExpense(e.id);
                            toast.success("Despesa excluída.");
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              )) : filteredInstallments.map(inst => (
                <tr key={`installment-${inst.id}`} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                          <ShoppingCart className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{inst.studentName}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{inst.productName}</p>
                        </div>
                      </div>
                    </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-bold text-gray-500">{inst.installmentNumber}/{inst.totalInstallments}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm text-gray-500 font-medium">
                      {inst.dueDate?.seconds ? format(new Date(inst.dueDate.seconds * 1000), 'dd/MM/yyyy') : 
                       (inst.dueDate ? format(new Date(inst.dueDate), 'dd/MM/yyyy') : 'N/A')}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-black text-gray-900">{formatCurrency(inst.amount)}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider",
                      inst.status === 'paid' ? "bg-emerald-50 text-emerald-600" : 
                      (inst.status === 'pending' && inst.dueDate?.seconds && new Date(inst.dueDate.seconds * 1000) < new Date()) ? "bg-rose-50 text-rose-600" :
                      "bg-amber-50 text-amber-600"
                    )}>
                      {inst.status === 'paid' ? 'Pago' : 
                       (inst.status === 'pending' && inst.dueDate?.seconds && new Date(inst.dueDate.seconds * 1000) < new Date()) ? 'Atrasado' : 
                       'Pendente'}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      {inst.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleWhatsAppCollection(inst)}
                            className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-md"
                            title="Cobrar via WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedInstallment(inst);
                              setInstallmentPaymentData({ method: inst.paymentMethod || 'Pix' });
                              setIsInstallmentModalOpen(true);
                            }}
                            className="p-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all shadow-md"
                            title="Receber Parcela"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => handleDeleteInstallment(inst.id)}
                        className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                        title="Excluir Parcela"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {activeSubTab === 'history' && filteredPayments.length === 0 && (
            <div className="py-20 text-center text-slate-500">
              <FileText className="mx-auto h-12 w-12 text-slate-200 mb-4" />
              <p>Nenhum lançamento encontrado</p>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
      {/* Modal de Pagamento */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter">Novo Pagamento</h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleAddPayment} className="space-y-6">
                  <div className="flex bg-gray-100 p-1 rounded-2xl mb-2">
                    <button
                      type="button"
                      onClick={() => setPaymentType('single')}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                        paymentType === 'single' ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      Pagamento Único
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentType('installments')}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                        paymentType === 'installments' ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      Parcelamento
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-2">Aluno</label>
                    <select 
                      required
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all appearance-none font-bold"
                      value={formData.studentId}
                      onChange={(e) => {
                        const student = students.find(s => s.id === e.target.value);
                        setFormData({ 
                          ...formData, 
                          studentId: e.target.value,
                          amount: student?.monthlyFee?.toString() || ''
                        });
                      }}
                    >
                      <option value="">Selecione o aluno</option>
                      {students.filter(s => s.status === 'Active').map(s => (
                        <option key={`student-payment-modal-${s.id}`} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {paymentType === 'installments' && (
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-2">O que está sendo parcelado?</label>
                      <input 
                        required type="text"
                        placeholder="Ex: Kimono, Exame de Faixa, etc"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-bold"
                        value={formData.productName}
                        onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-2">Mês Referência</label>
                      <input 
                        required type="month"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-bold"
                        value={formData.period}
                        onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                      />
                    </div>
                    {paymentType === 'single' && (
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-2">Qtd. Meses</label>
                        <input 
                          required type="number" min="1"
                          className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-bold"
                          value={formData.monthsCount}
                          onChange={(e) => {
                            const count = parseInt(e.target.value) || 1;
                            const student = students.find(s => s.id === formData.studentId);
                            const plan = plans.find(p => p.id === student?.planId);
                            setFormData({ 
                              ...formData, 
                              monthsCount: count,
                              amount: ((student?.monthlyFee || plan?.price || 0) * count).toString()
                            });
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className={cn("grid gap-4", paymentType === 'installments' ? "grid-cols-2" : "grid-cols-1")}>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-2">
                        {paymentType === 'single' ? 'Valor (R$)' : 'Valor Total (R$)'}
                      </label>
                      <input 
                        required type="number" step="0.01"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-bold"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      />
                    </div>
                    {paymentType === 'installments' && (
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-2">Parcelas</label>
                        <select 
                          className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all appearance-none font-bold"
                          value={formData.installmentsCount}
                          onChange={(e) => setFormData({ ...formData, installmentsCount: e.target.value })}
                        >
                          {[2,3,4,5,6,10,12].map(n => (
                            <option key={`opt-inst-${n}`} value={n}>{n}x</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-2">Método</label>
                      <select 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all appearance-none font-bold"
                        value={formData.method}
                        onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                      >
                        <option value="Pix">Pix</option>
                        <option value="Card">Cartão</option>
                        <option value="Cash">Dinheiro</option>
                        <option value="Transfer">Transferência</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-2">Data Início</label>
                      <input 
                        type="date"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-bold"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                  </div>

                  <button type="submit" className="w-full py-5 bg-black text-white font-black text-lg rounded-2xl hover:bg-gray-800 transition-all shadow-xl uppercase italic tracking-tighter">
                    {paymentType === 'single' ? 'Confirmar Recebimento' : 'Gerar Parcelas'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Receber Parcela */}
      <AnimatePresence>
        {isInstallmentModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsInstallmentModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8 text-left">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter">Receber Parcela</h2>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                    {selectedInstallment?.productName} • {selectedInstallment?.installmentNumber}/{selectedInstallment?.totalInstallments}
                  </p>
                </div>
              </div>

              <div className="mb-8 p-6 bg-gray-50 rounded-3xl">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Valor a Receber</p>
                <p className="text-3xl font-black text-gray-900 italic tracking-tighter">{formatCurrency(selectedInstallment?.amount || 0)}</p>
                <p className="text-xs font-medium text-gray-500 mt-2">Cliente: {selectedInstallment?.studentName}</p>
              </div>

              <form onSubmit={handleReceiveInstallment} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Confirmar Forma de Pagamento</label>
                  <select 
                    className="w-full px-6 py-4 bg-white border border-gray-100 rounded-2xl outline-none font-bold appearance-none shadow-sm"
                    value={installmentPaymentData.method}
                    onChange={e => setInstallmentPaymentData({...installmentPaymentData, method: e.target.value})}
                  >
                    <option value="Pix">Pix</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Transferência">Transferência</option>
                  </select>
                </div>

                <button type="submit" className="w-full py-5 bg-black text-white font-black rounded-[24px] hover:bg-gray-800 transition-all uppercase italic tracking-widest shadow-xl">
                  Confirmar Recebimento
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Despesa */}
      <AnimatePresence>
        {isExpenseModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsExpenseModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter">Nova Despesa</h2>
                  <button onClick={() => setIsExpenseModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await addExpense({
                      description: expenseFormData.description,
                      amount: parseFloat(expenseFormData.amount),
                      category: expenseFormData.category,
                      date: new Date(expenseFormData.date)
                    });
                    toast.success("Despesa registrada!");
                    setIsExpenseModalOpen(false);
                  } catch (err) {
                    console.error("Error saving expense:", err);
                    toast.error("Erro ao salvar despesa.");
                  }
                }} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Descrição</label>
                    <input 
                      required type="text"
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                      value={expenseFormData.description}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Valor (R$)</label>
                      <input 
                        required type="number" step="0.01"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        value={expenseFormData.amount}
                        onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Categoria</label>
                      <select 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all appearance-none"
                        value={expenseFormData.category}
                        onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value })}
                      >
                        <option value="Aluguel">Aluguel</option>
                        <option value="Energia">Energia</option>
                        <option value="Água">Água</option>
                        <option value="Internet">Internet</option>
                        <option value="Limpeza">Limpeza</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Data</label>
                    <input 
                      type="date"
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                      value={expenseFormData.date}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
                    />
                  </div>

                  <button type="submit" className="w-full py-5 bg-rose-500 text-white font-black text-lg rounded-2xl hover:bg-rose-600 transition-all shadow-xl uppercase italic tracking-tighter">
                    Registrar Despesa
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
