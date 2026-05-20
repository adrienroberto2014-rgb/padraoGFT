import { useState, useEffect, useMemo } from 'react';
import { FirestoreInstructorRepository } from '../../infrastructure/firebase/repositories/FirestoreInstructorRepository';
import { IInstructor } from '../ports/IInstructorRepository';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export const useInstructors = (enabled: boolean = true) => {
  const [instructors, setInstructors] = useState<IInstructor[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb, tenantId, user } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestoreInstructorRepository(tenantDb, tenantId) : null;
  }, [tenantDb, tenantId]);

  useEffect(() => {
    if (!enabled || !repository || !user) {
      setLoading(false);
      return;
    }
    const unsubscribe = repository.subscribe((data) => {
      setInstructors(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [repository, enabled]);

  const addInstructor = async (data: Omit<IInstructor, 'id'>) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      await repository.add(data);
      toast.success("Professor cadastrado com sucesso!");
    } catch (error) {
      toast.error("Erro ao cadastrar professor.");
      throw error;
    }
  };

  const updateInstructor = async (id: string, data: Partial<IInstructor>) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      await repository.update(id, data);
      toast.success("Professor atualizado com sucesso!");
    } catch (error) {
      toast.error("Erro ao atualizar professor.");
      throw error;
    }
  };

  const deleteInstructor = async (id: string) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      if (window.confirm("Deseja realmente excluir este professor?")) {
        await repository.delete(id);
        toast.success("Professor excluído com sucesso!");
      }
    } catch (error) {
      toast.error("Erro ao excluir professor.");
      throw error;
    }
  };

  return {
    instructors,
    loading,
    addInstructor,
    updateInstructor,
    deleteInstructor
  };
};
