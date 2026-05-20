import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User, Auth, GoogleAuthProvider, linkWithPopup, unlink, EmailAuthProvider, sendPasswordResetEmail, updatePassword } from 'firebase/auth';
import { auth as masterAuth, db as masterDb, createTenantInstance, logout as firebaseLogout, loginWithEmail as firebaseLoginWithEmail, registerWithEmail as firebaseRegisterWithEmail, googleProvider } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, onSnapshot, collection, query, where, Firestore } from 'firebase/firestore';
import { seedTenantData } from '../infrastructure/firebase/seed';
import { handleFirestoreError, OperationType } from '../utils/errorHandlers';

export type UserRole = 'admin' | 'tenant_admin' | 'receptionist' | 'professor' | 'user' | 'checkin_tablet' | string;

export interface UserPermissions {
  dashboard: boolean;
  students: boolean;
  finance: boolean;
  inventory: boolean;
  classes: boolean;
  settings: boolean;
  users: boolean;
  checkin: boolean;
  reports: boolean;
  [key: string]: boolean;
}

const DEFAULT_PERMISSIONS: Record<string, UserPermissions> = {
  admin: {
    dashboard: true, students: true, finance: true, inventory: true, classes: true, settings: true, users: true, checkin: true, reports: true
  },
  tenant_admin: {
    dashboard: true, students: true, finance: true, inventory: true, classes: true, settings: true, users: true, checkin: true, reports: true
  },
  receptionist: {
    dashboard: true, students: true, finance: true, inventory: true, classes: true, settings: false, users: false, checkin: true, reports: true
  },
  professor: {
    dashboard: true, students: true, finance: false, inventory: false, classes: true, settings: false, users: false, checkin: true, reports: false
  },
  user: {
    dashboard: false, students: false, finance: false, inventory: false, classes: false, settings: false, users: false, checkin: false, reports: false
  },
  checkin_tablet: {
    dashboard: false, students: false, finance: false, inventory: false, classes: false, settings: false, users: false, checkin: true, reports: false
  }
};

export interface Tenant {
  id: string;
  name: string;
  plan: string;
  status: 'active' | 'inactive' | 'pending';
  slug: string;
  config?: any;
}

interface AuthContextType {
  user: User | null; // Auth object
  currentUser: any | null; // Database user profile
  currentTenant: Tenant | null;
  loading: boolean;
  role: UserRole;
  permissions: UserPermissions;
  isApproved: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isReceptionist: boolean;
  isProfessor: boolean;
  isCheckInTablet: boolean;
  licenseStatus: 'active' | 'blocked' | 'pending' | 'none';
  gymInfo: {
    name: string;
    slug: string;
    isExternal: boolean;
    config?: any;
  } | null;
  tenantDb: Firestore;
  masterDb: Firestore;
  tenantId: string;
  logout: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  linkGoogle: () => Promise<void>;
  unlinkGoogle: () => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  updateMyPassword: (newPass: string) => Promise<void>;
  syncGymStats: (stats: { studentCount: number }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  currentUser: null,
  currentTenant: null,
  loading: true, 
  role: 'user',
  permissions: DEFAULT_PERMISSIONS.user,
  isApproved: false,
  isAdmin: false,
  isSuperAdmin: false,
  isReceptionist: false,
  isProfessor: false,
  isCheckInTablet: false,
  licenseStatus: 'none',
  gymInfo: null,
  tenantDb: masterDb,
  masterDb: masterDb,
  tenantId: 'default_gym',
  logout: async () => {},
  loginWithEmail: async () => {},
  linkGoogle: async () => {},
  unlinkGoogle: async () => {},
  sendResetEmail: async () => {},
  updateMyPassword: async () => {},
  syncGymStats: async () => {}
});

const SUPER_ADMIN_EMAILS = [
  "rodrigues.ueslei@gmail.com",
  "rodrigues.ueslei02@gmail.com",
  "ueslei.rodrigues@gmail.com",
  "adrienroberto2014@gmail.com",
  "balcaogfteamlimeira@gmail.com"
];

