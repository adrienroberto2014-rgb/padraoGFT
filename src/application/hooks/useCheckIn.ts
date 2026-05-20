import { useState, useEffect, useMemo } from 'react';
import { CheckIn, CheckInFilters } from '../../core/entities/CheckIn';
import { FirestoreCheckInRepository } from '../../infrastructure/firebase/repositories/FirestoreCheckInRepository';
import { useAuth } from '../../contexts/AuthContext';
import { CheckInService } from '../services/CheckInService';

export function useCheckIn(enabled: boolean, isAdmin?: boolean, studentIds?: string[]) {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantDb, tenantId, user } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestoreCheckInRepository(tenantDb, tenantId) : null;
  }, [tenantDb, tenantId]);

  const service = useMemo(() => {
    return (repository && tenantDb) ? new CheckInService(repository, tenantDb) : null;
  }, [repository, tenantDb]);

  useEffect(() => {
    if (!enabled || !repository || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const filters: CheckInFilters = {
      limit: 500
    };

    if (isAdmin) {
      // Fetch all for admin
    } else if (studentIds && studentIds.length > 0) {
      filters.studentIds = studentIds;
    } else {
      // Not admin and no student IDs - don't fetch anything
      setCheckIns([]);
      setLoading(false);
      return;
    }
    
    const unsubscribe = repository.subscribe((data) => {
      setCheckIns(data);
      setLoading(false);
    }, filters);

    return () => unsubscribe();
  }, [enabled, repository, isAdmin, studentIds]);

  const registerCheckIn = async (checkIn: Partial<CheckIn>, classData: any) => {
    if (!service) throw new Error("Service not initialized");
    return await service.registerCheckIn(checkIn, classData);
  };

  return { checkIns, loading, registerCheckIn };
}
