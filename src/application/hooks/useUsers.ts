import { useState, useEffect, useMemo } from 'react';
import { FirestoreUserRepository } from '../../infrastructure/firebase/repositories/FirestoreUserRepository';
import { User, UserFilters } from '../../core/entities/User';
import { useAuth } from '../../contexts/AuthContext';

export const useUsers = (subscribe: boolean = true, filters?: UserFilters) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb, tenantId, user } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestoreUserRepository(tenantDb, tenantId) : null;
  }, [tenantDb, tenantId]);

  useEffect(() => {
    if (!repository || !subscribe || !user) {
      setLoading(false);
      return;
    }

    const unsubscribe = repository.subscribeUsers((data) => {
      setUsers(data);
      setLoading(false);
    }, filters);

    return () => unsubscribe();
  }, [repository, subscribe, JSON.stringify(filters)]);

  const updateUser = async (id: string, data: Partial<User>) => {
    if (!repository) throw new Error("Repository not initialized");
    await repository.updateUser(id, data);
  };

  const deleteUser = async (id: string) => {
    if (!repository) throw new Error("Repository not initialized");
    await repository.deleteUser(id);
  };

  const addUser = async (data: any) => {
    if (!repository) throw new Error("Repository not initialized");
    
    // If password provided, use server API
    if (data.password) {
      const token = await user?.getIdToken();
      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const err = await response.json();
        // If it's the Identity Toolkit error, suggest Google login pre-registration
        if (err.error?.includes('identitytoolkit.googleapis.com')) {
          console.warn("Auth API disabled. Falling back to Firestore-only creation for Google Login.");
          // We'll proceed to create just the Firestore doc if they want, 
          // but we should probably let the UI handle this choice.
          // For now, let's just throw but include a more helpful message.
          throw new Error(`${err.error}. Você ainda pode cadastrar o usuário para acesso via 'Entrar com Google' (sem senha inicial).`);
        }
        throw new Error(err.error || 'Failed to create user account');
      }
      
      return await response.json();
    }
    
    return await repository.addUser(data as any);
  };

  const updatePassword = async (uid: string, newPassword: string) => {
    const token = await user?.getIdToken();
    const response = await fetch('/api/admin/users/update-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ uid, newPassword })
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to update password');
    }
    
    return await response.json();
  };

  return { users, loading, updateUser, deleteUser, addUser, updatePassword };
};
