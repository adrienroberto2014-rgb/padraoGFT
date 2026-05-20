import { useState, useEffect, useMemo } from 'react';
import { FirestoreClassRepository } from '../../infrastructure/firebase/repositories/FirestoreClassRepository';
import { IClass } from '../ports/IClassRepository';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export const useClasses = (enabled: boolean = true) => {
  const [classes, setClasses] = useState<IClass[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb, tenantId, user } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestoreClassRepository(tenantDb, tenantId) : null;
  }, [tenantDb, tenantId]);

  useEffect(() => {
    if (!enabled || !repository || !user) {
      setLoading(false);
      return;
    }
    const unsubscribe = repository.subscribe((data) => {
      setClasses(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [repository, enabled]);

  const addClass = async (data: Omit<IClass, 'id'>) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      return await repository.add(data);
    } catch (error) {
      toast.error("Erro ao cadastrar aula.");
      throw error;
    }
  };

  const addBulkClasses = async (classes: Omit<IClass, 'id'>[]) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      await repository.addBulk(classes);
    } catch (error) {
      toast.error("Erro ao cadastrar aulas.");
      throw error;
    }
  };

  const updateClass = async (id: string, data: Partial<IClass>) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      await repository.update(id, data);
    } catch (error) {
      toast.error("Erro ao atualizar aula.");
      throw error;
    }
  };

  const updateBulkClasses = async (updates: { id: string, data: Partial<IClass> }[]) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      await repository.updateBulk(updates);
    } catch (error) {
      toast.error("Erro ao atualizar aulas.");
      throw error;
    }
  };

  const deleteClass = async (id: string) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      await repository.delete(id);
    } catch (error) {
      toast.error("Erro ao excluir aula.");
      throw error;
    }
  };

  const deleteBulkClasses = async (ids: string[]) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      await repository.deleteBulk(ids);
    } catch (error) {
      toast.error("Erro ao excluir aulas.");
      throw error;
    }
  };

  const saveClass = async (
    data: any, 
    editingClass?: any, 
    scope: 'single' | 'all' = 'single'
  ) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      if (editingClass) {
        if (scope === 'all' && editingClass.recurrenceId) {
          const relatedClasses = classes.filter(c => c.recurrenceId === editingClass.recurrenceId);
          const updates = relatedClasses.map(cls => ({
            id: cls.id,
            data
          }));
          await repository.updateBulk(updates);
        } else {
          await repository.update(editingClass.id, data);
        }
      } else {
        const recurrenceId = data.recurrenceId || Math.random().toString(36).substring(7);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dayToNumber: { [key: string]: number } = {
          'Domingo': 0, 'Segunda': 1, 'Terça': 2, 'Quarta': 3, 'Quinta': 4, 'Sexta': 5, 'Sábado': 6
        };

        const classesToCreate: any[] = [];
        const daysOfWeek = Array.isArray(data.daysOfWeek) ? data.daysOfWeek : [data.dayOfWeek].filter(Boolean);

        for (const dayName of daysOfWeek) {
          const targetDay = dayToNumber[dayName];
          const currentDay = today.getDay();
          let daysUntilFirst = targetDay - currentDay;
          if (daysUntilFirst < 0) daysUntilFirst += 7; // Ensure it's in the future or today
          
          const firstOccurrence = new Date(today);
          firstOccurrence.setDate(today.getDate() + daysUntilFirst);

          const baseClassData = {
            ...data,
            dayOfWeek: dayName,
            recurrenceId
          };
          // Remove daysOfWeek from individual instances
          delete baseClassData.daysOfWeek;

          if (data.isRecurring) {
            for (let i = 0; i < (data.recurrenceWeeks || 4); i++) {
              const instanceDate = new Date(firstOccurrence);
              instanceDate.setDate(firstOccurrence.getDate() + i * 7);
              classesToCreate.push({
                ...baseClassData,
                date: instanceDate,
                weekOffset: i,
                instanceId: `${recurrenceId}-${dayName}-${i}`
              });
            }
          } else {
            classesToCreate.push({
              ...baseClassData,
              date: firstOccurrence,
              instanceId: `${recurrenceId}-${dayName}-0`
            });
          }
        }
        
        await repository.addBulk(classesToCreate);
      }
      toast.success("Aula salva com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar aula.");
      throw error;
    }
  };

  const deleteClassByScope = async (
    targetClass: any, 
    scope: 'single' | 'all' = 'single'
  ) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      if (scope === 'all' && targetClass.recurrenceId) {
        const relatedClasses = classes.filter(c => c.recurrenceId === targetClass.recurrenceId);
        const idsToDelete = relatedClasses.map(c => c.id);
        await repository.deleteBulk(idsToDelete);
      } else {
        await repository.delete(targetClass.id);
      }
      toast.success("Aula(s) excluída(s) com sucesso!");
    } catch (error) {
      toast.error("Erro ao excluir aula(s).");
      throw error;
    }
  };

  return {
    classes,
    loading,
    addClass,
    addBulkClasses,
    updateClass,
    updateBulkClasses,
    deleteClass,
    deleteBulkClasses,
    saveClass,
    deleteClassByScope
  };
};
