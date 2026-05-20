import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export function useBackups() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb, isAdmin } = useAuth();

  useEffect(() => {
    if (!tenantDb || !isAdmin) {
      setLoading(false);
      return;
    }

    const q = query(collection(tenantDb, 'backups'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBackups(data);
      setLoading(false);
    }, (error) => {
      console.warn("Backups subscripton permission denied or failed:", error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tenantDb, isAdmin]);

  const saveBackup = async (backup: any) => {
    if (!tenantDb) return;
    try {
      await addDoc(collection(tenantDb, 'backups'), {
        ...backup,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error saving backup:", error);
      throw error;
    }
  };

  return { backups, loading, saveBackup };
}
