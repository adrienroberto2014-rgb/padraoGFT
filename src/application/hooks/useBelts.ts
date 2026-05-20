import { useState, useEffect, useMemo } from 'react';
import { Firestore, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export function useBelts() {
  const [belts, setBelts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb, tenantId, user } = useAuth();

  useEffect(() => {
    if (!tenantDb || !user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(tenantDb, 'belts'), 
      where('tenantId', '==', tenantId),
      orderBy('order', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBelts(data);
      setLoading(false);
    }, (error) => {
      console.error("Error subscribing to belts:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tenantDb, tenantId]);

  const saveBelt = async (id: string | null, data: any) => {
    if (!tenantDb) return;
    try {
      const beltData = {
        ...data,
        tenantId,
        updatedAt: serverTimestamp()
      };
      
      if (id) {
        await updateDoc(doc(tenantDb, 'belts', id), beltData);
        toast.success("Faixa atualizada!");
      } else {
        await addDoc(collection(tenantDb, 'belts'), {
          ...beltData,
          createdAt: serverTimestamp()
        });
        toast.success("Faixa criada!");
      }
    } catch (error) {
      toast.error("Erro ao salvar faixa.");
      throw error;
    }
  };

  const deleteBelt = async (id: string) => {
    if (!tenantDb) return;
    try {
      await deleteDoc(doc(tenantDb, 'belts', id));
      toast.success("Faixa excluída!");
    } catch (error) {
      toast.error("Erro ao excluir faixa.");
      throw error;
    }
  };

  return { belts, loading, saveBelt, deleteBelt };
}
