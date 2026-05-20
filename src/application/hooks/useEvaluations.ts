import { useState, useEffect, useMemo } from 'react';
import { FirestoreEvaluationRepository } from '../../infrastructure/firebase/repositories/FirestoreEvaluationRepository';
import { useAuth } from '../../contexts/AuthContext';
import { where, QueryConstraint } from 'firebase/firestore';

export const useEvaluations = (enabled: boolean = true, isAdmin?: boolean, studentIds?: string[]) => {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb, user, tenantId } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestoreEvaluationRepository(tenantDb, tenantId) : null;
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
      setEvaluations([]);
      setLoading(false);
      return;
    }

    const unsubscribe = repository.subscribeWithConstraints((data) => {
      setEvaluations(data);
      setLoading(false);
    }, ...constraints);

    return () => unsubscribe();
  }, [repository, enabled, isAdmin, JSON.stringify(studentIds)]);

  return {
    evaluations,
    loading
  };
};
