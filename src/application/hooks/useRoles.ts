import { useState, useEffect, useMemo } from 'react';
import { FirestoreRoleRepository } from '../../infrastructure/firebase/repositories/FirestoreRoleRepository';
import { Role } from '../../core/entities/Role';
import { useAuth } from '../../contexts/AuthContext';

export const useRoles = (subscribe: boolean = true) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb, tenantId, user } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestoreRoleRepository(tenantDb, tenantId) : null;
  }, [tenantDb, tenantId]);

  useEffect(() => {
    if (!repository || !user) return;

    if (!subscribe) {
      repository.getAllRoles().then(data => {
        setRoles(data);
        setLoading(false);
      });
      return;
    }

    const unsubscribe = repository.subscribeRoles((data) => {
      setRoles(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [repository, subscribe]);

  const addRole = async (data: Omit<Role, 'id'>) => {
    if (!repository) throw new Error("Repository not initialized");
    return await repository.addRole(data);
  };

  const updateRole = async (id: string, data: Partial<Role>) => {
    if (!repository) throw new Error("Repository not initialized");
    await repository.updateRole(id, data);
  };

  const deleteRole = async (id: string) => {
    if (!repository) throw new Error("Repository not initialized");
    await repository.deleteRole(id);
  };

  return { roles, loading, addRole, updateRole, deleteRole };
};
