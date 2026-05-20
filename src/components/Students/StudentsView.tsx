import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  X, 
  AlertCircle, 
  Edit2, 
  Trash2, 
  Archive, 
  RotateCcw, 
  RefreshCw,
  Award,
  History as HistoryIcon, 
  TrendingUp,
  Scan,
  CheckCircle2,
  MoreVertical,
  Phone,
  Mail,
  Calendar as CalendarIcon,
  MapPin,
  ChevronRight,
  History,
  MessageSquare,
  User,
  Users,
  DollarSign,
  CreditCard,
  ShoppingCart
} from 'lucide-react';
import { format, isBefore, differenceInMonths, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { useStudents } from '../../application/hooks/useStudents';
import { useInstructors } from '../../application/hooks/useInstructors';
import { useClasses } from '../../application/hooks/useClasses';
import { usePlans } from '../../application/hooks/usePlans';
import { useInvoices } from '../../application/hooks/useInvoices';
import { usePayments } from '../../application/hooks/usePayments';
import { useInstallments } from '../../application/hooks/useInstallments';
import { useEvaluations } from '../../application/hooks/useEvaluations';
import { useGraduations } from '../../application/hooks/useGraduations';
import { useBelts } from '../../application/hooks/useBelts';
import { cn, formatCurrency, getBeltColor, normalizeBeltName } from '../../utils/formatters';
import { handleFirestoreError, OperationType } from '../../utils/errorHandlers';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { getFaceDescriptor, loadModels } from '../../services/faceRecognitionService';

// Simple mask function
const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

const maskCEP = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
};

