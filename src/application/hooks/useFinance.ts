import { usePayments } from './usePayments';
import { useInstallments } from './useInstallments';
import { useStudents } from './useStudents';
import { usePlans } from './usePlans';
import { useAuth } from '../../contexts/AuthContext';
import { Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

export const useFinance = (enabled: boolean = true) => {
  const { isAdmin, permissions } = useAuth();
  
  const paymentsHook = usePayments(enabled && (isAdmin || permissions?.finance), isAdmin);
  const installmentsHook = useInstallments(enabled && (isAdmin || permissions?.finance));
  const studentsHook = useStudents(enabled, isAdmin || permissions?.students);
  const plansHook = usePlans(enabled);

  const receiveInstallment = async (installment: any, method?: string) => {
    try {
      const finalMethod = method || installment.paymentMethod || 'Pix';
      
      // 1. Update installment status
      await installmentsHook.updateInstallment(installment.id, { 
        status: 'paid',
        paidAt: new Date(),
        paymentMethod: finalMethod
      });

      // 2. Add to cash flow (payments)
      await paymentsHook.processPayment({
        studentId: installment.studentId,
        studentName: installment.studentName,
        amount: installment.amount,
        method: finalMethod,
        type: 'venda',
        notes: `Parcela ${installment.installmentNumber}/${installment.totalInstallments} - ${installment.productName}`,
        date: Timestamp.now()
      });

      toast.success("Parcela recebida!");
    } catch (error) {
      toast.error("Erro ao processar recebimento.");
      throw error;
    }
  };

  const registerPayment = async (data: {
    studentId: string;
    amount: number;
    method: any;
    period: string;
    date: Date;
    monthsCount?: number;
    notes?: string;
  }) => {
    try {
      const student = studentsHook.students.find(s => s.id === data.studentId);
      const plan = plansHook.plans.find(p => p.id === student?.planId);
      
      const payload = {
        studentId: data.studentId,
        studentName: student?.name || 'Avulso',
        amount: data.amount,
        method: data.method,
        type: student ? 'mensalidade' as const : 'other' as const,
        date: Timestamp.fromDate(data.date),
        period: data.period,
        notes: data.notes || (student ? plan?.name : 'Outro') || 'Outro'
      };

      if (student) {
        const totalDuration = (plan?.durationMonths || 1) * (data.monthsCount || 1);
        await paymentsHook.processMensalidade(payload, student, totalDuration);
      } else {
        await paymentsHook.processPayment(payload);
      }

      toast.success("Pagamento registrado!");
    } catch (error) {
      toast.error("Erro ao registrar pagamento.");
      throw error;
    }
  };

  return {
    payments: paymentsHook.payments,
    installments: installmentsHook.installments,
    loading: paymentsHook.loading || installmentsHook.loading,
    receiveInstallment,
    registerPayment,
    updatePayment: paymentsHook.updatePayment,
    deletePayment: paymentsHook.deletePayment,
    deleteInstallment: installmentsHook.deleteInstallment,
    createInstallments: async (data: {
      studentId: string;
      productName: string;
      totalAmount: number;
      installmentsCount: number;
      startDate: Date;
      paymentMethod: string;
    }) => {
      try {
        const student = studentsHook.students.find(s => s.id === data.studentId);
        const installmentAmount = data.totalAmount / data.installmentsCount;
        const saleId = `manual_${Date.now()}`;

        for (let i = 1; i <= data.installmentsCount; i++) {
          const dueDate = new Date(data.startDate);
          dueDate.setMonth(dueDate.getMonth() + i - 1);

          await installmentsHook.addInstallment({
            studentId: data.studentId,
            studentName: student?.name || 'Visitante',
            productName: data.productName,
            amount: installmentAmount,
            installmentNumber: i,
            totalInstallments: data.installmentsCount,
            dueDate: Timestamp.fromDate(dueDate),
            status: 'pending',
            saleId: saleId,
            paymentMethod: data.paymentMethod
          } as any);
        }
        toast.success(`${data.installmentsCount} parcelas geradas com sucesso!`);
      } catch (error) {
        console.error("Error creating installments:", error);
        toast.error("Erro ao gerar parcelas.");
        throw error;
      }
    }
  };
};
