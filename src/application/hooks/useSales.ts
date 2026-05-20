import { useState, useEffect, useMemo } from 'react';
import { FirestoreSaleRepository } from '../../infrastructure/firebase/repositories/FirestoreSaleRepository';
import { ISale } from '../ports/ISaleRepository';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export const useSales = (enabled: boolean = true) => {
  const [sales, setSales] = useState<ISale[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb, tenantId, user } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestoreSaleRepository(tenantDb, tenantId) : null;
  }, [tenantDb, tenantId]);

  useEffect(() => {
    if (!enabled || !repository || !user) {
      setLoading(false);
      return;
    }
    const unsubscribe = repository.subscribe((data) => {
      setSales(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [repository, enabled]);

  const addSale = async (data: Omit<ISale, 'id'>) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      return await repository.add(data);
    } catch (error) {
      toast.error("Erro ao registrar venda.");
      throw error;
    }
  };

  const updateSale = async (id: string, data: Partial<ISale>) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      await repository.update(id, data);
    } catch (error) {
      toast.error("Erro ao atualizar venda.");
      throw error;
    }
  };

  const deleteSale = async (id: string) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      await repository.delete(id);
    } catch (error) {
      toast.error("Erro ao excluir venda.");
      throw error;
    }
  };

  return {
    sales,
    loading,
    addSale,
    updateSale,
    deleteSale
  };
};