export const StudentsView = () => {
  const { isAdmin, isReceptionist, user, permissions, gymInfo } = useAuth();
  const { belts } = useBelts();
  const { 
    students, 
    registerStudent, 
    updateStudent,
    graduateStudent,
    addEvaluation,
    deleteEvaluation
  } = useStudents(true, isAdmin || permissions.students, (isAdmin || permissions.students) ? undefined : user?.email);

  const { instructors } = useInstructors(true);
  const { classes } = useClasses(true);
  const { plans } = usePlans(true);
  const { payments } = usePayments(true, isAdmin || permissions.finance);
  const { installments } = useInstallments(isAdmin || permissions.finance);
  const { invoices } = useInvoices(isAdmin || permissions.finance);
  const { evaluations } = useEvaluations(true, isAdmin || permissions.students);
  const { graduations } = useGraduations(true, isAdmin || permissions.students);
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [modalityFilter, setModalityFilter] = useState("Todas");
  const [activeSubTab, setActiveSubTab] = useState('info');
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [isGraduationModalOpen, setIsGraduationModalOpen] = useState(false);
  const [graduationData, setGraduationData] = useState({
    belt: '',
    stripes: 0,
    notes: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });
  const [evaluationNote, setEvaluationNote] = useState("");
  const [evaluationType, setEvaluationType] = useState('Technical');
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = React.useRef<HTMLVideoElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    messagePhone: '',
    birthDate: '',
    cep: '',
    address: '',
    number: '',
    occupation: '',
    education: '',
    belt: 'Branca',
    stripes: 0,
    status: 'Active',
    category: 'Adulto',
    disability: '',
    guardianName: '',
    guardianDoc: '',
    guardianEmail: '',
    guardianPhone: '',
    guardianOccupation: '',
    facialId: '',
    monthlyFee: 150,
    planId: '',
    gympassId: '',
    nextPaymentDate: format(new Date(), 'yyyy-MM-dd'),
    facePhoto: null as string | null,
    faceDescriptor: null as string | null,
    modalities: ['Jiu-Jitsu'] as string[],
    muayThaiGraduation: 'Branca'
  });

  const muayThaiGraduations = [
    'Branca', 'Branca Ponta Amarela', 'Amarela', 'Amarela Ponta Laranja',
    'Laranja', 'Laranja Ponta Verde', 'Verde', 'Verde Ponta Azul',
    'Azul', 'Azul Ponta Roxa', 'Roxa', 'Roxa Ponta Marrom',
    'Marrom', 'Marrom Ponta Preta', 'Preta'
  ];

  const handleCEPLookup = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          address: `${data.logradouro}${data.bairro ? `, ${data.bairro}` : ''}${data.localidade ? ` - ${data.localidade}` : ''}${data.uf ? `/${data.uf}` : ''}`
        }));
        toast.success("Endereço preenchido automaticamente!");
      } else {
        toast.error("CEP não encontrado.");
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      toast.error("Erro ao buscar CEP.");
    }
  };

  const isMinor = useMemo(() => {
    if (!formData.birthDate) return false;
    const birth = new Date(formData.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age < 18;
  }, [formData.birthDate]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        const { nextPaymentDate, ...rest } = formData;
        const dataToSave = {
          ...rest,
          nextPaymentDate: nextPaymentDate ? new Date(nextPaymentDate) : new Date(),
          facePhoto: formData.facePhoto || editingStudent?.facePhoto || null,
          faceDescriptor: formData.faceDescriptor || editingStudent?.faceDescriptor || null
        };
        await updateStudent(editingStudent.id, dataToSave as any);
        toast.success("Aluno atualizado!");
      } else {
        await registerStudent(formData);
        toast.success("Aluno cadastrado! Verifique as mensalidades.");
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Erro ao salvar aluno.");
    }
  };

  const studentGraduations = useMemo(() => {
    if (!selectedStudent) return [];
    return graduations.filter(g => g.studentId === selectedStudent.id);
  }, [graduations, selectedStudent]);

  const handleGraduation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    
    try {
      await graduateStudent(selectedStudent.id, {
        belt: graduationData.belt,
        stripes: graduationData.stripes,
        notes: graduationData.notes,
        date: graduationData.date,
        instructorName: user?.displayName || 'Admin'
      });

      toast.success("Graduação registrada com sucesso!");
      setIsGraduationModalOpen(false);
      
      setSelectedStudent({
        ...selectedStudent,
        belt: graduationData.belt,
        stripes: graduationData.stripes
      });

    } catch (error) {
      toast.error("Erro ao registrar graduação.");
    }
  };

  const handleCaptureFace = async () => {
    try {
      setIsCapturing(true);
      await loadModels();
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode } 
      }).catch(async () => {
        return await navigator.mediaDevices.getUserMedia({ video: true });
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error: any) {
      console.error("Error starting camera:", error);
      if (error?.name === "NotAllowedError" || error?.message?.includes("Permission denied")) {
        toast.error("Acesso à câmera negado. Verifique as permissões do seu navegador.");
      } else {
        toast.error("Erro ao acessar a câmera. Verifique se ela está conectada.");
      }
      setIsCapturing(false);
    }
  };

  const takePhoto = async () => {
    if (!videoRef.current) return;
    
    const loadingToast = toast.loading("Analisando rosto...");
    try {
      const detection = await getFaceDescriptor(videoRef.current);
      if (detection) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(videoRef.current, 0, 0);
        const photoData = canvas.toDataURL('image/jpeg');
        
        setFormData({
          ...formData,
          facePhoto: photoData,
          faceDescriptor: JSON.stringify(Array.from(detection.descriptor))
        } as any);
        
        toast.success("Rosto capturado com sucesso!", { id: loadingToast });
        stopCamera();
      } else {
        toast.error("Rosto não detectado. Tente novamente.", { id: loadingToast });
      }
    } catch (error) {
      toast.error("Erro ao processar imagem.", { id: loadingToast });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  const toggleCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: newMode } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error("Error toggling camera:", error);
      toast.error("Erro ao alternar câmera.");
    }
  };

  const handleWhatsAppContact = (student: any) => {
    if (!student?.phone) {
      toast.error("Aluno sem telefone cadastrado.");
      return;
    }

    const overdueCount = getOverdueCount(student);
    const plan = plans.find(p => p.id === student.planId);
    const totalPrice = (plan?.price || 0) * overdueCount;
    let message = `Olá ${student.name}, tudo bem? Aqui é da ${gymInfo?.name || 'Academia'}. Oss!`;

    if (overdueCount > 0) {
      message = `Olá ${student.name}, tudo bem? Identificamos que sua mensalidade do plano ${plan?.name || ''} está em atraso (${overdueCount} ${overdueCount === 1 ? 'mês' : 'meses'}). O valor total pendente é de ${formatCurrency(totalPrice)}. Poderia verificar, por favor? Segue nossa chave PIX para pagamento: [SUA CHAVE PIX AQUI]. Oss!`;
    }

    const encodedMessage = encodeURIComponent(message);
    const phone = student.phone.replace(/\D/g, "");
    window.open(`https://wa.me/55${phone}?text=${encodedMessage}`, "_blank");
  };

  const filteredStudents = students.filter((s: any) => {
    const matchesSearch = (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (s.email || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArchived = showArchived ? s.status === 'Archived' : s.status !== 'Archived';
    const matchesModality = modalityFilter === "Todas" || (s.modalities && s.modalities.includes(modalityFilter));
    return matchesSearch && matchesArchived && matchesModality;
  });

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !evaluationNote) return;

    try {
      await addEvaluation({
        studentId: selectedStudent.id,
        professorId: user?.uid || '',
        professorName: user?.displayName || 'Professor',
        note: evaluationNote,
        type: evaluationType,
        date: new Date()
      });
      toast.success("Avaliação salva com sucesso!");
      setEvaluationNote("");
      setIsEvaluationModalOpen(false);
    } catch (err) {
      toast.error("Erro ao salvar avaliação.");
    }
  };

  const studentEvaluations = useMemo(() => {
    if (!selectedStudent) return [];
    return evaluations.filter(e => e.studentId === selectedStudent.id);
  }, [selectedStudent, evaluations]);

  const getOverdueCount = (student: any) => {
    if (!student.nextPaymentDate) return 0;
    
    const plan = plans.find(p => p.id === student.planId);
    const planName = (plan?.name || "").toLowerCase();
    
    // Administrative cases/Gympass that shouldn't be overdue here
    const isSpecialCase = 
      planName.includes('gympass') || 
      planName.includes('total pass') || 
      planName.includes('totalpass') || 
      planName.includes('projeto') ||
      !!student.gympassId;

    if (isSpecialCase) return 0;

    const nextDate = student.nextPaymentDate.toDate ? student.nextPaymentDate.toDate() : new Date(student.nextPaymentDate);
    const now = new Date();
    
    if (isBefore(nextDate, now)) {
      return Math.max(1, differenceInMonths(now, nextDate) + 1);
    }
    return 0;
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in transition-all duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-black text-black dark:text-white italic uppercase tracking-tighter">Alunos</h1>
          <p className="text-xs sm:text-sm text-gray-600 font-medium">Gerencie o cadastro e a evolução dos seus atletas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setShowArchived(!showArchived)}
            className={cn(
              "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
              showArchived 
                ? "bg-rose-50 border-rose-200 text-rose-600" 
                : "bg-white border-gray-100 dark:bg-white/5 dark:border-white/10 text-gray-600 hover:bg-gray-50"
            )}
          >
            {showArchived ? 'Ver Ativos' : 'Arquivados'}
          </button>
          
          {isAdmin && (
            <button 
              onClick={() => { 
                setEditingStudent(null); 
                setFormData({
                  name: '',
                  email: '',
                  phone: '',
                  messagePhone: '',
                  birthDate: '',
                  cep: '',
                  address: '',
                  number: '',
                  occupation: '',
                  education: '',
                  belt: 'Branca',
                  stripes: 0,
                  status: 'Active',
                  category: 'Adulto',
                  guardianName: '',
                  guardianDoc: '',
                  guardianEmail: '',
                  guardianPhone: '',
                  guardianOccupation: '',
                  facialId: '',
                  monthlyFee: 150,
                  planId: '',
                  gympassId: '',
                  nextPaymentDate: format(new Date(), 'yyyy-MM-dd')
                } as any);
                setIsModalOpen(true); 
              }}
              className="flex-1 sm:flex-none flex items-center justify-center px-6 py-3 text-sm font-black text-white bg-black rounded-xl hover:bg-gray-800 transition-all shadow-lg uppercase italic tracking-wider whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Aluno
            </button>
          )}
        </div>
      </header>

      <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-[32px]">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute w-5 h-5 text-gray-400 left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou email..." 
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 shrink-0 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {['Todas', 'Jiu-Jitsu', 'Muay Thai'].map((mod) => (
              <button
                key={mod}
                onClick={() => setModalityFilter(mod)}
                className={cn(
                  "px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border whitespace-nowrap",
                  modalityFilter === mod
                    ? "bg-black text-white border-black"
                    : "bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100"
                )}
              >
                {mod}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.length > 0 ? filteredStudents.map(student => (
            <div key={`student-${student.id}`} className="group p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-[32px] hover:shadow-xl transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <div className={cn(
                  "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                  student.status === 'Active' ? "bg-emerald-100 text-emerald-700" : 
                  student.status === 'Archived' ? "bg-rose-100 text-rose-700" : "bg-gray-200 text-gray-700"
                )}>
                  {student.status === 'Active' ? 'Ativo' : student.status === 'Archived' ? 'Arquivado' : 'Inativo'}
                </div>
                {getOverdueCount(student) > 0 && (
                  <div className="mt-1 px-3 py-1 bg-rose-600 text-white rounded-full text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1 shadow-sm">
                    <AlertCircle className="w-2.5 h-2.5" />
                    {getOverdueCount(student)} atrasada{getOverdueCount(student) > 1 ? 's' : ''}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl font-black text-gray-500 overflow-hidden shadow-inner">
                  {student.facePhoto ? (
                    <img src={student.facePhoto} className="w-full h-full object-cover" alt="" />
                  ) : student.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 leading-tight">{student.name}</h3>
                  <div className="flex flex-col gap-1 mt-1">
                    {(student.modalities || ['Jiu-Jitsu']).includes('Jiu-Jitsu') && (
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getBeltColor(student.belt, belts) }} />
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">BJJ: {normalizeBeltName(student.belt)}</span>
                      </div>
                    )}
                    {(student.modalities || []).includes('Muay Thai') && (
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">MT: {student.muayThaiGraduation || 'Branca'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-gray-600">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4" />
                    <span className="text-xs font-semibold">{student.phone || 'N/A'}</span>
                  </div>
                  {student.phone && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWhatsAppContact(student);
                      }}
                      className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="w-4 h-4 ml-[1px]" />
                  <span className="text-xs font-semibold truncate">{student.email || 'Sem e-mail'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-6 border-t border-gray-50 dark:border-white/5">
                <button 
                  onClick={() => { setSelectedStudent(student); setActiveSubTab('info'); }}
                  className="flex-1 py-2 bg-black dark:bg-white dark:text-black text-white text-xs font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-all"
                >
                  Detalhes
                </button>
                <button 
                  onClick={() => { setSelectedStudent(student); setActiveSubTab('financeiro'); }}
                  className="px-4 py-2 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-xl hover:bg-emerald-100 transition-all flex items-center gap-2"
                >
                  <DollarSign className="w-3 h-3" />
                  Histórico
                </button>
                {(isAdmin || isReceptionist) && (
                  <>
                    <button 
                      onClick={() => { 
                        setEditingStudent(student); 
                        const studentData = { ...student };
                        if (student.nextPaymentDate?.seconds) {
                          studentData.nextPaymentDate = format(new Date(student.nextPaymentDate.seconds * 1000), 'yyyy-MM-dd');
                        } else if (student.nextPaymentDate instanceof Date) {
                          studentData.nextPaymentDate = format(student.nextPaymentDate, 'yyyy-MM-dd');
                        }
                        setFormData(studentData); 
                        setIsModalOpen(true); 
                      }}
                      className="p-2 bg-gray-50 text-gray-400 hover:text-black rounded-xl transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={async () => {
                        const newStatus = student.status === 'Archived' ? 'Active' : 'Archived';
                        await updateStudent(student.id, { status: newStatus } as any);
                        toast.success(newStatus === 'Archived' ? "Aluno arquivado" : "Aluno reativado");
                      }}
                      className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                    >
                      {student.status === 'Archived' ? <RotateCcw className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
                    </button>
                  </>
                )}
              </div>
            </div>
          )) : (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-white/10 rounded-[40px]">
              <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-full mb-4">
                <Users className="w-12 h-12 text-gray-300 dark:text-gray-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nenhum aluno encontrado</h3>
              <p className="text-sm text-gray-400 max-w-xs mt-2 italic">
                Não encontramos nenhum aluno para os filtros selecionados ou para o termo de busca.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes do Aluno */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedStudent(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-3xl bg-white rounded-[40px] shadow-2xl overflow-hidden">
              <div className="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-[28px] bg-gray-100 flex items-center justify-center text-3xl font-black text-gray-400 overflow-hidden shadow-inner">
                      {selectedStudent.facePhoto ? <img src={selectedStudent.facePhoto} className="w-full h-full object-cover" alt="" /> : selectedStudent.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-black italic uppercase tracking-tighter leading-tight">{selectedStudent.name}</h2>
                      <div className="flex flex-wrap gap-4 mt-2">
                        {(selectedStudent.modalities || ['Jiu-Jitsu']).includes('Jiu-Jitsu') && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getBeltColor(selectedStudent.belt, belts) }} />
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Jiu-Jitsu</span>
                              <span className="text-xs font-bold text-gray-900">{normalizeBeltName(selectedStudent.belt)} • {selectedStudent.stripes} Graus</span>
                            </div>
                          </div>
                        )}
                        {(selectedStudent.modalities || []).includes('Muay Thai') && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-rose-500" />
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Muay Thai</span>
                              <span className="text-xs font-bold text-gray-900">{selectedStudent.muayThaiGraduation || 'Branca'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex gap-4 border-b border-gray-100 pb-4 mb-6">
                  <button 
                    onClick={() => setActiveSubTab('info')}
                    className={cn(
                      "px-4 py-2 rounded-xl font-bold text-sm transition-all",
                      activeSubTab === 'info' ? "bg-black text-white" : "text-gray-400 hover:bg-gray-50"
                    )}
                  >
                    Informações
                  </button>
                  <button 
                    onClick={() => setActiveSubTab('evaluations')}
                    className={cn(
                      "px-4 py-2 rounded-xl font-bold text-sm transition-all",
                      activeSubTab === 'evaluations' ? "bg-black text-white" : "text-gray-400 hover:bg-gray-50"
                    )}
                  >
                    Avaliações Técnicas
                  </button>
                  <button 
                    onClick={() => setActiveSubTab('graduations')}
                    className={cn(
                      "px-4 py-2 rounded-xl font-bold text-sm transition-all",
                      activeSubTab === 'graduations' ? "bg-black text-white" : "text-gray-400 hover:bg-gray-50"
                    )}
                  >
                    Graduações
                  </button>
                  <button 
                    onClick={() => setActiveSubTab('financeiro')}
                    className={cn(
                      "px-4 py-2 rounded-xl font-bold text-sm transition-all",
                      activeSubTab === 'financeiro' ? "bg-black text-white" : "text-gray-400 hover:bg-gray-50"
                    )}
                  >
                    Financeiro
                  </button>
                </div>

                {activeSubTab === 'info' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Graduação Atual</h4>
                        <div className="p-6 bg-black rounded-3xl text-white flex items-center justify-between relative overflow-hidden group">
                          <div className="relative z-10">
                            <h5 className="text-2xl font-black italic uppercase tracking-tighter">{normalizeBeltName(selectedStudent.belt)}</h5>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{selectedStudent.stripes} Graus</p>
                          </div>
                          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 relative z-10 transition-transform group-hover:scale-110">
                            <Award className="w-6 h-6 text-white" />
                          </div>
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Dados de Contato</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                              <Mail className="w-4 h-4" />
                            </div>
                            {selectedStudent.email || 'Não informado'}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                              <Phone className="w-4 h-4" />
                            </div>
                            {selectedStudent.phone}
                          </div>
                          {selectedStudent.messagePhone && (
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                <MessageSquare className="w-4 h-4" />
                              </div>
                              Recados: {selectedStudent.messagePhone}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Escolaridade</h4>
                          <p className="text-sm text-gray-600">{selectedStudent.education || 'Não informado'}</p>
                        </div>
                        {selectedStudent.occupation && (
                          <div>
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Profissão</h4>
                            <p className="text-sm text-gray-600">{selectedStudent.occupation}</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Endereço</h4>
                        <p className="text-sm text-gray-700">
                          {selectedStudent.address || 'Não informado'}
                          {selectedStudent.number ? `, ${selectedStudent.number}` : ''}
                          {selectedStudent.cep && ` - CEP: ${selectedStudent.cep}`}
                        </p>
                      </div>

                      {selectedStudent.guardianName && (
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                          <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Responsável</h4>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-blue-900">{selectedStudent.guardianName}</p>
                            <p className="text-xs text-blue-700">{selectedStudent.guardianPhone}</p>
                            {selectedStudent.guardianOccupation && (
                              <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wider">Profissão: {selectedStudent.guardianOccupation}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Plano e Pagamento</h4>
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <p className="text-sm font-bold text-gray-900">{plans.find(p => p.id === selectedStudent.planId)?.name || 'Sem plano'}</p>
                          <p className="text-xs text-gray-500">
                        Vencimento: {selectedStudent.nextPaymentDate ? (
                          selectedStudent.nextPaymentDate.seconds 
                            ? format(new Date(selectedStudent.nextPaymentDate.seconds * 1000), 'dd/MM/yyyy')
                            : (selectedStudent.nextPaymentDate instanceof Date 
                                ? format(selectedStudent.nextPaymentDate, 'dd/MM/yyyy')
                                : format(new Date(selectedStudent.nextPaymentDate), 'dd/MM/yyyy'))
                        ) : 'N/A'}
                      </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => { setSelectedStudent(null); setEditingStudent(selectedStudent); setFormData(selectedStudent); setIsModalOpen(true); }}
                          className="flex-1 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all text-sm flex items-center justify-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          Editar Cadastro
                        </button>
                      </div>
                    </div>
                  </div>
                ) : activeSubTab === 'evaluations' ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-gray-900">Histórico de Avaliações</h4>
                      <button 
                        onClick={() => setIsEvaluationModalOpen(true)}
                        className="px-4 py-2 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all text-xs flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Nova Observação
                      </button>
                    </div>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      {studentEvaluations.length > 0 ? studentEvaluations.map(eval_ => (
                        <div key={`eval-${eval_.id}`} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 relative group">
                          <div className="flex items-center justify-between mb-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest",
                              eval_.type === 'Technical' ? "bg-blue-100 text-blue-600" : 
                              eval_.type === 'Behavioral' ? "bg-purple-100 text-purple-600" : "bg-gray-200 text-gray-600"
                            )}>
                              {eval_.type}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold">
                              {eval_.date?.seconds ? format(new Date(eval_.date.seconds * 1000), 'dd/MM/yyyy HH:mm') : 
                               (eval_.date instanceof Date ? format(eval_.date, 'dd/MM/yyyy HH:mm') : 'N/A')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{eval_.note}</p>
                          <p className="mt-2 text-[10px] text-gray-400 font-bold italic">— Prof. {eval_.professorName}</p>
                          
                          {isAdmin && (
                            <button 
                              onClick={async () => {
                                if (confirm("Excluir esta observação?")) {
                                  await deleteEvaluation(eval_.id);
                                  toast.success("Observação excluída.");
                                }
                              }}
                              className="absolute top-4 right-4 p-1 text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )) : (
                        <div className="text-center py-12 bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                          <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-400 italic">Nenhuma observação técnica registrada.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-gray-900">Linha do Tempo de Graduação</h4>
                      <button 
                        onClick={() => {
                          setGraduationData({
                            belt: selectedStudent.belt,
                            stripes: selectedStudent.stripes,
                            notes: '',
                            date: format(new Date(), 'yyyy-MM-dd')
                          });
                          setIsGraduationModalOpen(true);
                        }}
                        className="px-4 py-2 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all text-xs flex items-center gap-2"
                      >
                        <Award className="w-4 h-4" />
                        Nova Graduação
                      </button>
                    </div>

                    <div className="relative space-y-6 before:absolute before:inset-y-0 before:left-4 before:w-0.5 before:bg-gray-100 pb-4">
                      {studentGraduations.length > 0 ? studentGraduations.map((grad, idx) => (
                        <div key={`grad-${grad.id}`} className="relative pl-12 group">
                          <div className={cn(
                            "absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 transition-transform group-hover:scale-125",
                            idx === 0 ? "bg-black" : "bg-gray-300"
                          )} />
                          <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-2 transition-all group-hover:bg-white group-hover:shadow-xl group-hover:shadow-black/5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-black uppercase italic tracking-tighter">{grad.belt}</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">• {grad.stripes} Graus</span>
                              </div>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                {grad.date?.seconds ? format(new Date(grad.date.seconds * 1000), 'dd MMM yyyy', { locale: ptBR }) :
                                 (grad.date ? format(new Date(grad.date), 'dd MMM yyyy', { locale: ptBR }) : 'N/A')}
                              </span>
                            </div>
                            {grad.notes && <p className="text-xs text-gray-600 italic leading-relaxed">"{grad.notes}"</p>}
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">— Prof. {grad.instructorName}</p>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-12 bg-gray-50 rounded-[32px] border border-dashed border-gray-200 ml-12">
                          <Award className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-400 italic">Nenhum histórico de graduação registrado.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeSubTab === 'financeiro' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-5 bg-emerald-100 rounded-[28px] border border-emerald-200">
                        <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Pagamentos Realizados</p>
                        <p className="text-2xl font-black text-emerald-900 italic tracking-tighter">
                          {formatCurrency(payments.filter(p => p.studentId === selectedStudent.id && (p.status === 'Paid' || p.status === 'paid')).reduce((acc, curr) => acc + Number(curr.amount), 0))}
                        </p>
                      </div>
                      <div className="p-5 bg-rose-100 rounded-[28px] border border-rose-200">
                        <p className="text-[10px] font-black text-rose-800 uppercase tracking-widest mb-1">Pendências/Atrasos</p>
                        <p className="text-2xl font-black text-rose-900 italic tracking-tighter">
                          {formatCurrency(
                            payments.filter(p => p.studentId === selectedStudent.id && (p.status === 'Pending' || p.status === 'pending')).reduce((acc, curr) => acc + Number(curr.amount), 0) +
                            installments.filter(i => i.studentId === selectedStudent.id && i.status === 'pending').reduce((acc, curr) => acc + Number(curr.amount), 0)
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2">Histórico de Mensalidades</h4>
                      <div className="space-y-2 text-gray-700">
                        {payments.filter(p => p.studentId === selectedStudent.id).length > 0 ? (
                          payments
                            .filter(p => p.studentId === selectedStudent.id)
                            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                            .map(pay => (
                              <div key={`payment-${pay.id}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 font-medium">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-500 shadow-sm">
                                    <CreditCard className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-gray-900">{pay.period}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">{pay.planName || 'Plano Personalizado'} • {pay.method}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-black text-gray-900">{formatCurrency(pay.amount)}</p>
                                  <span className={cn(
                                    "text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full",
                                    (pay.status === 'Paid' || pay.status === 'paid') ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                                  )}>
                                    {(pay.status === 'Paid' || pay.status === 'paid') ? 'Pago' : 'Pendente'}
                                  </span>
                                </div>
                              </div>
                            ))
                        ) : (
                          <p className="text-xs text-gray-400 italic text-center py-4">Nenhuma mensalidade registrada.</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Parcelas de Vendas (Estoque)</h4>
                      <div className="space-y-2">
                        {installments.filter(i => i.studentId === selectedStudent.id).length > 0 ? (
                          installments
                            .filter(i => i.studentId === selectedStudent.id)
                            .sort((a, b) => (a.dueDate?.seconds || 0) - (b.dueDate?.seconds || 0))
                            .map(inst => {
                              const isOverdue = inst.status === 'pending' && inst.dueDate?.seconds && new Date(inst.dueDate.seconds * 1000) < new Date();
                              return (
                                <div key={`installment-${inst.id}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-400 shadow-sm">
                                      <ShoppingCart className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-gray-900">{inst.productName}</p>
                                      <p className="text-[10px] text-gray-400 font-bold uppercase">
                                        Vencimento: {inst.dueDate?.seconds ? format(new Date(inst.dueDate.seconds * 1000), 'dd/MM/yyyy') : 'N/A'} • {inst.installmentNumber}/{inst.totalInstallments}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-black text-gray-900">{formatCurrency(inst.amount)}</p>
                                    <span className={cn(
                                      "text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full",
                                      inst.status === 'paid' ? "bg-emerald-100 text-emerald-600" : 
                                      isOverdue ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                                    )}>
                                      {inst.status === 'paid' ? 'Pago' : isOverdue ? 'Atrasado' : 'Pendente'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                        ) : (
                          <p className="text-xs text-gray-400 italic text-center py-4">Nenhuma parcela registrada.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Graduação */}
      <AnimatePresence>
        {isGraduationModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsGraduationModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter">Registrar Graduação</h2>
                    <p className="text-gray-500 font-medium">Atualize a faixa e o grau do aluno.</p>
                  </div>
                  <button onClick={() => setIsGraduationModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleGraduation} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Nova Faixa</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 outline-none transition-all text-sm font-bold"
                        value={graduationData.belt}
                        onChange={(e) => setGraduationData({ ...graduationData, belt: e.target.value })}
                      >
                        {belts
                          .filter((b: any) => 
                            !b.category || 
                            b.category === 'Ambas' || 
                            b.category === selectedStudent?.category ||
                            (selectedStudent?.category === 'Infantil' && (b.category === 'Kids' || b.category === 'Juvenil'))
                          )
                          .map((b: any, index: number) => (
                            <option key={`grad-belt-${b.id}-${index}`} value={b.name}>{normalizeBeltName(b.name)}</option>
                          ))
                        }
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Graus (0-4)</label>
                      <input 
                        required
                        type="number"
                        min="0"
                        max="4"
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 outline-none transition-all text-sm font-bold"
                        value={graduationData.stripes}
                        onChange={(e) => setGraduationData({ ...graduationData, stripes: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Data da Promoção</label>
                    <input 
                      required
                      type="date"
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 outline-none transition-all text-sm font-bold"
                      value={graduationData.date}
                      onChange={(e) => setGraduationData({ ...graduationData, date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Observações / Notas</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 outline-none transition-all text-sm min-h-[100px] resize-none"
                      placeholder="Ex: Ótima performance no exame..."
                      value={graduationData.notes}
                      onChange={(e) => setGraduationData({ ...graduationData, notes: e.target.value })}
                    ></textarea>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                  >
                    Confirmar Promoção
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Aluno */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-6 sm:p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-black italic uppercase tracking-tighter">
                      {editingStudent ? 'Editar Aluno' : 'Novo Aluno'}
                    </h2>
                    <p className="text-gray-500 font-medium">Preencha os dados do membro.</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleAddStudent} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Nome Completo</label>
                      <input 
                        required
                        type="text" 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Email (Opcional)</label>
                      <input 
                        type="email" 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Gympass ID (Opcional)</label>
                       <input 
                        type="text" 
                        placeholder="Ex: 000123456"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        value={formData.gympassId}
                        onChange={(e) => setFormData({ ...formData, gympassId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Telefone</label>
                      <input 
                        type="text" 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Telefone de Recados</label>
                       <input 
                        type="text" 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        value={formData.messagePhone}
                        onChange={(e) => setFormData({ ...formData, messagePhone: maskPhone(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">CEP</label>
                      <input 
                        type="text" 
                        placeholder="00000-000"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        value={formData.cep}
                        onChange={(e) => {
                          const val = maskCEP(e.target.value);
                          setFormData({ ...formData, cep: val });
                          if (val.replace(/\D/g, '').length === 8) {
                            handleCEPLookup(val);
                          }
                        }}
                        onBlur={(e) => handleCEPLookup(e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-1 space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-2">Rua / Logradouro</label>
                      <input 
                        required
                        type="text" 
                        placeholder="Ex: Rua das Flores"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-1 space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-2">Número</label>
                      <input 
                        required
                        type="text" 
                        placeholder="Ex: 123"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        value={(formData as any).number || ''}
                        onChange={(e) => setFormData({ ...formData, number: e.target.value } as any)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-2">Escolaridade</label>
                      <select 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all appearance-none font-semibold"
                        value={formData.education}
                        onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                      >
                        <option value="">Selecione</option>
                        <option value="Ensino Fundamental Incompleto">Ensino Fundamental Incompleto</option>
                        <option value="Ensino Fundamental Completo">Ensino Fundamental Completo</option>
                        <option value="Ensino Médio Incompleto">Ensino Médio Incompleto</option>
                        <option value="Ensino Médio Completo">Ensino Médio Completo</option>
                        <option value="Ensino Superior Incompleto">Ensino Superior Incompleto</option>
                        <option value="Ensino Superior Completo">Ensino Superior Completo</option>
                        <option value="Pós-graduação">Pós-graduação</option>
                      </select>
                    </div>
                    {!isMinor && (
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-2">Profissão (Opcional)</label>
                        <input 
                          type="text" 
                          className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-semibold"
                          value={formData.occupation}
                          onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-2">Categoria</label>
                      <select 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all appearance-none font-semibold"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="Adulto">Adulto</option>
                        <option value="Infantil">Infantil</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-2">Data de Nascimento</label>
                      <input 
                        type="date" 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-semibold"
                        value={formData.birthDate}
                        onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-4">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-2">Modalidades Pratícadas</label>
                      <div className="flex flex-wrap gap-3">
                        {['Jiu-Jitsu', 'Muay Thai'].map(mod => {
                          const isSelected = (formData.modalities || []).includes(mod);
                          return (
                            <button
                              key={mod}
                              type="button"
                              onClick={() => {
                                const current = formData.modalities || [];
                                const next = isSelected 
                                  ? current.filter(m => m !== mod)
                                  : [...current, mod];
                                if (next.length === 0) return; // Must have at least one
                                setFormData({ ...formData, modalities: next });
                              }}
                              className={cn(
                                "px-6 py-3 rounded-2xl text-sm font-bold transition-all border-2",
                                isSelected 
                                  ? "bg-black text-white border-black shadow-lg" 
                                  : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
                              )}
                            >
                              {mod}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {(formData.modalities || []).includes('Jiu-Jitsu') && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Faixa Jiu-Jitsu</label>
                          <select 
                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all appearance-none"
                            value={formData.belt}
                            onChange={(e) => setFormData({ ...formData, belt: e.target.value })}
                          >
                        {belts
                          .filter((b: any) => 
                            !b.category || 
                            b.category === 'Ambas' || 
                            b.category === formData.category || 
                            (formData.category === 'Infantil' && (b.category === 'Kids' || b.category === 'Juvenil'))
                          )
                          .map((b: any, index: number) => (
                            <option key={`form-belt-${b.id}-${index}`} value={b.name}>{normalizeBeltName(b.name)}</option>
                          ))
                        }
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Graus (Jiu-Jitsu)</label>
                          <input 
                            type="number" 
                            min="0" max="4"
                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                            value={formData.stripes}
                            onChange={(e) => setFormData({ ...formData, stripes: parseInt(e.target.value) })}
                          />
                        </div>
                      </>
                    )}

                    {(formData.modalities || []).includes('Muay Thai') && (
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Graduação Muay Thai (Kruang)</label>
                        <select 
                          className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all appearance-none"
                          value={formData.muayThaiGraduation}
                          onChange={(e) => setFormData({ ...formData, muayThaiGraduation: e.target.value })}
                        >
                          {muayThaiGraduations.map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Plano</label>
                      <select 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all appearance-none"
                        value={formData.planId}
                        onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                      >
                        <option value="">Selecione um plano</option>
                        {plans.map(p => (
                          <option key={`plan-${p.id}`} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Mensalidade (R$)</label>
                      <input 
                        type="number" 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        value={formData.monthlyFee}
                        onChange={(e) => setFormData({ ...formData, monthlyFee: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Data do Próximo Vencimento</label>
                      <input 
                        required
                        type="date" 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        value={formData.nextPaymentDate}
                        onChange={(e) => setFormData({ ...formData, nextPaymentDate: e.target.value })}
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Possui alguma deficiência ou condição especial?</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Autismo, TDAH, Condição física, etc. (Deixe em branco se não houver)"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        value={formData.disability}
                        onChange={(e) => setFormData({ ...formData, disability: e.target.value })}
                      />
                    </div>

                    {isMinor && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100"
                      >
                        <div className="md:col-span-2">
                          <h3 className="text-sm font-black text-black uppercase tracking-widest mb-2">Dados do Responsável</h3>
                          <p className="text-xs text-gray-400 font-medium">Obrigatório para alunos menores de 18 anos.</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Nome do Responsável</label>
                          <input 
                            required={isMinor}
                            type="text" 
                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                            value={formData.guardianName}
                            onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Documento (CPF/RG) (Opcional)</label>
                          <input 
                            type="text" 
                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                            value={formData.guardianDoc}
                            onChange={(e) => setFormData({ ...formData, guardianDoc: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Email do Responsável (Opcional)</label>
                          <input 
                            type="email" 
                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                            value={formData.guardianEmail}
                            onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Telefone do Responsável</label>
                          <input 
                            required={isMinor}
                            type="text" 
                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                            value={formData.guardianPhone}
                            onChange={(e) => setFormData({ ...formData, guardianPhone: maskPhone(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Profissão do Responsável (Opcional)</label>
                          <input 
                            type="text" 
                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                            value={formData.guardianOccupation}
                            onChange={(e) => setFormData({ ...formData, guardianOccupation: e.target.value })}
                          />
                        </div>
                      </motion.div>
                    )}

                    <div className="md:col-span-2 space-y-4">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Reconhecimento Facial</label>
                      <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">
                        {isCapturing ? (
                          <div className="space-y-4 w-full flex flex-col items-center">
                            <video 
                              ref={videoRef} 
                              autoPlay 
                              muted 
                              className={cn(
                                "w-full max-w-sm rounded-2xl shadow-lg bg-black aspect-video object-cover transition-all",
                                facingMode === 'user' && "-scale-x-100"
                              )}
                            />
                            <div className="flex gap-2">
                              <button 
                                type="button"
                                onClick={toggleCamera}
                                className="px-4 py-2 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-all flex items-center gap-2"
                                title="Inverter Câmera"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Inverter
                              </button>
                              <button 
                                type="button"
                                onClick={takePhoto}
                                className="px-6 py-2 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all"
                              >
                                Capturar Rosto
                              </button>
                              <button 
                                type="button"
                                onClick={stopCamera}
                                className="px-6 py-2 bg-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-300 transition-all"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-4">
                            {(formData as any).facePhoto ? (
                              <div className="relative group">
                                <img 
                                  src={(formData as any).facePhoto} 
                                  className="w-32 h-32 rounded-2xl object-cover shadow-md" 
                                  alt="Facial" 
                                />
                                <button 
                                  type="button"
                                  onClick={handleCaptureFace}
                                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center text-white font-bold text-xs"
                                >
                                  Alterar
                                </button>
                              </div>
                            ) : (
                              <button 
                                type="button"
                                onClick={handleCaptureFace}
                                className="flex flex-col items-center gap-2 text-gray-400 hover:text-black transition-colors"
                              >
                                <Scan className="w-12 h-12" />
                                <span className="text-xs font-bold uppercase tracking-wider">Cadastrar Biometria Facial</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button 
                      type="submit"
                      className="w-full py-5 bg-black text-white font-black text-lg rounded-2xl hover:bg-gray-800 transition-all shadow-xl active:scale-95 uppercase italic tracking-tighter"
                    >
                      {editingStudent ? 'Salvar Alterações' : 'Cadastrar Aluno'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modal de Nova Avaliação */}
      <AnimatePresence>
        {isEvaluationModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEvaluationModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8">
              <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter mb-6">Nova Observação</h2>
              <form onSubmit={handleSaveEvaluation} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 ml-2">Tipo de Nota</label>
                  <select 
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none appearance-none"
                    value={evaluationType}
                    onChange={(e) => setEvaluationType(e.target.value)}
                  >
                    <option value="Technical">Técnica (Jiu-Jitsu)</option>
                    <option value="Behavioral">Comportamental</option>
                    <option value="General">Geral</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 ml-2">Observação</label>
                  <textarea 
                    required
                    rows={4}
                    placeholder="Descreva o desempenho ou comportamento do aluno..."
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none resize-none"
                    value={evaluationNote}
                    onChange={(e) => setEvaluationNote(e.target.value)}
                  />
                </div>
                <button type="submit" className="w-full py-4 bg-black text-white font-black rounded-2xl hover:bg-gray-800 transition-all uppercase italic">Salvar Observação</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
