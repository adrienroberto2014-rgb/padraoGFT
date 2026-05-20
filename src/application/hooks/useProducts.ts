import { useState, useEffect, useMemo } from 'react';
import { FirestoreProductRepository } from '../../infrastructure/firebase/repositories/FirestoreProductRepository';
import { IProduct } from '../ports/IProductRepository';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export const useProducts = (enabled: boolean = true) => {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb, tenantId, user } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestoreProductRepository(tenantDb, tenantId) : null;
  }, [tenantDb, tenantId]);

  useEffect(() => {
    if (!enabled || !repository || !user) {
      setLoading(false);
      return;
    }
    const unsubscribe = repository.subscribe((data) => {
      setProducts(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [repository, enabled]);

  const addProduct = async (data: Omit<IProduct, 'id'>) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      return await repository.add(data);
    } catch (error) {
      toast.error("Erro ao cadastrar produto.");
      throw error;
    }
  };

  const updateProduct = async (id: string, data: Partial<IProduct>) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      await repository.update(id, data);
    } catch (error) {
      toast.error("Erro ao atualizar produto.");
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    if (!repository) throw new Error("Repository not initialized");
    try {
      await repository.delete(id);
    } catch (error) {
      toast.error("Erro ao excluir produto.");
      throw error;
    }
  };

  return {
    products,
    loading,
    addProduct,
    updateProduct,
    deleteProduct
  };
};
