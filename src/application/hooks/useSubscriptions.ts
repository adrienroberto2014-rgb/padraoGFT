import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Subscription } from '../../core/entities/Subscription';
import { FirestoreSubscriptionRepository } from '../../infrastructure/firebase/repositories/FirestoreSubscriptionRepository';

export function useSubscriptions(enabled: boolean) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb, tenantId, user } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestoreSubscriptionRepository(tenantDb, tenantId) : null;
  }, [tenantDb, tenantId]);

  useEffect(() => {
    if (!enabled || !repository || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = repository.subscribe((data) => {
      setSubscriptions(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [enabled, repository]);

  const addSubscription = async (data: Omit<Subscription, 'id'>) => {
    if (!repository) throw new Error("Repository not initialized");
    return await repository.create(data);
  };

  const updateSubscription = async (id: string, data: Partial<Subscription>) => {
    if (!repository) throw new Error("Repository not initialized");
    return await repository.update(id, data);
  };

  const deleteSubscription = async (id: string) => {
    if (!repository) throw new Error("Repository not initialized");
    return await repository.delete(id);
  };

  return { subscriptions, loading, addSubscription, updateSubscription, deleteSubscription };
}
