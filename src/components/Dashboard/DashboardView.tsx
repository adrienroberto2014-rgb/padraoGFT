import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, 
  CreditCard, 
  AlertCircle, 
  ChevronRight, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ShoppingCart
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, setYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { useStudents } from '../../application/hooks/useStudents';
import { usePayments } from '../../application/hooks/usePayments';
import { useExpenses } from '../../application/hooks/useExpenses';
import { useClasses } from '../../application/hooks/useClasses';
import { useProducts } from '../../application/hooks/useProducts';
import { useCheckIn } from '../../application/hooks/useCheckIn';
import { useBelts } from '../../application/hooks/useBelts';
import { usePlans } from '../../application/hooks/usePlans';
import { StatCard } from '../ui/StatCard';
import { GraduationSuggestions } from './GraduationSuggestions';
import { formatCurrency, cn, normalizeBeltName } from '../../utils/formatters';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export const DashboardView = ({ onNavigate }: DashboardViewProps) => {
  const { isAdmin, permissions, gymInfo, user } = useAuth();
  const { belts } = useBelts();
  const { plans } = usePlans(true);
  const { students } = useStudents(true, isAdmin || permissions.students, (isAdmin || permissions.students) ? undefined : user?.email);
  const { payments } = usePayments(true, isAdmin || permissions.finance);
  const { expenses } = useExpenses(isAdmin || permissions.finance);
  const { classes } = useClasses(true);
  const { products } = useProducts(true);
  const { checkIns } = useCheckIn(true, isAdmin || permissions.students);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    activeBJJ: 0,
    activeMuayThai: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    pendingPayments: 0
  });
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [presenceData, setPresenceData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis'>('overview');

  useEffect(() => {
    const now = new Date();
    const currentMonth = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    
    const revenue = payments
      .filter((p: any) => p.period === currentMonth)
      .reduce((acc: number, curr: any) => {
        const amount = Number(curr.amount);
        return acc + (isNaN(amount) ? 0 : amount);
      }, 0);

    const monthlyExpenses = (expenses || [])
      .filter((e: any) => {
        if (!e.date) return false;
        const eDate = e.date.toDate ? e.date.toDate() : new Date(e.date);
        return eDate.getMonth() === now.getMonth() && eDate.getFullYear() === now.getFullYear();
      })
      .reduce((acc: number, curr: any) => {
        const amount = Number(curr.amount);
        return acc + (isNaN(amount) ? 0 : amount);
      }, 0);
    
    const paidStudentIds = new Set(payments.filter((p: any) => p.period === currentMonth).map((p: any) => p.studentId));
    const nonArchivedStudents = students.filter((s: any) => s.status !== 'Archived');
    const activeStudents = nonArchivedStudents.filter((s: any) => s.status === 'Active');
    
    // Logic for pending considering special cases (Gympass, Totalpass, Projects)
    const pending = activeStudents.filter((s: any) => {
      // If already paid, not pending
      if (paidStudentIds.has(s.id)) return false;
      
      // Check if it's an administrative/special case
      const plan = (plans || []).find(p => p.id === s.planId);
      const planName = (plan?.name || "").toLowerCase();
      const isSpecialCase = 
        planName.includes('gympass') || 
        planName.includes('total pass') || 
        planName.includes('totalpass') || 
        planName.includes('projeto') ||
        !!s.gympassId;
        
      if (isSpecialCase) return false;
      
      return true;
    }).length;

    setStats({
      totalStudents: nonArchivedStudents.length,
      activeStudents: activeStudents.length,
      activeBJJ: activeStudents.filter(s => (s.modalities || ['Jiu-Jitsu']).includes('Jiu-Jitsu')).length,
      activeMuayThai: activeStudents.filter(s => (s.modalities || []).includes('Muay Thai')).length,
      monthlyRevenue: revenue,
      monthlyExpenses: monthlyExpenses,
      pendingPayments: pending
    });

    // Birthdays of the week
    const start = startOfWeek(now, { weekStartsOn: 0 });
    const end = endOfWeek(now, { weekStartsOn: 0 });

    const bdays = nonArchivedStudents.filter((s: any) => {
      if (!s.birthDate) return false;
      try {
        const birthDate = parseISO(s.birthDate);
        const thisYearBday = setYear(birthDate, now.getFullYear());
        const nextYearBday = setYear(birthDate, now.getFullYear() + 1);
        const lastYearBday = setYear(birthDate, now.getFullYear() - 1);

        return isWithinInterval(thisYearBday, { start, end }) ||
               isWithinInterval(nextYearBday, { start, end }) ||
               isWithinInterval(lastYearBday, { start, end });
      } catch (e) {
        return false;
      }
    }).sort((a, b) => {
      const dayA = parseInt(a.birthDate.split('-')[2]);
      const monthA = parseInt(a.birthDate.split('-')[1]);
      const dayB = parseInt(b.birthDate.split('-')[2]);
      const monthB = parseInt(b.birthDate.split('-')[1]);
      if (monthA !== monthB) return monthA - monthB;
      return dayA - dayB;
    });
    setBirthdays(bdays);

    // Low stock
    const lowStock = (products || []).filter((p: any) => p.stock <= (p.minStock || 5));
    setLowStockProducts(lowStock);

    // Presence Data (Last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return format(d, 'yyyy-MM-dd');
    }).reverse();

    const presence = last7Days.map(day => {
      const dayCheckins = checkIns.filter(c => {
        if (!c.time) return false;
        const cDate = c.time.toDate ? c.time.toDate() : new Date(c.time);
        return format(cDate, 'yyyy-MM-dd') === day;
      });

      return {
        day: format(new Date(day), 'EEE', { locale: ptBR }),
        bjj: dayCheckins.filter(c => c.modality === 'Jiu-Jitsu' || !c.modality).length,
        muayThai: dayCheckins.filter(c => c.modality === 'Muay Thai').length,
        count: dayCheckins.length
      };
    });
    setPresenceData(presence);

  }, [students, payments, expenses, products, checkIns]);

  const recentStudents = students.filter((s: any) => s.status !== 'Archived').slice(0, 5);
  const upcomingClasses = classes.slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in transition-all duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-medium text-zinc-900 dark:text-white tracking-tight">
            {gymInfo?.name || "Dashboard"}
          </h1>
          <p className="text-sm text-zinc-500 font-medium tracking-tight">
            {gymInfo ? `Resumo para a unidade ${gymInfo.name}.` : "Bem-vindo ao DojoSync. Aqui está o resumo da sua academia."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate('inventory')}
            className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold transition-all hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-md active:scale-95"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Nova Venda</span>
          </button>
          
          <div className="flex bg-zinc-100 dark:bg-white/5 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('overview')}
              className={cn(
                "px-5 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === 'overview' ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              Visão Geral
            </button>
            <button 
              onClick={() => setActiveTab('analysis')}
              className={cn(
                "px-5 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === 'analysis' ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              Análise
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-12 gap-6">
          {/* Stats Row */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <StatCard title="Total de Alunos" value={stats.totalStudents} icon={Users} color="bg-zinc-900 text-white dark:bg-white dark:text-black" />
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <StatCard title="Membros Ativos" value={stats.activeStudents} icon={CheckCircle2} color="bg-emerald-500 text-white" />
          </div>
          {(isAdmin || permissions.finance) && (
            <>
              <div className="col-span-12 sm:col-span-6 lg:col-span-3">
                <StatCard 
                  title="Lucro Mensal (DRE)" 
                  value={formatCurrency(stats.monthlyRevenue - stats.monthlyExpenses)} 
                  icon={CreditCard} 
                  color={stats.monthlyRevenue - stats.monthlyExpenses >= 0 ? "bg-zinc-900 text-white dark:bg-white dark:text-black" : "bg-rose-500 text-white"} 
                />
              </div>
              <div className="col-span-12 sm:col-span-6 lg:col-span-3">
                <StatCard title="Faturas Pendentes" value={stats.pendingPayments} icon={AlertCircle} color="bg-rose-500 text-white" />
              </div>
            </>
          )}

          {/* Main Bento Area */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* Presence Chart - Recipe 1 Inspired */}
            <div className="premium-card p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-50 dark:bg-white/5 rounded-lg">
                    <BarChart3 className="w-4 h-4 text-zinc-900 dark:text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">Frequência Ativa</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-none">Presenças nos últimos 7 dias</p>
                  </div>
                </div>
                {presenceData.some(d => d.count > 0) && (
                  <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-bold">
                    <TrendingUp className="w-3 h-3" />
                    +12.5% crescimento
                  </div>
                )}
              </div>
              
              {presenceData.some(d => d.count > 0) ? (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={presenceData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                      <XAxis 
                        dataKey="day" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 600, fill: '#71717a' }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 600, fill: '#71717a' }}
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          backgroundColor: '#fff',
                          padding: '12px'
                        }}
                        itemStyle={{ fontSize: '11px', fontWeight: 700 }}
                        labelStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px', color: '#18181b' }}
                      />
                      <Bar dataKey="bjj" stackId="a" fill="#18181b" radius={[0, 0, 0, 0]} name="BJJ" barSize={16} />
                      <Bar dataKey="muayThai" stackId="a" fill="#a1a1aa" radius={[4, 4, 0, 0]} name="Muay Thai" barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[280px] flex flex-col items-center justify-center text-center p-6 bg-zinc-50/50 dark:bg-white/2 rounded-2xl border border-dashed border-zinc-200 dark:border-white/10">
                  <Clock className="w-10 h-10 text-zinc-200 dark:text-zinc-800 mb-3" />
                  <p className="text-xs text-zinc-400 italic">Nenhum check-in registrado nos últimos 7 dias.</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="premium-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Novos Alunos</h3>
                  <button onClick={() => onNavigate('students')} className="text-xs font-bold text-zinc-400 hover:text-zinc-900 transition-colors uppercase">Ver Todos</button>
                </div>
                <div className="space-y-4">
                  {recentStudents.length > 0 ? (
                    recentStudents.map(student => (
                      <div key={`recent-${student.id}`} className="flex items-center justify-between group cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-xs font-bold text-zinc-500 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-900 dark:text-white">{student.name}</p>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">{normalizeBeltName(student.belt)}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-900 group-hover:translate-x-1 transition-all" />
                      </div>
                    ))
                  ) : (
                    <p className="py-8 text-center text-zinc-400 text-xs italic">No members found.</p>
                  )}
                </div>
              </div>

              <div className="premium-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Próximas Aulas</h3>
                  <button onClick={() => onNavigate('classes')} className="text-xs font-bold text-zinc-400 hover:text-zinc-900 transition-colors uppercase">Ver Agenda</button>
                </div>
                <div className="space-y-3">
                  {upcomingClasses.length > 0 ? (
                    upcomingClasses.map(cls => (
                      <div key={`dashboard-class-${cls.id}`} className="flex items-center p-3 bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-100 dark:border-white/5 group hover:border-zinc-200 transition-all">
                        <div className="w-10 h-10 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-100 dark:border-white/10 group-hover:scale-105 transition-transform">
                          <Clock className="w-4 h-4 text-zinc-400" />
                        </div>
                        <div className="ml-3">
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-white">{cls.name}</h4>
                          <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-tighter">
                            {cls.dayOfWeek} • {typeof cls.startTime === 'string' ? cls.startTime : (cls.startTime ? format(cls.startTime.toDate ? cls.startTime.toDate() : new Date(cls.startTime), 'HH:mm') : '')}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-8 text-center text-zinc-400 text-xs italic">No classes scheduled.</p>
                  )}
                </div>
              </div>
            </div>

            <GraduationSuggestions students={students} checkIns={checkIns} belts={belts} />
          </div>

          {/* Side Info Bento Area */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Birthdays Section */}
            <div className="premium-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 bg-rose-50 dark:bg-rose-500/10 rounded-lg">
                  <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Aniversariantes</h3>
              </div>
              <div className="space-y-3">
                {birthdays.length > 0 ? (
                  birthdays.map(student => {
                    const bdayDate = parseISO(student.birthDate);
                    const isToday = format(new Date(), 'MM-dd') === format(bdayDate, 'MM-dd');
                    
                    return (
                      <div key={`birthday-${student.id}`} className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all",
                        isToday ? "bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20 scale-[1.02]" : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-white/5"
                      )}>
                        <div className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs",
                          isToday ? "bg-rose-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                        )}>
                          {student.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{student.name}</p>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase">
                              {format(bdayDate, "dd/MM")}
                            </p>
                          </div>
                          <p className={cn(
                            "text-[10px] font-bold uppercase tracking-tight",
                            isToday ? "text-rose-500" : "text-zinc-400"
                          )}>
                            {isToday ? "It's their day! 🎂" : "Upcoming"}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[10px] text-zinc-400 text-center py-4 italic uppercase tracking-widest">No birthdays this week</p>
                )}
              </div>
            </div>

            {/* Low Stock Alerts */}
            {(isAdmin || permissions.inventory) && (
              <div className="premium-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-1.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Alertas de Estoque</h3>
                </div>
                <div className="space-y-3">
                  {lowStockProducts.length > 0 ? (
                    lowStockProducts.map(product => (
                      <div key={`lowstock-${product.id}`} className="flex items-center justify-between p-3 bg-amber-50/30 dark:bg-amber-500/5 rounded-xl border border-amber-100/50 dark:border-amber-500/10">
                        <div>
                          <p className="text-xs font-bold text-zinc-900 dark:text-white">{product.name}</p>
                          <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-tight">{product.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-amber-600">{product.stock}</p>
                          <p className="text-[9px] text-zinc-400 font-bold uppercase">Unid</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-zinc-400 text-center py-4 italic uppercase tracking-widest">Estoque saudável</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="premium-card p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-zinc-900 text-white dark:bg-white dark:text-black rounded-xl flex items-center justify-center font-bold text-sm">BJJ</div>
              <div>
                <p className="text-2xl font-display font-medium text-zinc-900 dark:text-white tracking-tight">{stats.activeBJJ}</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Alunos Ativos Jiu-Jitsu</p>
              </div>
            </div>
            <div className="premium-card p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl flex items-center justify-center font-bold text-sm">MT</div>
              <div>
                <p className="text-2xl font-display font-medium text-zinc-900 dark:text-white tracking-tight">{stats.activeMuayThai}</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Alunos Ativos Muay Thai</p>
              </div>
            </div>
          </div>

          <div className="premium-card p-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-xl font-display font-medium text-zinc-900 dark:text-white tracking-tight">Análise de Check-ins</h3>
                <p className="text-xs text-zinc-500 font-medium">Distribuição por modalidade nos últimos 7 dias</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 dark:bg-white" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Jiu-Jitsu</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Muay Thai</span>
                </div>
              </div>
            </div>
            
            {presenceData.some(d => d.count > 0) ? (
              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={presenceData}>
                    <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#e2e8f0" strokeOpacity={0.4} />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fontWeight: 600, fill: '#71717a' }}
                      dy={10}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#71717a' }} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 800, textTransform: 'uppercase', color: '#18181b', marginBottom: '8px' }}
                    />
                    <Bar dataKey="bjj" stackId="a" fill="#18181b" radius={[0, 0, 0, 0]} name="BJJ" barSize={32} />
                    <Bar dataKey="muayThai" stackId="a" fill="#a1a1aa" radius={[8, 8, 0, 0]} name="Muay Thai" barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-center p-12 bg-zinc-50/50 dark:bg-white/2 rounded-3xl border border-dashed border-zinc-200 dark:border-white/10">
                <Clock className="w-12 h-12 text-zinc-200 dark:text-zinc-800 mb-4" />
                <p className="text-zinc-400 italic text-sm">Dados insuficientes para análise de check-ins.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