const CHECKIN_TABLET_EMAILS = [
  "balcaogfteamlimeira@gmail.com"
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>('user');
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS.user);
  const [isApproved, setIsApproved] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState<'active' | 'blocked' | 'pending' | 'none'>('none');
  const [gymInfo, setGymInfo] = useState<{ name: string; slug: string; isExternal: boolean; config?: any; } | null>(null);
  const [licenseLoading, setLicenseLoading] = useState(false);
  const unsubRoleDocRef = React.useRef<(() => void) | null>(null);
  const unsubLicenseDocRef = React.useRef<(() => void) | null>(null);
  const unsubGymSlugRef = React.useRef<(() => void) | null>(null);

  const [gymSlug, setGymSlug] = useState<string | null>(null);
  const [hasSeeded, setHasSeeded] = useState(false);

  const isSuperAdmin = useMemo(() => 
    !!user?.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase()),
  [user?.email]);

  // Seed initial tenant data on mount - ONLY FOR SUPER ADMIN
  useEffect(() => {
    if (isSuperAdmin && !hasSeeded) {
      seedTenantData(masterDb).then(() => setHasSeeded(true))
        .catch(err => console.error("Error seeding tenant data:", err));
    }
  }, [hasSeeded, isSuperAdmin]);

  // Parse gym slug from URL on init
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('gym');
    if (slug) setGymSlug(slug);
  }, []);

  // Fetch Gym Info based on slug or user license
  useEffect(() => {
    let unsub: (() => void) | null = null;
    console.log("AuthContext: Fetching Gym Info. slug:", gymSlug, "user:", user?.email);

    const loadBySlug = async (slug: string) => {
      console.log("AuthContext: Loading by slug:", slug);
      const q = query(collection(masterDb, 'licenses'), where('slug', '==', slug));
      unsub = onSnapshot(q, (snapshot) => {
        console.log("AuthContext: Slug snapshot received. Empty?", snapshot.empty);
        if (!snapshot.empty) {
          const license = snapshot.docs[0].data();
          setGymInfo({
            name: license.academyName || 'Academia',
            slug: license.slug,
            isExternal: true,
            config: license.externalFirebaseConfig
          });
          setLicenseStatus('active');
        } else {
          setGymInfo(null);
          setLicenseStatus('none');
        }
        setLicenseLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'licenses');
        setLicenseLoading(false);
      });
    };

    if (gymSlug) {
      setLicenseLoading(true);
      loadBySlug(gymSlug);
    } else if (user && !SUPER_ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
      setLicenseLoading(true);
      const licenseId = user.email!.toLowerCase().trim();
      console.log("AuthContext: User is not super admin, checking license for:", licenseId);
      unsub = onSnapshot(doc(masterDb, 'licenses', licenseId), (docSnap) => {
        console.log("AuthContext: License snapshot received. Exists?", docSnap.exists());
        if (docSnap.exists()) {
          const license = docSnap.data();
          setGymInfo({
            name: license.academyName || 'Academia',
            slug: license.slug || 'setup',
            isExternal: true,
            config: license.externalFirebaseConfig
          });
          setLicenseStatus(license.status || 'active');
        } else {
          setGymInfo(null);
          setLicenseStatus('none');
        }
        setLicenseLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, `licenses/${licenseId}`);
        setLicenseLoading(false);
      });
    } else {
      console.log("AuthContext: No slug and user is super admin or null. clearing gym info.");
      setLicenseLoading(false);
      setGymInfo(null);
      setLicenseStatus('none');
    }

    return () => {
      if (unsub) unsub();
    };
  }, [gymSlug, user]);

  // Dynamic Tenant Instances
  const tenantInstances = useMemo(() => {
    try {
      // Use specific fields for stability
      const configKey = gymInfo?.config?.apiKey;
      const configId = gymInfo?.config?.projectId;
      
      if (configKey && configId) {
        return createTenantInstance(gymInfo.config);
      }
    } catch (err) {
      console.error("Critical Tenant Init Error:", err);
    }
    return { auth: masterAuth, db: masterDb };
  }, [gymInfo?.config?.apiKey, gymInfo?.config?.projectId]); // Stable dependencies

  const tenantDb = tenantInstances.db;

  const tenantId = useMemo(() => {
    if (currentUser?.tenantId) return currentUser.tenantId;
    return gymInfo?.slug || 'default_gym';
  }, [gymInfo?.slug, currentUser?.tenantId]);

  // Failsafe to ensure app doesn't stay stuck on "Autenticando"
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn("AuthContext: Failsafe triggered. Forcing loading=false");
        setLoading(false);
      }
    }, 10000); // 10 seconds max
    return () => clearTimeout(timer);
  }, [loading]);

  // Helper to fetch and set permissions based on role
  const updatePermissions = async (roleName: string, cleanupRef: { current: (() => void) | null }) => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    cleanupRef.current = onSnapshot(doc(tenantDb, 'roles', roleName), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPermissions((data.permissions as UserPermissions) || DEFAULT_PERMISSIONS[roleName] || DEFAULT_PERMISSIONS.user);
      } else {
        setPermissions(DEFAULT_PERMISSIONS[roleName] || DEFAULT_PERMISSIONS.user);
      }
    }, (error) => {
      console.warn(`Error or permission denied listening to roles/${roleName}, using defaults:`, error);
      setPermissions(DEFAULT_PERMISSIONS[roleName] || DEFAULT_PERMISSIONS.user);
    });
  };

  // 1. Listen to Auth State
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(masterAuth, (authUser) => {
      setUser(authUser);
      if (!authUser) {
        setLoading(false);
        setRole('user');
        setPermissions(DEFAULT_PERMISSIONS.user);
        setIsApproved(false);
        setLicenseStatus('none');
        setGymInfo(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Fetch User Profile and Role (Master or Tenant)
  useEffect(() => {
    if (!user) {
      console.log("AuthContext: No user yet in Profile Effect.");
      return;
    }

    let unsubUserDoc: (() => void) | null = null;
    
    // We wait for gymInfo to be resolved (either found by slug or missing) 
    // before determining where to look for the user profile.
    if (licenseLoading) {
      console.log("AuthContext: License is still loading, waiting for Profile Setup.");
      return;
    }

    const setupUserProfile = async () => {
      try {
        const isUserSuperAdmin = !!user.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());
        
        // Always load profile from Master first
        const masterUserDocRef = doc(masterDb, 'users', user.uid);
        const masterUserDoc = await getDoc(masterUserDocRef);
        
        let profileData: any = null;

        if (masterUserDoc.exists()) {
          profileData = { id: masterUserDoc.id, ...masterUserDoc.data() };
          
          // If the UID-based profile is NOT approved, check if there is an email-based pre-approval
          if (!profileData.approved) {
            const emailDocRef = doc(masterDb, 'users', user.email!.toLowerCase().trim());
            const emailDoc = await getDoc(emailDocRef);
            
            if (emailDoc.exists()) {
              console.log("AuthContext: Found pre-approval for existing unapproved user. Merging.");
              const emailData = emailDoc.data();
              profileData = {
                ...profileData,
                ...emailData,
                uid: user.uid,
                email: user.email,
                approved: emailData.approved ?? true,
                updatedAt: serverTimestamp()
              };
              await setDoc(masterUserDocRef, profileData, { merge: true });
              try { await deleteDoc(emailDocRef); } catch (e) {}
            }
          }
        } else {
          console.log("AuthContext: Profile not found in master. Checking for pre-approved by email.");
          const emailDocRef = doc(masterDb, 'users', user.email!.toLowerCase().trim());
          const emailDoc = await getDoc(emailDocRef);

          if (emailDoc.exists()) {
            const emailData = emailDoc.data();
            profileData = {
              ...emailData,
              uid: user.uid,
              name: user.displayName || emailData.name || 'Admin',
              email: user.email,
              role: emailData.role || 'admin',
              approved: emailData.approved ?? true,
              tenantId: emailData.tenantId || 'default_gym'
            };
            await setDoc(masterUserDocRef, { ...profileData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            try { await deleteDoc(emailDocRef); } catch (e) {}
          } else {
            console.log("AuthContext: User not pre-registered. Creating blocked profile for", user.email);
            profileData = {
              uid: user.uid,
              name: user.displayName || 'Usuário Não Registrado',
              email: user.email,
              role: 'user',
              approved: false,
              tenantId: gymSlug || 'default_gym'
            };
            await setDoc(masterUserDocRef, { ...profileData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
          }
        }

        // Fix superadmin missing flags
        if (isUserSuperAdmin && (profileData.role !== 'admin' || !profileData.approved)) {
          // Special case for Balcao: force its specific role and name
          const isTablet = !!user.email && CHECKIN_TABLET_EMAILS.includes(user.email.toLowerCase());
          if (isTablet) {
            profileData.role = 'checkin_tablet';
            profileData.name = 'Balcão';
            profileData.approved = true;
            await setDoc(masterUserDocRef, { role: 'checkin_tablet', name: 'Balcão', approved: true }, { merge: true });
          } else {
            profileData.role = 'admin';
            profileData.approved = true;
            await setDoc(masterUserDocRef, { role: 'admin', approved: true }, { merge: true });
          }
        }

        setCurrentUser(profileData);
        setRole(profileData.role);
        setIsApproved(profileData.approved);

        // Load Tenant Metadata
        const tid = profileData.tenantId || 'default_gym';
        const tenantDoc = await getDoc(doc(masterDb, 'tenants', tid));
        if (tenantDoc.exists()) {
          const tData = tenantDoc.data();
          setCurrentTenant({ id: tenantDoc.id, ...tData } as Tenant);
          
          // Sync with gymInfo for backward compatibility
          if (!gymSlug) {
            setGymInfo({
              name: tData.name,
              slug: tData.slug || tid,
              isExternal: !!tData.config,
              config: tData.config
            });
            setLicenseStatus('active');
          }
        }

        // Listen for profile changes AFTER initial setup
        unsubUserDoc = onSnapshot(masterUserDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data: any = { id: docSnap.id, ...docSnap.data() };
            setCurrentUser(data);
            setIsApproved(data.approved || false);
            setRole(data.role || 'user');
          }
        }, (err) => {
          // Failure here is often due to the doc not existing yet or permissions changing
          console.warn("AuthContext: Profile listener error (expected if doc changing):", err.message);
        });

      } catch (error) {
        console.error("AuthContext: Profile setup error:", error);
      } finally {
        setLoading(false);
      }
    };

    setupUserProfile();

    return () => {
      if (unsubUserDoc) unsubUserDoc();
    };
  }, [user, gymInfo?.config?.apiKey, tenantDb, licenseLoading, gymSlug, licenseStatus]); // Use more specific dependencies

  const isLicenseOwner = licenseStatus === 'active';
  const isAdmin = role === 'admin' || role === 'tenant_admin' || isSuperAdmin || isLicenseOwner;
  const isApprovedFinal = isApproved || isSuperAdmin || isLicenseOwner;

  useEffect(() => {
    const effectiveRole = isLicenseOwner ? 'admin' : role;
    if (user && effectiveRole) {
      updatePermissions(effectiveRole, unsubRoleDocRef);
    }
  }, [user, role, isLicenseOwner, tenantDb]);

  const logout = async () => {
    try {
      await firebaseLogout();
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await firebaseLoginWithEmail(email, pass);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await firebaseRegisterWithEmail(email, pass);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const linkGoogle = async () => {
    if (!user) return;
    try {
      await linkWithPopup(user, googleProvider);
      // Force user update in state
      setUser({ ...masterAuth.currentUser! });
    } catch (error) {
      console.error("Link Google error:", error);
      throw error;
    }
  };

  const unlinkGoogle = async () => {
    if (!user) return;
    try {
      await unlink(user, GoogleAuthProvider.PROVIDER_ID);
      setUser({ ...masterAuth.currentUser! });
    } catch (error) {
      console.error("Unlink Google error:", error);
      throw error;
    }
  };

  const sendResetEmail = async (email: string) => {
    try {
      await sendPasswordResetEmail(masterAuth, email);
    } catch (error) {
      console.error("Reset Email Error:", error);
      throw error;
    }
  };

  const updateMyPassword = async (newPass: string) => {
    if (!masterAuth.currentUser) return;
    try {
      await updatePassword(masterAuth.currentUser, newPass);
    } catch (error) {
      console.error("Update Password Error:", error);
      throw error;
    }
  };

  const syncGymStats = useCallback(async (stats: { studentCount: number }) => {
    if (!user?.email || isSuperAdmin) return;
    const licenseId = user.email.toLowerCase().trim();
    try {
      await setDoc(doc(masterDb, 'licenses', licenseId), {
        stats: {
          studentCount: stats.studentCount,
          lastSync: serverTimestamp()
        }
      }, { merge: true });
    } catch (e) {
      console.error("Master sync error:", e);
    }
  }, [user?.email, isSuperAdmin]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      currentUser,
      currentTenant,
      loading: loading || licenseLoading, 
      role, 
      permissions, 
      isApproved: isApprovedFinal, 
      isAdmin, 
      isSuperAdmin,
      isReceptionist: role === 'receptionist', 
      isProfessor: role === 'professor', 
      isCheckInTablet: role === 'checkin_tablet' || (!!user?.email && CHECKIN_TABLET_EMAILS.includes(user.email.toLowerCase())),
      licenseStatus,
      gymInfo,
      tenantDb,
      masterDb,
      tenantId,
      logout,
      loginWithEmail,
      registerWithEmail,
      linkGoogle,
      unlinkGoogle,
      sendResetEmail,
      updateMyPassword,
      syncGymStats
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
