import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  CreditCard, 
  ShoppingCart, 
  Settings, 
  LogOut, 
  Menu, 
  ShieldAlert,
  Calendar,
  UserCheck,
  Scan,
  DollarSign,
  Package,
  Sun,
  Moon,
  FileText
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { signInWithGoogle, logout } from './firebase';
import { useStudents } from './application/hooks/useStudents';
import { usePayments } from './application/hooks/usePayments';
import { useCheckIn } from './application/hooks/useCheckIn';
import { useSubscriptions } from './application/hooks/useSubscriptions';
import { useInvoices } from './application/hooks/useInvoices';
import { useInstructors } from './application/hooks/useInstructors';
import { useExpenses } from './application/hooks/useExpenses';
import { useInstallments } from './application/hooks/useInstallments';
import { usePlans } from './application/hooks/usePlans';
import { useClasses } from './application/hooks/useClasses';
import { useProducts } from './application/hooks/useProducts';
import { useSales } from './application/hooks/useSales';
import { useBelts } from './application/hooks/useBelts';
import { useSettings } from './application/hooks/useSettings';
import { useLicenses } from './application/hooks/useLicenses';
import { useUsers } from './application/hooks/useUsers';
import { useEvaluations } from './application/hooks/useEvaluations';
import { useGraduations } from './application/hooks/useGraduations';
import { 
  useInstallments as useInstallmentsLegacy,
  usePrivateSettings
} from './hooks/useFirebaseData';
import { cn } from './utils/formatters';
import { Logo } from './components/ui/Logo';
import { DashboardView } from './components/Dashboard/DashboardView';
import { StudentsView } from './components/Students/StudentsView';
import { FinanceiroView } from './components/Financeiro/FinanceiroView';
import { InventoryView } from './components/Inventory/InventoryView';
import { SettingsView } from './components/Settings/SettingsView';
import { InstructorsView } from './components/Instructors/InstructorsView';
import { ClassesView } from './components/Classes/ClassesView';
import { MensalidadesView } from './components/Financeiro/MensalidadesView';
import { PlansView } from './components/Financeiro/PlansView';
import { UsersView } from './components/Users/UsersView';
import { LoadingOverlay } from './components/ui/LoadingOverlay';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { CheckInTabletView } from './components/CheckIn/CheckInTabletView';
import { StudentPortalView } from './components/StudentPortal/StudentPortalView';
import { ReportsView } from './components/Financeiro/ReportsView';
import { SuperAdminView } from './components/SuperAdmin/SuperAdminView';
import { SetupWizard } from './components/Onboarding/SetupWizard';
import { ShieldCheck, Lock } from 'lucide-react';

