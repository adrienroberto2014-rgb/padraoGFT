import { useState, useEffect, useMemo } from 'react';
import { FirestoreGraduationRepository } from '../../infrastructure/firebase/repositories/FirestoreGraduationRepository';
import { useAuth } from '../../contexts/AuthContext';
import { where, QueryConstraint } from 'firebase/firestore';

export const useGraduations = (enabled: boolean = true, isAdmin?: boolean, studentIds?: string[]) => {
  const [graduations, setGraduations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb, user, tenantId } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestoreGraduationRepository(tenantDb, tenantId) : null;
  }, [tenantDb, tenantId]);

  useEffect(() => {
    if (!enabled || !repository || !user) {
      setLoading(false);
      return;
    }

    const constraints: QueryConstraint[] = [];
    if (!isAdmin && Array.isArray(studentIds) && studentIds.length > 0) {
      constraints.push(where('studentId', 'in', studentIds));
    } else if (!isAdmin) {
      setGraduations([]);
      setLoading(false);
      return;
    }

    const unsubscribe = repository.subscribeWithConstraints((data) => {
      setGraduations(data);
      setLoading(false);
    }, ...constraints);

    return () => unsubscribe();
  }, [repository, enabled, isAdmin, JSON.stringify(studentIds)]);

  return {
    graduations,
    loading
  };
};
