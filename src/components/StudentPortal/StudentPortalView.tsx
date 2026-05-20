import React, { useState, useEffect, useMemo } from 'react';
import { 
  Award, 
  Calendar, 
  CreditCard, 
  User, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  ChevronRight,
  LogOut,
  ShieldAlert
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { useStudents } from '../../application/hooks/useStudents';
import { usePayments } from '../../application/hooks/usePayments';
import { useCheckIn } from '../../application/hooks/useCheckIn';
import { useEvaluations } from '../../application/hooks/useEvaluations';
import { useGraduations } from '../../application/hooks/useGraduations';
import { useInstallments } from '../../application/hooks/useInstallments';
import { useSettings } from '../../application/hooks/useSettings';
import { formatCurrency, cn, normalizeBeltName } from '../../utils/formatters';
import { Logo } from '../ui/Logo';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

export const StudentPortalView = () => {
  const { user, currentUser, logout } = useAuth();
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'finance' | 'timeline'>('dashboard');

  // 1. Get students linked by email OR explicitly linked ID
  const { students } = useStudents(true, false, user?.email, currentUser?.studentId);
  
  // 2. Find all students linked (email-matched + explicitly linked)
  const linkedStudents = useMemo(() => {
    // Combine students from hook (email matched) with explicitly linked student if it exists
    const list = [...students];
    return list;
  }, [students]);

  // 3. IDs for data fetching
  const linkedStudentIds = useMemo(() => 
    linkedStudents.map(s => s.id),
    [linkedStudents]
  );

  // 3. Fetch data ONLY for those linked students
  const { payments } = usePayments(true, false, linkedStudentIds);
  const { checkIns } = useCheckIn(true, false, linkedStudentIds);
  const { evaluations } = useEvaluations(true, false, linkedStudentIds);
  const { graduations } = useGraduations(true, false, linkedStudentIds);
  const { installments } = useInstallments(false);

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    // Auto-select if there's only one student and none is selected
    if (linkedStudents.length === 1 && !selectedStudentId) {
      setSelectedStudentId(linkedStudents[0].id);
    }
  }, [linkedStudents, selectedStudentId]);

  const studentData = useMemo(() => {
    return selectedStudentId ? linkedStudents.find(s => s.id === selectedStudentId) : null;
  }, [selectedStudentId, linkedStudents]);

  const myPayments = useMemo(() => {
    if (!studentData) return [];
    return payments
      .filter(p => p.studentId === studentData.id)
      .sort((a, b) => {
        const bDate = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date || 0).getTime();
        const aDate = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date || 0).getTime();
        return bDate - aDate;
      });
  }, [payments, studentData]);

  const myCheckIns = useMemo(() => {
    if (!studentData) return [];
    return checkIns
      .filter(c => c.studentId === studentData.id)
      .sort((a, b) => {
        const bDate = b.time?.toDate ? b.time.toDate().getTime() : new Date(b.time || 0).getTime();
        const aDate = a.time?.toDate ? a.time.toDate().getTime() : new Date(a.time || 0).getTime();
        return bDate - aDate;
      });
  }, [checkIns, studentData]);

  const myEvaluations = useMemo(() => {
    if (!studentData) return [];
    return evaluations
      .filter(e => e.studentId === studentData.id)
      .sort((a, b) => {
        const bDate = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date || 0).getTime();
        const aDate = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date || 0).getTime();
        return bDate - aDate;
      });
  }, [evaluations, studentData]);

  const myGraduations = useMemo(() => {
    if (!studentData) return [];
    return graduations
      .filter(g => g.studentId === studentData.id)
      .sort((a, b) => {
        const bDate = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date || 0).getTime();
        const aDate = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date || 0).getTime();
        return bDate - aDate;
      });
  }, [graduations, studentData]);

  const myInstallments = useMemo(() => {
    if (!studentData) return [];
    return installments
      .filter(i => i.studentId === studentData.id)
      .sort((a, b) => {
        const bDate = b.dueDate?.toDate ? b.dueDate.toDate().getTime() : new Date(b.dueDate || 0).getTime();
        const aDate = a.dueDate?.toDate ? a.dueDate.toDate().getTime() : new Date(a.dueDate || 0).getTime();
        return aDate - bDate;
      });
  }, [installments, studentData]);

  const hasPendingPayments = myPayments.some(p => p.status === 'Pending') || myInstallments.some(i => i.status === 'pending');

  const handlePayment = async () => {
    if (!studentData) return;
    const loadingToast = toast.loading('Iniciando pagamento...');
    try {
      const provider = settings?.paymentProvider || 'Stripe';
      
      if (provider === 'MercadoPago') {
        const response = await fetch('/api/mercado-pago/create-preference', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: studentData.monthlyFee || 150,
            studentId: studentData.id,
            studentName: studentData.name,
          }),
        });

        const preference = await response.json();
        
        if (preference.init_point) {
          toast.success('Redirecionando para o Mercado Pago...', { id: loadingToast });
          window.location.href = preference.init_point;
        } else {
          throw new Error('Falha ao criar preferência de pagamento');
        }
      } else {
        const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: studentData.monthlyFee || 150,
            studentId: studentData.id,
            studentName: studentData.name,
          }),
        });

        const session = await response.json();
        if (session.url) {
          toast.success('Redirecionando para o Stripe...', { id: loadingToast });
          window.location.href = session.url;
        } else {
          throw new Error('Falha ao criar sessão de pagamento');
        }
      }
    } catch (error) {
      console.error('Erro no pagamento:', error);
      toast.error('Erro ao iniciar pagamento. Verifique as configurações de API.', { id: loadingToast });
    }
  };

  // 1. No student found at all for this email
  if (linkedStudents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white rounded-[40px] border border-gray-100 shadow-sm">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
          <User className="w-10 h-10 text-gray-300" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 font-serif italic">Perfil não vinculado</h2>
        <p className="text-gray-500 max-w-xs text-sm mb-8">
          O e-mail <span className="font-bold text-black">{user?.email}</span> ainda não foi encontrado em nossa base de alunos. Procure a recepção para atualizar seu cadastro.
        </p>
        <button 
          onClick={logout} 
          className="px-8 py-3 bg-rose-50 text-rose-600 font-bold rounded-2xl flex items-center gap-2 hover:bg-rose-100 transition-all border border-rose-100 shadow-sm uppercase text-xs tracking-widest"
        >
          <LogOut className="w-5 h-5" />
          Desconectar Conta
        </button>
      </div>
    );
  }

  // 2. Multiple students found and none is currently selected
  if (!selectedStudentId || !studentData) {
    return (
      <div className="space-y-8 animate-in fade-in zoom-in duration-500 max-w-2xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-serif font-bold text-black italic tracking-tighter">Escolha um Perfil</h2>
          <p className="text-gray-500 font-medium">Encontramos {linkedStudents.length} alunos vinculados ao seu e-mail.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {linkedStudents.map((s) => (
            <button
              key={`student-select-${s.id}`}
              onClick={() => setSelectedStudentId(s.id)}
              className="p-8 bg-white border border-gray-100 rounded-[32px] shadow-sm hover:shadow-xl hover:border-black transition-all group text-left relative overflow-hidden active:scale-95"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <User className="w-16 h-16" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors capitalize font-black italic">
                  {s.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-lg text-gray-900 leading-none mb-1">{s.name}</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.belt}</p>
                </div>
              </div>
              <div className="flex items-center text-xs font-bold text-black italic uppercase tracking-widest">
                Acessar Perfil <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>

        <div className="text-center pt-8">
          <button 
            onClick={logout} 
            className="text-rose-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2 mx-auto hover:opacity-70"
          >
            <LogOut className="w-4 h-4" />
            Sair da conta
          </button>
        </div>
      </div>
    );
  }

  // 3. Main Portal View for selected student
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4 lg:gap-6">
          <div className="hidden sm:flex w-12 h-12 bg-black rounded-2xl items-center justify-center shadow-xl shadow-black/20 overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl lg:text-3xl font-serif font-bold text-black italic tracking-tighter leading-tight">Olá, {studentData.name.split(' ')[0]}!</h1>
              {linkedStudents.length > 1 && (
                <button 
                  onClick={() => setSelectedStudentId(null)}
                  className="px-2 py-0.5 bg-gray-100 text-[8px] font-black uppercase tracking-tighter rounded-md hover:bg-black hover:text-white transition-colors"
                >
                  Trocar Filho
                </button>
              )}
            </div>
            <div className="flex gap-4 mt-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                Aluno Ativo
              </span>
              <button 
                onClick={logout}
                className="flex items-center gap-1.5 text-rose-500 font-bold text-[10px] uppercase tracking-widest hover:opacity-70 transition-opacity"
              >
                <LogOut className="w-3 h-3" />
                Sair da conta
              </button>
            </div>
          </div>
        </div>
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-xl shadow-black/5 overflow-hidden p-1.5 border border-gray-50 shrink-0">
          <Logo size="sm" settings={settings} />
        </div>
      </header>

      {hasPendingPayments && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-3xl flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500 rounded-xl text-white">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-rose-900 dark:text-rose-100 text-sm">Mensalidade Pendente</p>
              <p className="text-rose-600 dark:text-rose-400 text-[10px] font-medium uppercase tracking-widest">Regularize sua situação para garantir seu acesso às aulas</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('finance')}
            className="px-4 py-2 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20"
          >
            Pagar Agora
          </button>
        </motion.div>
      )}

      {/* Belt Status Card */}
      <div className="p-8 bg-black rounded-[40px] text-white relative overflow-hidden shadow-2xl shadow-black/20">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Award className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Graduação Atual</p>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                <Award className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-3xl font-black italic tracking-tighter uppercase">{studentData.belt}</h3>
                <p className="text-emerald-400 font-bold text-sm">{studentData.stripes} Graus</p>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="px-6 py-4 bg-white/5 rounded-3xl border border-white/10 text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total de Aulas</p>
              <p className="text-2xl font-black italic">{myCheckIns.length}</p>
            </div>
            <div className="px-6 py-4 bg-white/5 rounded-3xl border border-white/10 text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Frequência Mensal</p>
              <p className="text-2xl font-black italic">{myCheckIns.filter(c => {
                const date = c.time?.toDate ? c.time.toDate() : new Date(c.time || Date.now());
                return date.getMonth() === new Date().getMonth();
              }).length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Graduation Timeline Section */}
        <div className="lg:col-span-2 p-8 bg-black rounded-[40px] text-white relative overflow-hidden shadow-2xl shadow-black/20">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Award className="w-48 h-48" />
          </div>
          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl border border-white/20">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold uppercase italic tracking-tighter">Minha Jornada</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Linha do tempo de graduações</p>
              </div>
            </div>

            <div className="relative space-y-8 before:absolute before:inset-y-0 before:left-4 before:w-0.5 before:bg-white/10">
              {myGraduations.length > 0 ? myGraduations.map((grad, idx) => (
                <div key={`graduation-${grad.id}`} className="relative pl-12 group">
                  <div className={cn(
                    "absolute left-2.5 top-2 w-3 h-3 rounded-full border-2 border-black z-10 transition-transform group-hover:scale-125",
                    idx === 0 ? "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]" : "bg-white/30"
                  )} />
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-3 transition-all hover:bg-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black uppercase italic tracking-tighter">{normalizeBeltName(grad.belt)}</span>
                        <div className="flex gap-0.5">
                          {[...Array(grad.stripes)].map((_, i) => (
                            <div key={i} className="w-1.5 h-3 bg-white/40 rounded-sm" />
                          ))}
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        {grad.date ? format(grad.date.toDate ? grad.date.toDate() : new Date(grad.date), 'dd MMM yyyy', { locale: ptBR }) : ''}
                      </span>
                    </div>
                    {grad.notes && <p className="text-sm text-gray-300 italic leading-relaxed">"{grad.notes}"</p>}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Promovido por: {grad.instructorName}</p>
                      {idx === 0 && <span className="text-[8px] font-black bg-emerald-400 text-black px-2 py-0.5 rounded uppercase tracking-tighter">Atual</span>}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-16 bg-white/5 rounded-[32px] border border-dashed border-white/10 ml-12">
                  <Award className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 italic">O início da sua jornada está sendo registrado.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Technical Evaluations Section */}
        <div className="lg:col-span-2 p-8 bg-white border border-gray-100 shadow-sm rounded-[40px] space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-xl">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Observações dos Professores</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myEvaluations.length > 0 ? myEvaluations.map(eval_ => (
              <div key={`evaluation-${eval_.id}`} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest",
                    eval_.type === 'Technical' ? "bg-blue-100 text-blue-600" : 
                    eval_.type === 'Behavioral' ? "bg-purple-100 text-purple-600" : "bg-gray-200 text-gray-600"
                  )}>
                    {eval_.type}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">
                    {format(eval_.date?.toDate ? eval_.date.toDate() : new Date(eval_.date || Date.now()), 'dd/MM/yyyy')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed italic">"{eval_.note}"</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">— Prof. {eval_.professorName}</p>
              </div>
            )) : (
              <div className="col-span-full text-center py-12 bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                <p className="text-sm text-gray-400 italic">Nenhuma observação técnica registrada ainda.</p>
              </div>
            )}
          </div>
        </div>

        {/* Payments Section */}
        <div className="p-8 bg-white border border-gray-100 shadow-sm rounded-[40px] space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <CreditCard className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Mensalidades</h3>
            </div>
          </div>

          <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Próximo Vencimento</p>
              <span className={cn(
                "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                (studentData.nextPaymentDate?.toDate ? studentData.nextPaymentDate.toDate().getTime() : new Date(studentData.nextPaymentDate || 0).getTime()) < Date.now() ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
              )}>
                {(studentData.nextPaymentDate?.toDate ? studentData.nextPaymentDate.toDate().getTime() : new Date(studentData.nextPaymentDate || 0).getTime()) < Date.now() ? "Atrasado" : "Em dia"}
              </span>
            </div>
            <p className="text-2xl font-black text-gray-900 italic">
              {studentData.nextPaymentDate ? format(studentData.nextPaymentDate.toDate ? studentData.nextPaymentDate.toDate() : new Date(studentData.nextPaymentDate), "dd 'de' MMMM", { locale: ptBR }) : 'N/A'}
            </p>
            <button 
              onClick={handlePayment}
              className="w-full mt-6 py-4 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-lg active:scale-95"
            >
              Pagar Mensalidade (PIX)
            </button>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">Histórico Recente</p>
            {myPayments.slice(0, 3).map(p => (
              <div key={`payment-${p.id}`} className="flex items-center justify-between p-4 bg-white border border-gray-50 rounded-2xl">
                <div>
                  <p className="text-sm font-bold text-gray-900">{p.period}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{p.date ? format(p.date.toDate ? p.date.toDate() : new Date(p.date), 'dd/MM/yyyy') : ''}</p>
                </div>
                <span className="text-sm font-black text-emerald-600">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Product Installments Section */}
        {myInstallments.length > 0 && (
          <div className="p-8 bg-white border border-gray-100 shadow-sm rounded-[40px] space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-xl">
                <CreditCard className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Parcelas de Produtos</h3>
            </div>

            <div className="space-y-3">
              {myInstallments.map(inst => (
                <div key={`installment-${inst.id}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{inst.productName}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">
                      Vencimento: {inst.dueDate ? format(inst.dueDate.toDate ? inst.dueDate.toDate() : new Date(inst.dueDate), 'dd/MM/yyyy') : 'N/A'} • {inst.installmentNumber}/{inst.totalInstallments}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-900">{formatCurrency(inst.amount)}</p>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full",
                      inst.status === 'paid' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                    )}>
                      {inst.status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attendance Section */}
        <div className="p-8 bg-white border border-gray-100 shadow-sm rounded-[40px] space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Frequência</h3>
            </div>
          </div>

          <div className="space-y-4">
            {myCheckIns.length > 0 ? (
              myCheckIns.slice(0, 5).map(c => (
                <div key={`checkin-${c.id}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <Clock className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{c.className}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">
                        {c.time ? format(c.time.toDate ? c.time.toDate() : new Date(c.time), "eeee, dd/MM", { locale: ptBR }) : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">PRESENÇA</span>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400 italic">Nenhum check-in registrado.</p>
              </div>
            )}
          </div>
          
          <button className="w-full py-4 bg-gray-50 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all">
            Ver Histórico Completo
          </button>
        </div>
      </div>
    </div>
  );
};
