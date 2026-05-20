import { useState, useEffect, useMemo } from 'react';
import { FirestoreInstallmentRepository } from '../../infrastructure/firebase/repositories/FirestoreInstallmentRepository';
import { IInstallment } from '../ports/IInstallmentRepository';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export const useInstallments = (enabled: boolean = true) => {
  const [installments, setInstallments] = useState<IInstallment[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb, tenantId, user } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestoreInstallmentRepository(tenantDb, tenantId) : null;
  }, [tenantDb, tenantId]);

  useEffect(() => {
    if (!enabled || !repository || !user) {
      setLoading(false);
      return;
    }
    const unsubscribe = repository.subscribe((data) => {
      setInstallments(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [repository, enabled]);

  const updateInstallment = async (id: string, data: Partial<IInstallment>) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      await repository.update(id, data);
    } catch (error) {
      toast.error("Erro ao atualizar parcela.");
      throw error;
    }
  };

  const addInstallment = async (data: Omit<IInstallment, 'id'>) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      return await repository.save(data as any);
    } catch (error) {
      toast.error("Erro ao cadastrar parcela.");
      throw error;
    }
  };

  const deleteInstallment = async (id: string) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      await repository.delete(id);
    } catch (error) {
      toast.error("Erro ao excluir parcela.");
      throw error;
    }
  };

  return {
    installments,
    loading,
    addInstallment,
    updateInstallment,
    deleteInstallment
  };
};
