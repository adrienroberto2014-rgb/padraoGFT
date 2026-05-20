import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Invoice } from '../../core/entities/Invoice';
import { FirestoreInvoiceRepository } from '../../infrastructure/firebase/repositories/FirestoreInvoiceRepository';

export function useInvoices(enabled: boolean) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb, tenantId, user } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestoreInvoiceRepository(tenantDb, tenantId) : null;
  }, [tenantDb, tenantId]);

  useEffect(() => {
    if (!enabled || !repository || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = repository.subscribe((data) => {
      setInvoices(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [enabled, repository]);

  const addInvoice = async (data: Omit<Invoice, 'id'>) => {
    if (!repository) throw new Error("Repository not initialized");
    return await repository.create(data);
  };

  const updateInvoice = async (id: string, data: Partial<Invoice>) => {
    if (!repository) throw new Error("Repository not initialized");
    return await repository.update(id, data);
  };

  const deleteInvoice = async (id: string) => {
    if (!repository) throw new Error("Repository not initialized");
    return await repository.delete(id);
  };

  return { invoices, loading, addInvoice, updateInvoice, deleteInvoice };
}
