import { useState, useEffect, useMemo } from 'react';
import { FirestorePlanRepository } from '../../infrastructure/firebase/repositories/FirestorePlanRepository';
import { IPlan } from '../ports/IPlanRepository';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export const usePlans = (enabled: boolean = true) => {
  const [plans, setPlans] = useState<IPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb, tenantId, user } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestorePlanRepository(tenantDb, tenantId) : null;
  }, [tenantDb, tenantId]);

  useEffect(() => {
    if (!enabled || !repository || !user) {
      setLoading(false);
      return;
    }
    const unsubscribe = repository.subscribe((data) => {
      setPlans(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [repository, enabled]);

  const addPlan = async (data: Omit<IPlan, 'id'>) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      return await repository.add(data);
    } catch (error) {
      toast.error("Erro ao cadastrar plano.");
      throw error;
    }
  };

  const updatePlan = async (id: string, data: Partial<IPlan>) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      await repository.update(id, data);
    } catch (error) {
      toast.error("Erro ao atualizar plano.");
      throw error;
    }
  };

  const deletePlan = async (id: string) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      await repository.delete(id);
    } catch (error) {
      toast.error("Erro ao excluir plano.");
      throw error;
    }
  };

  return {
    plans,
    loading,
    addPlan,
    updatePlan,
    deletePlan
  };
};