const AppContent = () => {
  const { 
    user, 
    loading: authLoading, 
    role, 
    permissions, 
    isApproved, 
    isAdmin, 
    isSuperAdmin, 
    isProfessor, 
    isReceptionist, 
    isCheckInTablet, 
    licenseStatus,
    gymInfo,
    syncGymStats,
    loginWithEmail,
    registerWithEmail,
    sendResetEmail
  } = useAuth();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [viewMode, setViewMode] = useState<'professional' | 'student'>('professional');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      return saved === 'true' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);
  
  // Data Hooks
  const { belts } = useBelts();
  const { students: studentsData, loading: studentsLoading } = useStudents(!!user, isAdmin || permissions.students, user?.email);
  const students = studentsData || [];
  const { classes } = useClasses(!!user);
  const { instructors } = useInstructors(!!user);
  const { plans } = usePlans(!!user);
  const { products } = useProducts(!!user);
  const { sales } = useSales(!!user);
  const { users } = useUsers(isAdmin || permissions.users);
  const { expenses } = useExpenses(isAdmin || permissions.finance);
  const { settings, secrets } = useSettings();
  const { licenses } = useLicenses();

  // Derive linked student IDs for secure data fetching (for parents/students)
  const myStudentIds = React.useMemo(() => {
    const isAdminOrStaff = isAdmin || permissions.students;
    if (!students || students.length === 0) return [];
    
    // For students/parents, we filter by email
    const linked = students.filter(s => s.email === user?.email);
    return linked.map(s => s.id);
  }, [students, user?.email, isAdmin, permissions.students]);

  // Check if current professional user HAS a student record too
  const hasStudentRecord = React.useMemo(() => {
    if (role === 'user') return true;
    if (!students || !user?.email) return false;
    return students.some(s => s.email === user.email);
  }, [students, user?.email, role]);

  const { checkIns, registerCheckIn } = useCheckIn(!!user, isAdmin || permissions.students, (isAdmin || permissions.students) ? undefined : myStudentIds);
  const { installments } = useInstallments(isAdmin || permissions.finance);
  const { evaluations } = useEvaluations(!!user, isAdmin || permissions.students, myStudentIds);
  const { graduations } = useGraduations(!!user, isAdmin || permissions.students, myStudentIds);
  const { payments, processPayment, processMensalidade } = usePayments(!!user, isAdmin || permissions.finance, myStudentIds);
  const { subscriptions } = useSubscriptions(isAdmin || permissions.finance);
  const { invoices } = useInvoices(isAdmin || permissions.finance);

  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!!user && students.length >= 0) {
      // Small delay to ensure other hooks also have a chance to start
      const timer = setTimeout(() => setDataLoaded(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, students]);

  const isLoading = authLoading || (!!user && !dataLoaded);

  // Sync basic stats to Master DB (for SuperAdmin health check)
  // Use a ref to prevent frequent updates
  const lastSyncRef = React.useRef(0);
  useEffect(() => {
    if (user && gymInfo?.slug && !isSuperAdmin && students && students.length >= 0) {
      const now = Date.now();
      // Only sync once every 5 minutes to avoid loops and excessive writes
      if (now - lastSyncRef.current > 5 * 60 * 1000) {
        lastSyncRef.current = now;
        syncGymStats({ studentCount: students.length });
      }
    }
  }, [students.length, user?.uid, gymInfo?.slug, isSuperAdmin, syncGymStats]);

  // Inject Branding CSS Variables
  useEffect(() => {
    if (gymInfo?.config?.branding?.primaryColor) {
      document.documentElement.style.setProperty('--primary-brand', gymInfo.config.branding.primaryColor);
    } else {
      document.documentElement.style.setProperty('--primary-brand', '#000000');
    }
  }, [gymInfo]);

  if (authLoading) return <LoadingOverlay isLoading={true} message="Autenticando..." />;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F9F9F7] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gray-100 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gray-200 rounded-full blur-[120px] opacity-30" />
        
        <div className="w-full max-w-md space-y-10 text-center relative z-10">
          <div className="space-y-6">
            <div className="w-20 h-20 bg-white rounded-[28px] flex items-center justify-center mx-auto shadow-2xl shadow-black/5 overflow-hidden p-3.5 group hover:scale-105 transition-transform duration-500">
              <Logo size="lg" settings={settings} />
            </div>
            <div className="space-y-2">
              {gymInfo ? (
                <>
                  <h1 className="text-4xl font-serif font-bold text-black italic tracking-tighter leading-none">
                    {gymInfo.name}
                  </h1>
                  <p className="text-gray-500 font-medium tracking-[0.2em] uppercase text-[9px] truncate max-w-xs mx-auto">
                    Unidade Oficial • {gymInfo.slug}
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-4xl font-serif font-bold text-black italic tracking-tighter leading-none">
                    Gfteam <span className="text-gray-400 font-light not-italic">Limeira</span>
                  </h1>
                  <p className="text-gray-500 font-medium tracking-[0.2em] uppercase text-[9px]">Sistema de Gestão de Academia</p>
                </>
              )}
            </div>
          </div>

          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              setIsLoggingIn(true);
              try {
                if (authMode === 'login') {
                  await loginWithEmail(email, password);
                } else {
                  await registerWithEmail(email, password);
                  toast.success("Cadastro realizado! Aguarde o redirecionamento.");
                }
              } catch (error: any) {
                console.error("Auth error:", error);
                let message = "Erro na autenticação. Verifique os dados.";
                if (error.code === 'auth/user-not-found') message = "Usuário não encontrado.";
                else if (error.code === 'auth/wrong-password') message = "Senha incorreta.";
                else if (error.code === 'auth/email-already-in-use') message = "Este e-mail já está em uso.";
                else if (error.code === 'auth/weak-password') message = "Senha muito fraca (mínimo 6 caracteres).";
                else if (error.code === 'auth/invalid-email') message = "E-mail inválido.";
                
                toast.error(message);
              } finally {
                setIsLoggingIn(false);
              }
            }}
            className="p-8 bg-white rounded-[32px] shadow-2xl shadow-black/5 border border-gray-100 text-left space-y-4"
          >
            <div className="flex bg-gray-50 p-1 rounded-2xl mb-4">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={cn(
                  "flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl",
                  authMode === 'login' ? "bg-white text-black shadow-sm" : "text-gray-400"
                )}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={cn(
                  "flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl",
                  authMode === 'register' ? "bg-white text-black shadow-sm" : "text-gray-400"
                )}
              >
                Primeiro Acesso
              </button>
            </div>

            {authMode === 'register' && (
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-tight text-center px-4 bg-amber-50 py-2 rounded-xl border border-amber-100">
                Atenção: Apenas e-mails pré-cadastrados pela academia podem realizar o primeiro acesso.
              </p>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">E-mail</label>
              <input 
                required
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{authMode === 'login' ? 'Senha' : 'Crie uma Senha'}</label>
                {authMode === 'login' && (
                  <button 
                    type="button"
                    disabled={isSendingReset}
                    onClick={async () => {
                      if (!email) {
                        toast.error("Digite seu e-mail primeiro.");
                        return;
                      }
                      setIsSendingReset(true);
                      try {
                        await sendResetEmail(email);
                        toast.success("E-mail de redefinição enviado para " + email);
                      } catch (error: any) {
                        console.error("Reset Email Error:", error);
                        let message = "Erro ao enviar e-mail. Verifique o endereço.";
                        if (error.code === 'auth/user-not-found') message = "E-mail não cadastrado no sistema.";
                        else if (error.code === 'auth/invalid-email') message = "Endereço de e-mail inválido.";
                        else if (error.code === 'auth/operation-not-allowed') message = "Redefinição de senha não habilitada no Firebase Console.";
                        else if (error.code === 'auth/too-many-requests') message = "Muitas solicitações. Tente mais tarde.";
                        
                        toast.error(message);
                      } finally {
                        setIsSendingReset(false);
                      }
                    }}
                    className="text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors disabled:opacity-50"
                  >
                    {isSendingReset ? "Enviando..." : "Esqueci minha senha"}
                  </button>
                )}
              </div>
              <input 
                required
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold"
              />
            </div>
            
            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-4 px-8 py-5 bg-black text-white font-black text-lg rounded-[28px] hover:bg-gray-900 transition-all active:scale-[0.98] shadow-xl shadow-black/10 uppercase italic tracking-tighter disabled:opacity-50"
            >
              {isLoggingIn ? "Autenticando..." : authMode === 'login' ? "Acessar Sistema" : "Cadastrar e Entrar"}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-gray-300">
                <span className="bg-white px-4 italic">Ou continue com</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={async () => {
                try {
                  await signInWithGoogle();
                } catch (error: any) {
                  console.error("Social login error:", error);
                  toast.error("Erro ao entrar com Google.");
                }
              }}
              className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gray-50 text-gray-600 font-bold text-sm rounded-2xl hover:bg-gray-100 transition-all active:scale-[0.98]"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="" />
              Acessar com Google
            </button>
          </form>

          <p className="text-gray-400 text-xs font-medium">
            © {new Date().getFullYear()} GFTeam Limeira. Todos os direitos reservados.
          </p>
        </div>
      </div>
    );
  }

  if (!isApproved && !isAdmin && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
        <div className="p-10 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-[40px] max-w-md">
          <ShieldAlert className="w-16 h-16 text-amber-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4">Acesso Não Autorizado</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Este e-mail não foi pré-cadastrado no sistema pela administração.
            <br/><br/>
            Por favor, solicite seu cadastro manual na recepção da academia para liberar seu acesso com este e-mail.
          </p>
          {isSuperAdmin && (
            <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-500 text-xs font-bold uppercase tracking-wider">
              Você é reconhecido como Super Admin, mas seu perfil ainda não foi sincronizado. 
              Clique abaixo para forçar a entrada.
            </div>
          )}
          <div className="flex flex-col gap-3">
            {isSuperAdmin && (
              <button 
                onClick={() => window.location.reload()} 
                className="w-full py-4 bg-amber-500 text-black font-bold rounded-2xl hover:bg-amber-600 transition-all uppercase tracking-tighter italic"
              >
                Sincronizar e Entrar
              </button>
            )}
            <button 
              onClick={logout} 
              className="w-full py-4 bg-white/10 text-white font-bold rounded-2xl hover:bg-white/20 transition-all border border-white/10"
            >
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (licenseStatus === 'active' && !gymInfo?.config && !isSuperAdmin) {
    return <SetupWizard />;
  }

  if (licenseStatus === 'blocked' && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="p-10 bg-white border border-rose-100 shadow-2xl rounded-[40px] max-w-md">
          <Lock className="w-16 h-16 text-rose-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-rose-900 italic uppercase tracking-tighter mb-4">Acesso Bloqueado</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Sua licença de uso deste sistema está temporariamente suspensa. 
            <br/><br/>
            Por favor, entre em contato com o administrador do sistema para regularizar sua situação.
          </p>
          <button 
            onClick={logout} 
            className="w-full py-4 bg-rose-500 text-white font-bold rounded-2xl hover:bg-rose-600 transition-all"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  if (licenseStatus === 'none' && !isSuperAdmin && role === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="p-10 bg-white border border-gray-100 shadow-2xl rounded-[40px] max-w-md">
          <ShieldAlert className="w-16 h-16 text-amber-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-gray-900 italic uppercase tracking-tighter mb-4">Sem Licença Ativa</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Nenhuma licença foi encontrada para o seu e-mail (<strong>{user.email}</strong>).
            <br/><br/>
            Se você é dono de uma academia, solicite a ativação ao suporte Master Admin.
          </p>
          <button 
            onClick={logout} 
            className="w-full py-4 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-all"
          >
            Fazer Logout
          </button>
        </div>
      </div>
    );
  }

  if (role === 'user' || (viewMode === 'student' && hasStudentRecord)) {
    return (
      <div className="min-h-screen bg-[#fafafa] relative">
        <div className="p-4 lg:p-10 max-w-5xl mx-auto">
          <Toaster position="top-right" />
          
          {/* View Toggle for Professors/Admins in Student View */}
          {role !== 'user' && (
            <div className="mb-6 flex justify-end">
              <button 
                onClick={() => setViewMode('professional')}
                className="px-6 py-3 bg-black text-white font-bold rounded-2xl shadow-xl hover:bg-gray-900 transition-all flex items-center gap-2 italic uppercase tracking-tighter text-xs"
              >
                <TrendingUp className="w-4 h-4" />
                Voltar ao Painel Geral
              </button>
            </div>
          )}

          <StudentPortalView />
        </div>
        
        {/* Global Fallback Logout for Students */}
        <div className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-[100]">
          <button 
            onClick={logout}
            className="p-4 bg-white text-rose-500 rounded-2xl shadow-2xl border border-gray-100 flex items-center gap-2 font-black italic uppercase tracking-tighter hover:bg-rose-50 transition-all active:scale-95"
            title="Sair do Sistema"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={setActiveTab} />;
      case 'students':
        return <StudentsView />;
      case 'instructors':
        return <InstructorsView />;
      case 'classes':
        return <ClassesView />;
      case 'mensalidades':
        return <MensalidadesView />;
      case 'plans':
        return <PlansView />;
      case 'checkin':
        return <CheckInTabletView />;
      case 'users':
        return <UsersView />;
      case 'finance':
        return (
          <FinanceiroView 
            onNavigate={setActiveTab} 
            settings={settings}
          />
        );
      case 'reports':
        return <ReportsView />;
      case 'inventory':
        return <InventoryView />;
      case 'superadmin':
        return <SuperAdminView />;
      case 'settings':
        return <SettingsView 
          allData={{ 
            students, 
            payments, 
            sales, 
            expenses, 
            products, 
            checkIns, 
            evaluations,
            plans,
            instructors
          }} 
        />;
      default:
        return <DashboardView onNavigate={setActiveTab} />;
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp, permission: 'dashboard' },
    { id: 'students', label: 'Alunos', icon: Users, permission: 'students' },
    { id: 'instructors', label: 'Professores', icon: UserCheck, permission: 'instructors' },
    { id: 'classes', label: 'Aulas', icon: Calendar, permission: 'classes' },
    { id: 'plans', label: 'Planos', icon: Package, permission: 'finance' },
    { id: 'mensalidades', label: 'Mensalidades', icon: DollarSign, permission: 'mensalidades' },
    { id: 'checkin', label: 'Check-in', icon: Scan, permission: 'checkin' },
    { id: 'users', label: 'Acessos', icon: ShieldAlert, permission: 'users' },
    { id: 'finance', label: 'Financeiro', icon: CreditCard, permission: 'finance' },
    { id: 'reports', label: 'Relatórios', icon: FileText, permission: 'finance' },
    { id: 'inventory', label: 'Estoque', icon: ShoppingCart, permission: 'inventory' },
    ...(isSuperAdmin ? [{ id: 'superadmin', label: 'Super Admin', icon: ShieldCheck, permission: 'all' }] : []),
    { id: 'settings', label: 'Configurações', icon: Settings, permission: 'settings' },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-gray-950 flex transition-colors duration-300">
      <Toaster position="top-right" />
      <LoadingOverlay isLoading={isLoading} />
      
      {/* Backdrop for mobile sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[45] lg:hidden"
          />
        )}
      </AnimatePresence>
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 glass-surface transition-all duration-500 ease-in-out lg:translate-x-0 lg:static",
        isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-4">
          <div className="mb-10 px-2 flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden p-1.5 transition-transform hover:scale-105">
              <Logo size="sm" settings={settings} />
            </div>
            <div className="flex flex-col">
              {gymInfo ? (
                <>
                  <span className="text-sm font-display font-bold text-zinc-900 dark:text-white tracking-tight leading-none truncate max-w-[120px]">
                    {gymInfo.name}
                  </span>
                  <span className="text-[9px] tracking-wider font-bold text-zinc-400 uppercase truncate">
                    {gymInfo.slug}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm font-display font-bold text-zinc-900 dark:text-white tracking-tight leading-none">DojoSync</span>
                  <span className="text-[9px] tracking-wider font-bold text-zinc-400 uppercase">Admin Master</span>
                </>
              )}
            </div>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="ml-auto p-1.5 bg-zinc-50 dark:bg-white/5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 transition-all text-zinc-500"
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
          
          <nav className="flex-1 space-y-1 overflow-y-auto">
            {menuItems.map(item => {
              if (isAdmin) {
                // Show all
              } else if (item.permission && !permissions[item.permission]) {
                return null;
              }
              
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                    activeTab === item.id 
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-md" 
                      : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", activeTab === item.id ? "text-current" : "text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white")} />
                  {item.label}
                </button>
              );
            })}

            <div className="pt-2 mt-2 space-y-1 border-t border-zinc-100 dark:border-white/5">
              <a
                href="https://partners.gympass.com/validation/escola-de-lutas-gfteam-limeira-jiu-jitsu-clube-do-judo-jardim-santa-luiza"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group text-zinc-500 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-[#F3212D]"
              >
                <div className="w-4 h-4 flex items-center justify-center font-black italic text-[8px] border border-zinc-300 dark:border-zinc-700 rounded group-hover:border-[#F3212D] group-hover:text-[#F3212D]">G</div>
                Gympass
              </a>
              <a
                href="https://booking.totalpass.com/br"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group text-zinc-500 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white"
              >
                <div className="w-4 h-4 flex items-center justify-center font-black italic text-[8px] border border-zinc-300 dark:border-zinc-700 rounded group-hover:border-black dark:group-hover:border-white group-hover:text-black dark:group-hover:text-white">T</div>
                TotalPass
              </a>
              <a
                href="https://mail.google.com/mail/u/0/#inbox"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group text-zinc-500 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-[#EA4335]"
              >
                <div className="w-4 h-4 flex items-center justify-center font-black italic text-[8px] border border-zinc-300 dark:border-zinc-700 rounded group-hover:border-[#EA4335] group-hover:text-[#EA4335]">M</div>
                Gmail
              </a>
            </div>
          </nav>

          <div className="pt-4 mt-4 border-t border-zinc-200/50 dark:border-white/5">
            <div className="flex items-center gap-3 px-3 py-2.5 mb-2 bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-100 dark:border-white/5">
              <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold overflow-hidden text-xs">
                {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : user.displayName?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{user.displayName}</p>
                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider truncate">
                  {role === 'admin' || role === 'tenant_admin' ? 'Administrador' : 
                   role === 'professor' ? 'Professor' : 
                   role === 'receptionist' ? 'Recepcionista' : 
                   role === 'superadmin' ? 'Super Admin' : 
                   role === 'checkin_tablet' ? 'Tablet Check-in' : 'Aluno'}
                </p>
              </div>
            </div>

            {hasStudentRecord && (
              <button 
                onClick={() => setViewMode('student')}
                className="w-full flex items-center gap-3 px-4 py-3 mb-2 bg-emerald-50 text-emerald-600 rounded-2xl font-bold text-sm hover:bg-emerald-100 transition-all border border-emerald-100/50 italic uppercase tracking-tighter"
              >
                <UserCheck className="w-5 h-5" />
                Meu Perfil de Aluno
              </button>
            )}

            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-rose-500 hover:bg-rose-50 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Sair do Sistema
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1500px] mx-auto min-h-screen">
          <header className="flex items-center justify-between mb-8 lg:hidden glass-surface p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-zinc-900 dark:bg-white rounded-lg flex items-center justify-center shadow-lg overflow-hidden p-1 border border-gray-50">
                <Logo size="sm" settings={settings} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-display font-bold text-zinc-900 dark:text-white tracking-tight leading-none">Gfteam</span>
                <span className="text-[9px] tracking-wider font-bold text-zinc-400 uppercase">Limeira</span>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="p-2.5 bg-zinc-900 text-white rounded-xl shadow-lg active:scale-95 transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
          </header>
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
