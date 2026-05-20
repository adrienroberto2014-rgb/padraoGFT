import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  doc, 
  getDoc,
  where,
  Timestamp
} from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../utils/errorHandlers';

export const useBelts = (enabled: boolean) => {
  const [belts, setBelts] = useState<any[]>([]);
  const { tenantDb, user } = useAuth();

  useEffect(() => {
    if (!enabled || !tenantDb || !user) return;
    const q = query(collection(tenantDb, 'belts'), orderBy('order'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setBelts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'belts');
    });
    return () => unsubscribe();
  }, [enabled, tenantDb]);
  return belts;
};

export const useStudents = (enabled: boolean, userEmail?: string | null, isAdmin?: boolean) => {
  const [students, setStudents] = useState<any[]>([]);
  const { tenantDb, user } = useAuth();

  useEffect(() => {
    if (!enabled || !tenantDb || !user) return;
    
    let q;
    if (isAdmin) {
      q = query(collection(tenantDb, 'students'), orderBy('name'));
    } else if (userEmail) {
      q = query(collection(tenantDb, 'students'), where('email', '==', userEmail));
    } else {
      return;
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'students');
    });
    return () => unsubscribe();
  }, [enabled, userEmail, isAdmin, tenantDb]);
  return students;
};

export const useClasses = (enabled: boolean) => {
  const [classes, setClasses] = useState<any[]>([]);
  const { tenantDb, user } = useAuth();

  useEffect(() => {
    if (!enabled || !tenantDb || !user) return;
    const q = query(collection(tenantDb, 'classes'), orderBy('startTime'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'classes');
    });
    return () => unsubscribe();
  }, [enabled, tenantDb]);
  return classes;
};

export const usePayments = (enabled: boolean, isAdmin?: boolean, studentIds?: string[]) => {
  const [payments, setPayments] = useState<any[]>([]);
  const { tenantDb, user } = useAuth();

  useEffect(() => {
    if (!enabled || !tenantDb || !user) return;
    
    let q;
    if (isAdmin) {
      q = query(collection(tenantDb, 'payments'), orderBy('date', 'desc'), limit(100));
    } else if (studentIds && studentIds.length > 0) {
      q = query(collection(tenantDb, 'payments'), where('studentId', 'in', studentIds), orderBy('date', 'desc'), limit(100));
    } else {
      return;
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      setPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'payments');
    });
    return () => unsubscribe();
  }, [enabled, isAdmin, studentIds, tenantDb]);
  return payments;
};

export const useInstructors = (enabled: boolean) => {
  const [instructors, setInstructors] = useState<any[]>([]);
  const { tenantDb, user } = useAuth();

  useEffect(() => {
    if (!enabled || !tenantDb || !user) return;
    const q = query(collection(tenantDb, 'instructors'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setInstructors(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching instructors collection:", error);
    });
    return () => unsubscribe();
  }, [enabled, tenantDb]);
  return instructors;
};

export const usePlans = (enabled: boolean) => {
  const [plans, setPlans] = useState<any[]>([]);
  const { tenantDb, user } = useAuth();

  useEffect(() => {
    if (!enabled || !tenantDb || !user) return;
    const q = query(collection(tenantDb, 'plans'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setPlans(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching plans collection:", error);
    });
    return () => unsubscribe();
  }, [enabled, tenantDb]);
  return plans;
};

export const useProducts = (enabled: boolean) => {
  const [products, setProducts] = useState<any[]>([]);
  const { tenantDb, user } = useAuth();

  useEffect(() => {
    if (!enabled || !tenantDb || !user) return;
    const q = query(collection(tenantDb, 'products'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching products collection:", error);
    });
    return () => unsubscribe();
  }, [enabled, tenantDb]);
  return products;
};

export const useSales = (enabled: boolean) => {
  const [sales, setSales] = useState<any[]>([]);
  const { tenantDb, user } = useAuth();

  useEffect(() => {
    if (!enabled || !tenantDb || !user) return;
    const q = query(collection(tenantDb, 'sales'), orderBy('date', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => {
      setSales(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching sales collection:", error);
    });
    return () => unsubscribe();
  }, [enabled, tenantDb]);
  return sales;
};

export const useUsers = (enabled: boolean) => {
  const [users, setUsers] = useState<any[]>([]);
  const { tenantDb, user } = useAuth();

  useEffect(() => {
    if (!enabled || !tenantDb || !user) return;
    const q = query(collection(tenantDb, 'users'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching users collection:", error);
    });
    return () => unsubscribe();
  }, [enabled, tenantDb]);
  return users;
};

export const useCheckIns = (enabled: boolean, isAdmin?: boolean, studentIds?: string[]) => {
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const { tenantDb, user } = useAuth();

  useEffect(() => {
    if (!enabled || !tenantDb || !user) return;
    
    let q;
    if (isAdmin) {
      q = query(collection(tenantDb, 'checkins'), orderBy('time', 'desc'), limit(1000));
    } else if (studentIds && studentIds.length > 0) {
      q = query(collection(tenantDb, 'checkins'), where('studentId', 'in', studentIds), orderBy('time', 'desc'), limit(200));
    } else {
      return;
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      setCheckIns(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'checkins');
    });
    return () => unsubscribe();
  }, [enabled, isAdmin, studentIds, tenantDb]);
  return checkIns;
};

export const useExpenses = (enabled: boolean) => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const { tenantDb, user } = useAuth();

  useEffect(() => {
    if (!enabled || !tenantDb || !user) return;
    const q = query(collection(tenantDb, 'expenses'), orderBy('date', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching expenses collection:", error);
    });
    return () => unsubscribe();
  }, [enabled, tenantDb]);
  return expenses;
};

export const useInstallments = (enabled: boolean) => {
  const [installments, setInstallments] = useState<any[]>([]);
  const { tenantDb, user } = useAuth();

  useEffect(() => {
    if (!enabled || !tenantDb || !user) return;
    const q = query(collection(tenantDb, 'installments'), orderBy('dueDate', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setInstallments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'installments');
    });
    return () => unsubscribe();
  }, [enabled, tenantDb]);
  return installments;
};

export const useEvaluations = (enabled: boolean, isAdmin?: boolean, studentIds?: string[]) => {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const { tenantDb, user } = useAuth();

  useEffect(() => {
    if (!enabled || !tenantDb || !user) return;
    
    let q;
    if (isAdmin) {
      q = query(collection(tenantDb, 'evaluations'), orderBy('date', 'desc'));
    } else if (studentIds && studentIds.length > 0) {
      q = query(collection(tenantDb, 'evaluations'), where('studentId', 'in', studentIds), orderBy('date', 'desc'));
    } else {
      return;
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      setEvaluations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'evaluations');
    });
    return () => unsubscribe();
  }, [enabled, isAdmin, studentIds, tenantDb]);
  return evaluations;
};

