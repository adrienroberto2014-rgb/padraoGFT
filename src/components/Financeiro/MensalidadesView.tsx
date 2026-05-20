import React, { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Calendar,
  DollarSign,
  User,
  Trash2,
  ShoppingCart,
  MessageCircle,
  X
} from 'lucide-react';
import { format, isAfter, isBefore, startOfMonth, endOfMonth, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, cn } from '../../utils/formatters';
import { useStudents } from '../../application/hooks/useStudents';
import { useFinance } from '../../application/hooks/useFinance';
import { usePlans } from '../../application/hooks/usePlans';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';

export const MensalidadesView = () => {
  const { isAdmin, permissions } = useAuth();
  const { students } = useStudents(true, isAdmin || permissions.students);
  const { plans } = usePlans(true);
  const { 
    receiveInstallment, 
    registerPayment, 
    deleteInstallment,
    installments 
  } = useFinance();
  
  const [activeTab, setActiveTab] = useState<'students' | 'installments'>('students');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedInstallment, setSelectedInstallment] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'Dinheiro',
    date: format(new Date(), 'yyyy-MM-dd'),
    monthsCount: 1,
    referencePeriod: format(new Date(), 'yyyy-MM'),
    selectedMonths: [] as string[]
  });

  const getAvailableMonths = (student: any) => {
    if (!student?.nextPaymentDate) return [];
    
    const plan = plans.find(p => p.id === student.planId);
    if (!plan) return [];
    
    const nextDate = student.nextPaymentDate.toDate ? student.nextPaymentDate.toDate() : new Date(student.nextPaymentDate);
    const months = [];
    
    // Start from the current nextPaymentDate
    let current = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
    const now = new Date();
    // Allow selecting up to 6 months in the future or current overdue ones
    const limit = new Date(now.getFullYear(), now.getMonth() + 6, 1);
    
    while (current <= limit) {
      months.push({
        id: format(current, 'yyyy-MM'),
        label: format(current, 'MMMM yyyy', { locale: ptBR }),
        date: new Date(current),
        isOverdue: isBefore(current, startOfMonth(now)),
        isCurrent: format(current, 'yyyy-MM') === format(now, 'yyyy-MM')
      });
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      
      // Safety break to prevent infinite loops
      if (months.length > 24) break;
    }
    
    return months;
  };

  const [installmentPaymentData, setInstallmentPaymentData] = useState({
    method: 'Pix'
  });

  const getStatus = (student: any) => {
    const plan = plans.find(p => p.id === student.planId);
    const planName = (plan?.name || "").toLowerCase();
    
    // Administrative cases that shouldn't be overdue
    const isSpecialCase = 
      planName.includes('gympass') || 
      planName.includes('total pass') || 
      planName.includes('totalpass') || 
      planName.includes('projeto') ||
      !!student.gympassId;

    if (isSpecialCase) return 'paid';

    if (!student.nextPaymentDate) return 'pending';
    const nextDate = student.nextPaymentDate.toDate ? student.nextPaymentDate.toDate() : new Date(student.nextPaymentDate);
    const now = new Date();
    
    if (isBefore(nextDate, now)) return 'overdue';
    if (isAfter(nextDate, endOfMonth(now))) return 'paid';
    return 'pending';
  };

  const getOverdueMonths = (student: any) => {
    const status = getStatus(student);
    if (status !== 'overdue') return 0;
    
    const nextDate = student.nextPaymentDate.toDate ? student.nextPaymentDate.toDate() : new Date(student.nextPaymentDate);
    const now = new Date();
    
    // If nextDate is in the past, they at least owe the one from that date.
    // We count how many billing cycles (months) have passed since that date.
    return Math.max(1, differenceInMonths(now, nextDate) + 1);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const status = getStatus(s);
    
    if (filter === 'all') return matchesSearch;
    return matchesSearch && status === filter;
  });

  const filteredInstallments = (installments || []).filter(inst => {
    const matchesSearch = inst.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         inst.productName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    const isOverdue = inst.status === 'pending' && 
                     inst.dueDate?.seconds && 
                     new Date(inst.dueDate.seconds * 1000) < new Date();

    if (filter === 'all') return true;
    if (filter === 'overdue') return isOverdue;
    if (filter === 'pending') return inst.status === 'pending' && !isOverdue;
    return inst.status === filter;
  });

  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      const plan = plans.find(p => p.id === selectedStudent.planId);
      const amount = parseFloat(paymentData.amount);
      
      const [pYear, pMonth, pDay] = paymentData.date.split('-').map(Number);
      const paymentDate = new Date(pYear, pMonth - 1, pDay);
      
      // Use the earliest month as reference period for the log, 
      // but the total count will move the nextPaymentDate forward
      const referenceMonthId = paymentData.selectedMonths.length > 0 
        ? paymentData.selectedMonths[0] 
        : paymentData.referencePeriod;
        
      const [rYear, rMonth] = referenceMonthId.split('-').map(Number);
      const referenceDate = new Date(rYear, rMonth - 1, 1);
      
      const currentPeriod = paymentData.selectedMonths.length > 1 
        ? `${format(new Date(rYear, rMonth - 1, 1), 'MMM/yy', { locale: ptBR })} - ${format(new Date(pYear, pMonth - 1, 1), 'MMM/yy', { locale: ptBR })}`
        : format(referenceDate, 'MMMM yyyy', { locale: ptBR });

      await registerPayment({
        studentId: selectedStudent.id,
        amount: amount,
        method: paymentData.method as any,
        date: paymentDate,
        period: currentPeriod,
        monthsCount: paymentData.monthsCount,
      });

      setIsModalOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error("Error receiving payment:", error);
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
    if (window.confirm("Deseja realmente excluir esta parcela? Esta ação não pode ser desfeita.")) {
      try {
        await deleteInstallment(id);
        toast.success("Parcela excluída com sucesso.");
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleWhatsAppMonthlyFee = (student: any) => {
    if (!student?.phone) {
      toast.error("Aluno sem telefone cadastrado.");
      return;
    }

    const plan = plans.find(p => p.id === student.planId);
    const dueDateStr = student.nextPaymentDate 
      ? format(student.nextPaymentDate.toDate ? student.nextPaymentDate.toDate() : new Date(student.nextPaymentDate), 'dd/MM/yyyy')
      : 'N/A';
    
    const status = getStatus(student);
    const overdueMonths = getOverdueMonths(student);
    const totalPrice = (plan?.price || 0) * (overdueMonths > 0 ? overdueMonths : 1);
    let message = "";
    
    if (status === "overdue") {
      message = `Olá ${student.name}, tudo bem? Identificamos que sua mensalidade do plano ${plan?.name} está em atraso (${overdueMonths} ${overdueMonths === 1 ? "mês" : "meses"}). O valor total pendente é de ${formatCurrency(totalPrice)}. Poderia verificar, por favor? Segue nossa chave PIX para pagamento: [SUA CHAVE PIX AQUI]. Oss!`;
    } else {
      message = `Olá ${student.name}, tudo bem? Passando para lembrar que sua mensalidade do plano ${plan?.name} vence em ${dueDateStr}, no valor de ${formatCurrency(plan?.price || 0)}. Segue nossa chave PIX para pagamento: [SUA CHAVE PIX AQUI]. Oss!`;
    }

    const encodedMessage = encodeURIComponent(message);
    const phone = student.phone.replace(/\D/g, "");
    window.open(`https://wa.me/55${phone}?text=${encodedMessage}`, "_blank");
  };

  const handleWhatsAppCollection = (inst: any) => {
    const student = students.find(s => s.id === inst.studentId);
    if (!student?.phone) {
      toast.error("Aluno sem telefone cadastrado.");
      return;
    }

    const dueDateStr = inst.dueDate?.seconds 
      ? format(new Date(inst.dueDate.seconds * 1000), 'dd/MM/yyyy')
      : (inst.dueDate ? format(new Date(inst.dueDate), 'dd/MM/yyyy') : 'N/A');

    const message = `Olá ${student.name}, tudo bem? Passando para lembrar da sua parcela de ${inst.productName} (${inst.installmentNumber}/${inst.totalInstallments}) no valor de ${formatCurrency(inst.amount)}, com vencimento em ${dueDateStr}. Segue nossa chave PIX para pagamento: [SUA CHAVE PIX AQUI]. Oss!`;
    const encodedMessage = encodeURIComponent(message);
    const phone = student.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-black italic uppercase tracking-tighter">Recebimentos</h1>
          <p className="text-gray-500 font-medium">Gestão de mensalidades e parcelas de vendas.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button
            onClick={() => { setActiveTab('students'); setFilter('all'); }}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'students' ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Alunos/Mensalidades
          </button>
          <button
            onClick={() => { setActiveTab('installments'); setFilter('all'); }}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'installments' ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Vendas Parceladas
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex bg-gray-100 p-1 rounded-2xl w-full md:w-auto">
          {(['all', 'paid', 'pending', 'overdue'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex-1 md:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                filter === f ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              {f === 'all' ? 'Todos' : f === 'paid' ? 'Em dia' : f === 'pending' ? 'Pendente' : 'Atrasado'}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder={activeTab === 'students' ? "Buscar aluno..." : "Buscar venda/aluno..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-black/5 transition-all font-medium"
          />
        </div>
      </div>

      {activeTab === 'students' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map(student => {
            const status = getStatus(student);
            const overdueMonths = getOverdueMonths(student);
            const plan = plans.find(p => p.id === student.planId);
            
            return (
              <div key={`student-mensalidade-${student.id}`} className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm hover:shadow-xl transition-all group">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 font-bold">
                      {student.name[0]}
                    </div>
                    <div>
                      <h3 className="font-black text-gray-900 uppercase italic tracking-tighter">{student.name}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{plan?.name || 'Sem Plano'}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5",
                    status === 'paid' ? "bg-emerald-50 text-emerald-600" : 
                    status === 'overdue' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                  )}>
                    {status === 'paid' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        Em dia
                      </>
                    ) : status === 'overdue' ? (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        {overdueMonths} {overdueMonths === 1 ? 'mês' : 'meses'} atrasado
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3" />
                        Pendente
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-bold uppercase tracking-widest">Vencimento</span>
                    <span className="text-gray-900 font-black">
                      {student.nextPaymentDate ? format(student.nextPaymentDate.toDate ? student.nextPaymentDate.toDate() : new Date(student.nextPaymentDate), 'dd/MM/yyyy') : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-bold uppercase tracking-widest">Valor Plano</span>
                    <span className="text-gray-900 font-black">{formatCurrency(plan?.price || 0)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setSelectedStudent(student);
                      setPaymentData({
                        amount: (plan?.price || 0).toString(),
                        method: 'Dinheiro',
                        date: format(new Date(), 'yyyy-MM-dd'),
                        monthsCount: 1,
                        referencePeriod: format(new Date(), 'yyyy-MM'),
                        selectedMonths: [format(student.nextPaymentDate?.toDate ? student.nextPaymentDate.toDate() : (student.nextPaymentDate ? new Date(student.nextPaymentDate) : new Date()), 'yyyy-MM')]
                      });
                      setIsModalOpen(true);
                    }}
                    className="flex-1 py-4 bg-black text-white font-black rounded-2xl hover:bg-gray-800 transition-all uppercase italic tracking-widest text-xs"
                  >
                    Receber
                  </button>
                  <button 
                    onClick={() => handleWhatsAppMonthlyFee(student)}
                    className="p-4 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all flex items-center justify-center"
                    title="Cobrar via WhatsApp"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cliente / Produto</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Parcela</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vencimento</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valor</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredInstallments.map(inst => (
                  <tr key={`installment-${inst.id}`} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 font-bold">
                          {inst.studentName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{inst.studentName}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{inst.productName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-xs font-black text-gray-500">
                      {inst.installmentNumber}/{inst.totalInstallments}
                    </td>
                    <td className="px-8 py-5 text-sm text-gray-600 font-medium italic tracking-tight">
                      {inst.dueDate?.seconds ? format(new Date(inst.dueDate.seconds * 1000), 'dd/MM/yyyy') : ''}
                    </td>
                    <td className="px-8 py-5 text-sm font-black text-gray-900">
                      {formatCurrency(inst.amount)}
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full",
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
          </div>
        </div>
      )}

      {/* Modal Mensalidade */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-white">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter">Receber Mensalidade</h2>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">{selectedStudent?.name}</p>
                </div>
              </div>

              <form onSubmit={handleReceivePayment} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Selecionar Parcelas/Meses</label>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-2xl border border-gray-100">
                    {getAvailableMonths(selectedStudent).map(month => (
                      <button
                        key={month.id}
                        type="button"
                        onClick={() => {
                          const isSelected = paymentData.selectedMonths.includes(month.id);
                          let newSelected = [];
                          
                          if (isSelected) {
                            // If deselecting, we should probably deselect everything AFTER it too to maintain sequence
                            newSelected = paymentData.selectedMonths.filter(m => m < month.id);
                          } else {
                            // If selecting, we should select everything BEFORE it to maintain sequence
                            const all = getAvailableMonths(selectedStudent);
                            newSelected = all
                              .filter(m => m.id <= month.id)
                              .map(m => m.id);
                          }
                          
                          const plan = plans.find(p => p.id === selectedStudent?.planId);
                          const count = newSelected.length || 1;
                          
                          setPaymentData({
                            ...paymentData,
                            selectedMonths: newSelected.length > 0 ? newSelected : [month.id],
                            monthsCount: count,
                            amount: ((plan?.price || 0) * count).toString(),
                            referencePeriod: newSelected.length > 0 ? newSelected[0] : month.id
                          });
                        }}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left",
                          paymentData.selectedMonths.includes(month.id)
                            ? "bg-black border-black text-white"
                            : "bg-white border-transparent text-gray-900 hover:border-gray-200"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                            paymentData.selectedMonths.includes(month.id) ? "border-white" : "border-gray-300"
                          )}>
                            {paymentData.selectedMonths.includes(month.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase italic">{month.label}</p>
                            {month.isOverdue && <p className={cn("text-[8px] font-bold uppercase", paymentData.selectedMonths.includes(month.id) ? "text-gray-400" : "text-rose-500")}>Atrasado</p>}
                          </div>
                        </div>
                        <span className="text-[10px] font-black">{formatCurrency(plans.find(p => p.id === selectedStudent?.planId)?.price || 0)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Valor Total</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-400">R$</span>
                      <input 
                        required 
                        type="number" 
                        step="0.01"
                        className="w-full pl-14 pr-6 py-4 bg-gray-50 rounded-2xl outline-none font-black text-lg" 
                        value={paymentData.amount} 
                        onChange={e => setPaymentData({...paymentData, amount: e.target.value})} 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Forma de Pagamento</label>
                  <select 
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold appearance-none"
                    value={paymentData.method}
                    onChange={e => setPaymentData({...paymentData, method: e.target.value})}
                  >
                    <option value="Pix">Pix</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Data do Pagamento</label>
                  <input 
                    required 
                    type="date" 
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold" 
                    value={paymentData.date} 
                    onChange={e => setPaymentData({...paymentData, date: e.target.value})} 
                  />
                </div>

                <button type="submit" className="w-full py-5 bg-black text-white font-black rounded-[24px] hover:bg-gray-800 transition-all uppercase italic tracking-widest shadow-xl">
                  Confirmar Recebimento
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Receber Parcela */}
      <AnimatePresence>
        {isInstallmentModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsInstallmentModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8">
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
    </div>
  );
};
