import { useState, useEffect, useMemo } from 'react';
import { ISettings } from '../ports/ISettingsRepository';
import { FirestoreSettingsRepository } from '../../infrastructure/firebase/repositories/FirestoreSettingsRepository';
import { useAuth } from '../../contexts/AuthContext';
import { serverTimestamp } from 'firebase/firestore';

export function useSettings() {
  const [settings, setSettings] = useState<ISettings | null>(null);
  const [secrets, setSecrets] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { tenantDb, isAdmin, tenantId, user } = useAuth();

  const repository = useMemo(() => {
    return tenantDb ? new FirestoreSettingsRepository(tenantDb, tenantId) : null;
  }, [tenantDb, tenantId]);

  useEffect(() => {
    if (!repository || !user) {
      setLoading(false);
      return;
    }

    const unsubSettings = repository.subscribeGlobalSettings((data) => {
      setSettings(data);
      if (!isAdmin) setLoading(false);
    });

    let unsubSecrets: (() => void) | undefined;
    if (isAdmin) {
      unsubSecrets = repository.subscribeSecretSettings((data) => {
        setSecrets(data);
        setLoading(false);
      });
    }

    return () => {
      unsubSettings();
      if (unsubSecrets) unsubSecrets();
    };
  }, [repository, isAdmin]);

  const updateSettings = async (data: Partial<ISettings>) => {
    if (!repository) throw new Error("Repository not initialized");
    await repository.updateGlobalSettings({ ...data, updatedAt: serverTimestamp() });
  };

  const updateSecrets = async (data: any) => {
    if (!repository) throw new Error("Repository not initialized");
    await repository.updateSecretSettings({ ...data, updatedAt: serverTimestamp() });
  };

  return { settings, secrets, loading, updateSettings, updateSecrets };
}