export const useGraduations = (enabled: boolean, isAdmin?: boolean, studentIds?: string[]) => {
  const [graduations, setGraduations] = useState<any[]>([]);
  const { tenantDb, user } = useAuth();

  useEffect(() => {
    if (!enabled || !tenantDb || !user) return;
    
    let q;
    if (isAdmin) {
      q = query(collection(tenantDb, 'graduations'), orderBy('date', 'desc'));
    } else if (studentIds && studentIds.length > 0) {
      q = query(collection(tenantDb, 'graduations'), where('studentId', 'in', studentIds), orderBy('date', 'desc'));
    } else {
      return;
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      setGraduations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'graduations');
    });
    return () => unsubscribe();
  }, [enabled, isAdmin, studentIds, tenantDb]);
  return graduations;
};

export const useRoles = (enabled: boolean) => {
  const [roles, setRoles] = useState<any[]>([]);
  const { tenantDb, user } = useAuth();

  useEffect(() => {
    if (!enabled || !tenantDb || !user) return;
    const q = query(collection(tenantDb, 'roles'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setRoles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'roles');
    });
    return () => unsubscribe();
  }, [enabled, tenantDb]);
  return roles;
};

export const useSettings = (enabled: boolean) => {
  const [settings, setSettings] = useState<any>({});
  const { tenantDb, user } = useAuth();

  useEffect(() => {
    if (!enabled || !tenantDb || !user) return;
    
    getDoc(doc(tenantDb, 'settings', 'global')).then(doc => {
      if (doc.exists()) setSettings(doc.data());
    }).catch(err => console.error("Initial settings fetch error:", err));

    const unsubscribe = onSnapshot(doc(tenantDb, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data());
      } else {
        setSettings({});
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
      setSettings({});
    });
    return () => unsubscribe();
  }, [enabled, tenantDb]);
  return settings;
};

export const usePrivateSettings = (isAdmin: boolean) => {
  const [secrets, setSecrets] = useState<any>({});
  const { user, tenantDb } = useAuth();

  useEffect(() => {
    if (!isAdmin || !user || !tenantDb) return;
    
    getDoc(doc(tenantDb, 'secret_settings', 'global')).then(doc => {
      if (doc.exists()) setSecrets(doc.data());
    }).catch(err => console.error("Initial secrets fetch error:", err));

    const unsubscribe = onSnapshot(doc(tenantDb, 'secret_settings', 'global'), (doc) => {
      if (doc.exists()) {
        setSecrets(doc.data());
      } else {
        setSecrets({});
      }
    }, (error) => {
      console.error("Error fetching secrets:", error);
      setSecrets({});
    });
    return () => unsubscribe();
  }, [isAdmin, tenantDb, user]);
  return secrets;
};

export const useBackups = (enabled: boolean) => {
  const [backups, setBackups] = useState<any[]>([]);
  const { tenantDb } = useAuth();

  useEffect(() => {
    if (!enabled || !tenantDb) return;
    const q = query(collection(tenantDb, 'backups'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snap) => {
      setBackups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'backups');
    });
    return () => unsubscribe();
  }, [enabled, tenantDb]);
  return backups;
};

export const useLicenses = (isSuperAdmin: boolean) => {
  const [licenses, setLicenses] = useState<any[]>([]);
  const { masterDb } = useAuth();

  useEffect(() => {
    if (!isSuperAdmin || !masterDb) return;
    const q = query(collection(masterDb, 'licenses'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setLicenses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'licenses');
    });
    return () => unsubscribe();
  }, [isSuperAdmin, masterDb]);
  return licenses;
};
