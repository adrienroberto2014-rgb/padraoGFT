import { useState, useEffect, useMemo } from 'react';
import { Student, StudentFilters } from '../../core/entities/Student';
import { Graduation } from '../../core/entities/Graduation';
import { Evaluation } from '../../core/entities/Evaluation';
import { FirestoreStudentRepository } from '../../infrastructure/firebase/repositories/FirestoreStudentRepository';
import { FirestoreGraduationRepository } from '../../infrastructure/firebase/repositories/FirestoreGraduationRepository';
import { FirestoreEvaluationRepository } from '../../infrastructure/firebase/repositories/FirestoreEvaluationRepository';
import { useAuth } from '../../contexts/AuthContext';

export function useStudents(enabled: boolean, isAdmin?: boolean, userEmail?: string | null, studentId?: string | null) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb, tenantId, user, isAdmin: isUserAdmin, isSuperAdmin, isCheckInTablet } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestoreStudentRepository(tenantDb, tenantId) : null;
  }, [tenantDb, tenantId]);

  const gradRepository = useMemo(() => {
    return tenantDb ? new FirestoreGraduationRepository(tenantDb, tenantId) : null;
  }, [tenantDb, tenantId]);

  const evalRepository = useMemo(() => {
    return tenantDb ? new FirestoreEvaluationRepository(tenantDb, tenantId) : null;
  }, [tenantDb, tenantId]);

  useEffect(() => {
    if (!enabled || !repository || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const effectiveIsAdmin = isAdmin !== undefined ? isAdmin : (isUserAdmin || isSuperAdmin || isCheckInTablet);
    const filters: StudentFilters = {};
    
    if (!effectiveIsAdmin) {
      const email = userEmail || user.email;
      if (email) {
        filters.email = email;
      } else if (!studentId) {
        setStudents([]);
        setLoading(false);
        return;
      }
    }

    const unsubscribe = repository.subscribeStudents((data) => {
      // If we have a studentId, ensure it's included even if email doesn't match
      // Note: Repository filter is simple, usually we might need to combine locally
      // if the backend subscription doesn't support multiple filters easily.
      // For now, if studentId is provided but not in data, we might need another fetch.
      setStudents(data);
      setLoading(false);
    }, filters);

    return () => unsubscribe();
  }, [enabled, repository, isAdmin, userEmail, studentId]);

  const addStudent = async (student: Partial<Student>) => {
    if (!repository) throw new Error("Repository not initialized");
    return await repository.save(student);
  };

  const updateStudent = async (id: string, data: Partial<Student>) => {
    if (!repository) throw new Error("Repository not initialized");
    return await repository.save({ ...data, id });
  };

  const deleteStudent = async (id: string) => {
    if (!repository) throw new Error("Repository not initialized");
    await repository.delete(id);
  };

  const addGraduation = async (graduation: Partial<Graduation>) => {
    if (!gradRepository) throw new Error("Graduation repository not initialized");
    return await gradRepository.save(graduation);
  };

  const deleteGraduation = async (id: string) => {
    if (!gradRepository) throw new Error("Graduation repository not initialized");
    await gradRepository.delete(id);
  };

  const addEvaluation = async (evaluation: Partial<Evaluation>) => {
    if (!evalRepository) throw new Error("Evaluation repository not initialized");
    return await evalRepository.save(evaluation);
  };

  const deleteEvaluation = async (id: string) => {
    if (!evalRepository) throw new Error("Evaluation repository not initialized");
    await evalRepository.delete(id);
  };

  const graduateStudent = async (studentId: string, graduationData: Partial<Graduation>) => {
    if (!repository || !gradRepository) throw new Error("Repositories not initialized");
    try {
      await gradRepository.save({
        ...graduationData,
        studentId,
        date: graduationData.date || new Date().toISOString()
      });

      await repository.save({
        id: studentId,
        belt: graduationData.belt,
        stripes: graduationData.stripes
      });
    } catch (error) {
      throw error;
    }
  };

  const registerStudent = async (formData: any) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      const initialPaymentDate = formData.startDate ? new Date(formData.startDate) : new Date();
      // To make payment status 'pending' upon creation, nextPaymentDate should be the start date
      const nextPaymentDate = new Date(initialPaymentDate);

      const studentData = {
        ...formData,
        lastPaymentDate: initialPaymentDate,
        nextPaymentDate: nextPaymentDate,
        status: formData.status || 'Active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return await repository.save(studentData);
    } catch (error) {
      throw error;
    }
  };

  return { 
    students, 
    loading, 
    addStudent, 
    registerStudent,
    updateStudent, 
    deleteStudent,
    graduateStudent,
    addGraduation,
    deleteGraduation,
    addEvaluation,
    deleteEvaluation
  };
}
