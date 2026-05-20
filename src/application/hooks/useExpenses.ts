import { useState, useEffect, useMemo } from 'react';
import { FirestoreExpenseRepository } from '../../infrastructure/firebase/repositories/FirestoreExpenseRepository';
import { IExpense } from '../ports/IExpenseRepository';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export const useExpenses = (enabled: boolean = true) => {
  const [expenses, setExpenses] = useState<IExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb, tenantId, user } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestoreExpenseRepository(tenantDb, tenantId) : null;
  }, [tenantDb, tenantId]);

  useEffect(() => {
    if (!enabled || !repository || !user) {
      setLoading(false);
      return;
    }
    const unsubscribe = repository.subscribe((data) => {
      setExpenses(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [repository, enabled]);

  const addExpense = async (data: Omit<IExpense, 'id'>) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      return await repository.add(data);
    } catch (error) {
      toast.error("Erro ao cadastrar despesa.");
      throw error;
    }
  };

  const updateExpense = async (id: string, data: Partial<IExpense>) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      await repository.update(id, data);
    } catch (error) {
      toast.error("Erro ao atualizar despesa.");
      throw error;
    }
  };

  const deleteExpense = async (id: string) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      await repository.delete(id);
    } catch (error) {
      toast.error("Erro ao excluir despesa.");
      throw error;
    }
  };

  return {
    expenses,
    loading,
    addExpense,
    updateExpense,
    deleteExpense
  };
};
