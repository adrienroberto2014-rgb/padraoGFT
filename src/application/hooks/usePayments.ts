import { useState, useEffect, useMemo } from 'react';
import { Payment, PaymentFilters } from '../../core/entities/Payment';
import { FirestorePaymentRepository } from '../../infrastructure/firebase/repositories/FirestorePaymentRepository';
import { useAuth } from '../../contexts/AuthContext';
import { PaymentService } from '../services/PaymentService';
import toast from 'react-hot-toast';

export function usePayments(enabled: boolean, isAdmin?: boolean, studentIds?: string[]) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb, tenantId, user } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestorePaymentRepository(tenantDb, tenantId) : null;
  }, [tenantDb, tenantId]);

  const service = useMemo(() => {
    return (repository && tenantDb) ? new PaymentService(repository, tenantDb) : null;
  }, [repository, tenantDb]);

  useEffect(() => {
    if (!enabled || !repository || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const filters: PaymentFilters = {
      limit: 100
    };

    if (isAdmin) {
      // Fetch all for admin
    } else if (studentIds && studentIds.length > 0) {
      filters.studentIds = studentIds;
    } else {
      // Not admin and no student IDs - don't fetch anything
      setPayments([]);
      setLoading(false);
      return;
    }
    
    const unsubscribe = repository.subscribe((data) => {
      setPayments(data);
      setLoading(false);
    }, filters);

    return () => unsubscribe();
  }, [enabled, repository, isAdmin, studentIds]);

  const processPayment = async (payment: Partial<Payment>) => {
    if (!service) throw new Error("Service not initialized");
    return await service.processPayment(payment);
  };

  const processMensalidade = async (paymentData: any, student: any, duration: number) => {
    if (!service) throw new Error("Service not initialized");
    return await service.processMensalidade(paymentData, student, duration);
  };

  const updatePayment = async (id: string, data: Partial<Payment>) => {
    try {
      if (!repository) throw new Error("Repository not initialized");
      await repository.save({ ...data, id } as any);
    } catch (error) {
      toast.error("Erro ao atualizar pagamento.");
      throw error;
    }
  };

  const deletePayment = async (id: string) => {
    try {
      if (!repository) throw new Error("Repository not initialized");
      await repository.delete(id);
    } catch (error) {
      toast.error("Erro ao excluir pagamento.");
      throw error;
    }
  };

  return { payments, loading, processPayment, processMensalidade, updatePayment, deletePayment };
}
