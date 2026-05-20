import { useState, useEffect } from 'react';
import { FirestoreLicensesRepository } from '../../infrastructure/firebase/repositories/FirestoreLicensesRepository';
import toast from 'react-hot-toast';

const repository = new FirestoreLicensesRepository();

export const useLicenses = () => {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const subscription = repository.subscribeLicenses().subscribe({
      next: (data) => {
        setLicenses(data);
        setLoading(false);
      },
      error: (err) => {
        console.error("Error subscribing to licenses:", err);
        setError(err.message);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const saveLicense = async (id: string, data: any) => {
    try {
      await repository.saveLicense(id, data);
    } catch (err: any) {
      toast.error("Erro ao salvar licença.");
      throw err;
    }
  };

  const deleteLicense = async (id: string) => {
    try {
      await repository.deleteLicense(id);
      toast.success("Licença excluída.");
    } catch (err: any) {
      toast.error("Erro ao excluir licença.");
      throw err;
    }
  };

  const updateLicenseStatus = async (id: string, status: string) => {
    try {
      await repository.saveLicense(id, { status });
    } catch (err: any) {
      toast.error("Erro ao atualizar status.");
      throw err;
    }
  };

  const updateFirebaseConfig = async (id: string, config: any) => {
    try {
      await repository.saveLicense(id, { externalFirebaseConfig: config });
    } catch (err: any) {
      toast.error("Erro ao salvar configuração.");
      throw err;
    }
  };

  return {
    licenses,
    loading,
    error,
    saveLicense,
    deleteLicense,
    updateLicenseStatus,
    updateFirebaseConfig
  };
};
