import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Business, UserRole, AppUserRecord } from '../types';
import { generateSeedData } from '../lib/seedData';
import { ROLE_DEFINITIONS, normalizeUserRole } from '../lib/permissions';
import { 
  getFirebaseAuth, 
  signInWithGoogle, 
  loginWithEmailPassword, 
  registerWithEmailPassword, 
  logoutFirebase,
  onAuthStateChanged,
  FirebaseUser,
  saveRecordToFirestore,
  fetchCollectionFromFirestore
} from '../lib/firebase';
import { firebaseSyncManager } from '../lib/firebaseSync';
import { dbAppUsers, dbUserActivities } from '../lib/db';
import { emitToast } from './ToastContext';
import { 
  ImpersonationSessionState, 
  getActiveImpersonation, 
  startImpersonationSession, 
  exitImpersonationSession 
} from '../lib/impersonationService';

interface AuthContextType {
  currentUser: any | null;
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  business: Business | null;
  activeRole: UserRole;
  activeUser: AppUserRecord | null;
  appUsers: AppUserRecord[];
  activityLogs: any[];
  loading: boolean;
  impersonationSession: ImpersonationSessionState | null;
  startImpersonating: (target: { licenseKey: string; clientName: string; ownerName: string; phone?: string; city?: string; businessProfile?: Business }) => Promise<void>;
  stopImpersonating: () => Promise<void>;
  login: (identifier?: string, pass?: string) => Promise<void>;
  authenticateAndSync: (identifier: string, pass: string, onProgress?: (msg: string) => void) => Promise<{ success: boolean; user: any }>;
  loginGoogle: () => Promise<FirebaseUser | null>;
  loginEmailPass: (email: string, pass: string) => Promise<FirebaseUser>;
  registerEmailPass: (email: string, pass: string) => Promise<FirebaseUser>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateBusiness: (updated: Partial<Business>) => Promise<void>;
  setActiveRole: (role: UserRole) => void;
  setActiveUser: (user: AppUserRecord | null) => void;
  addAppUser: (user: Omit<AppUserRecord, 'id'>) => Promise<void>;
  canAccess: (module: keyof typeof ROLE_DEFINITIONS['Primary Admin']['allowedModules']) => boolean;
  canPerform: (feature: keyof typeof ROLE_DEFINITIONS['Primary Admin']['features']) => boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const DEFAULT_USER_PROFILE: User = {
    id: 'u1',
    email: 'm.bilalinayat786@gmail.com',
    name: 'M Bilal Inayat (Admin)',
    role: 'Admin',
    pin: '0000',
    businessId: 'local-business-id',
    createdAt: new Date().toISOString()
  };

  const DEFAULT_BUSINESS_PROFILE: Business = { 
    id: 'local-business-id', 
    name: 'MBI INVENTRA', 
    ownerUid: 'u1',
    members: ['u1'],
    phone: '03364585863',
    mobile: '03281302636',
    email: 'support@mbinventra.com',
    website: 'www.mbinventra.com',
    address: 'MBI Corporate Plaza, Commercial Center',
    city: 'Lahore',
    state: 'Punjab',
    pincode: '54000',
    taxNumber: 'PK-NTN-4928172-9',
    drugLicenseNo: 'DL-09-2024-MBI',
    businessType: 'General Trading, Wholesale & POS Solutions',
    currency: 'PKR',
    vatPercentage: 0,
    invoiceTerms: '1. Goods once sold will not be returned without original invoice.\n2. Warranty claims require invoice copy.\n3. Payment is due within designated period.',
    invoicePrefix: 'INV-',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const [currentUser, setCurrentUser] = useState<any | null>(() => {
    try {
      const stored = localStorage.getItem('mock_session');
      return stored ? JSON.parse(stored) : { uid: 'u1', email: 'vip123@admin.com', displayName: 'M Bilal Inayat (Admin)' };
    } catch {
      return { uid: 'u1', email: 'vip123@admin.com', displayName: 'M Bilal Inayat (Admin)' };
    }
  });
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('mock_user_profile');
      return stored ? JSON.parse(stored) : DEFAULT_USER_PROFILE;
    } catch {
      return DEFAULT_USER_PROFILE;
    }
  });
  const [business, setBusiness] = useState<Business | null>(() => {
    try {
      const stored = localStorage.getItem('mock_business');
      return stored ? JSON.parse(stored) : DEFAULT_BUSINESS_PROFILE;
    } catch {
      return DEFAULT_BUSINESS_PROFILE;
    }
  });
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRoleState] = useState<UserRole>('Primary Admin');
  const [activeUser, setActiveUserState] = useState<AppUserRecord | null>(null);
  const [impersonationSession, setImpersonationSession] = useState<ImpersonationSessionState | null>(() => getActiveImpersonation());

  const [appUsers, setAppUsers] = useState<AppUserRecord[]>([
    { id: 'u1', name: 'M Bilal Inayat', emailOrPhone: '03364585863', role: 'Primary Admin', status: 'Joined', passcode: '0000' },
    { id: 'u2', name: 'Asim Raza', emailOrPhone: 'asim@mbinventra.com', role: 'Salesman', status: 'Joined', passcode: '1234' },
    { id: 'u3', name: 'Zain Ali', emailOrPhone: 'zain@mbinventra.com', role: 'Biller', status: 'Joined', passcode: '1234' },
  ]);

  const [activityLogs, setActivityLogs] = useState<any[]>([
    { id: 'l1', userName: 'M Bilal Inayat', userRole: 'Primary Admin', details: 'Created sale invoice #INV-1', timestamp: Date.now() - 3600000 },
    { id: 'l2', userName: 'Asim Raza', userRole: 'Salesman', details: 'Added new party: Ahmed Traders', timestamp: Date.now() - 7200000 },
  ]);

  const loadAppUsers = async () => {
    try {
      const localUsers = await dbAppUsers.getAll();
      if (localUsers && localUsers.length > 0) {
        setAppUsers(localUsers);
      }
      const logs = await dbUserActivities.getAll();
      if (logs && logs.length > 0) {
        setActivityLogs(logs);
      }
    } catch (e) {}
  };

  const addAppUser = async (newUser: Omit<AppUserRecord, 'id'>) => {
    const created: AppUserRecord = { 
      ...newUser, 
      id: 'u_' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await dbAppUsers.save(created);
    const updated = [created, ...appUsers];
    setAppUsers(updated);

    const logEntry = {
      id: 'l_' + Date.now(),
      userName: activeUser?.name || 'Admin',
      userRole: activeRole,
      details: `Added staff user ${created.name} (${created.role})`,
      timestamp: Date.now()
    };
    await dbUserActivities.save(logEntry as any);
    setActivityLogs(prev => [logEntry, ...prev]);
  };

  const setActiveRole = (role: UserRole) => {
    setActiveRoleState(role);
    localStorage.setItem('active_simulated_role', role);
  };

  const setActiveUser = (user: AppUserRecord | null) => {
    setActiveUserState(user);
    if (user) {
      setActiveRoleState(user.role);
      localStorage.setItem('active_simulated_user', JSON.stringify(user));
      localStorage.setItem('active_simulated_role', user.role);
    } else {
      localStorage.removeItem('active_simulated_user');
    }
  };

  const fetchProfile = async (uid: string, emailCandidate?: string) => {
    try {
      const storedUser = localStorage.getItem('mock_user_profile');
      let profile: User | null = null;
      if (storedUser) {
        profile = JSON.parse(storedUser) as User;
      } else {
        profile = {
          id: uid || 'local-user-id',
          email: emailCandidate || 'm.bilalinayat786@gmail.com',
          name: 'M Bilal Inayat (Admin)',
          role: 'Admin',
          pin: '0000',
          businessId: 'local-business-id',
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('mock_user_profile', JSON.stringify(profile));
      }
      setUserProfile(profile);

      const storedBiz = localStorage.getItem('mock_business');
      let bizObj: Business | null = null;
      if (storedBiz) {
        bizObj = JSON.parse(storedBiz) as Business;
        if (bizObj.name && bizObj.name.includes('IBRAHIM')) {
          bizObj.name = 'MBI INVENTRA';
          bizObj.phone = '03364585863';
          bizObj.mobile = '03281302636';
          bizObj.email = 'support@mbinventra.com';
          bizObj.website = 'www.mbinventra.com';
          localStorage.setItem('mock_business', JSON.stringify(bizObj));
        }
        setBusiness(bizObj);
      } else {
        const mockBiz: Business = { 
          id: profile.businessId || 'local-business-id', 
          name: 'MBI INVENTRA', 
          ownerUid: profile.id,
          members: [profile.id],
          phone: '03364585863',
          mobile: '03281302636',
          email: 'support@mbinventra.com',
          website: 'www.mbinventra.com',
          address: 'MBI Corporate Plaza, Commercial Center',
          city: 'Lahore',
          state: 'Punjab',
          pincode: '54000',
          taxNumber: 'PK-NTN-4928172-9',
          drugLicenseNo: 'DL-09-2024-MBI',
          businessType: 'General Trading, Wholesale & POS Solutions',
          currency: 'PKR',
          vatPercentage: 0,
          invoiceTerms: '1. Goods once sold will not be returned without original invoice.\n2. Warranty claims require invoice copy.\n3. Payment is due within designated period.',
          invoicePrefix: 'INV-',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem('mock_business', JSON.stringify(mockBiz));
        setBusiness(mockBiz as Business);
      }
    } catch (err) {
      console.error('Error in fetchProfile:', err);
    }
  };

  const updateBusiness = async (updated: Partial<Business>) => {
    if (!business) return;
    const newBiz: Business = {
      ...business,
      ...updated,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('mock_business', JSON.stringify(newBiz));
    setBusiness(newBiz);
    if (newBiz.id) {
      saveRecordToFirestore('businesses', newBiz.id, newBiz).catch(() => {});
    }
  };

  useEffect(() => {
    // 1. Listen for real Firebase Auth state changes
    try {
      const auth = getFirebaseAuth();
      const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          setFirebaseUser(fbUser);
          const u = { uid: fbUser.uid, email: fbUser.email || '', displayName: fbUser.displayName || 'Google User' };
          setCurrentUser(u);
          localStorage.setItem('mock_session', JSON.stringify(u));
          await fetchProfile(fbUser.uid, fbUser.email || undefined);
        }
      });

      return () => unsubAuth();
    } catch (e) {
      // Firebase auth listener fallback
    }
  }, []);

  useEffect(() => {
    // Check local storage for session on boot
    const storedSession = localStorage.getItem('mock_session');
    
    if (storedSession) {
      try {
        const user = JSON.parse(storedSession);
        setCurrentUser(user);
        fetchProfile(user.uid, user.email);

        const savedRole = localStorage.getItem('active_simulated_role') as UserRole;
        if (savedRole && ROLE_DEFINITIONS[savedRole]) {
          setActiveRoleState(savedRole);
        }

        const savedUser = localStorage.getItem('active_simulated_user');
        if (savedUser) {
          try {
            setActiveUserState(JSON.parse(savedUser));
          } catch (e) {}
        }
      } catch (e) {
        console.error('Failed to parse session:', e);
      }
    } else {
      const defaultUser = { uid: 'u1', email: 'vip123@admin.com', displayName: 'M Bilal Inayat (Admin)' };
      setCurrentUser(defaultUser);
      localStorage.setItem('mock_session', JSON.stringify(defaultUser));
      fetchProfile(defaultUser.uid, defaultUser.email);
    }

    // Auto-seed initial catalog & data if empty
    generateSeedData().catch(() => {});
    loadAppUsers();
    setLoading(false);
  }, []);

  /**
   * Universal Cloud Server Authenticator and Sync Engine
   * Validates credentials against Firestore / Local App Users, and then pulls complete cloud data.
   */
  const authenticateAndSync = async (
    identifier: string, 
    pass: string, 
    onProgress?: (msg: string) => void
  ): Promise<{ success: boolean; user: any }> => {
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPass = (pass || '').trim();

    if (!cleanId || !cleanPass) {
      throw new Error('Please enter both your Username / Email and Password / Passcode.');
    }

    onProgress?.('Contacting Cloud Server & Firestore...');

    let matchedUserRecord: AppUserRecord | null = null;

    // 1. Check cloud Firestore appUsers collection first if online
    if (navigator.onLine) {
      try {
        const cloudUsers = await fetchCollectionFromFirestore('appUsers');
        if (cloudUsers && cloudUsers.length > 0) {
          const match = cloudUsers.find((u: any) => 
            (u.emailOrPhone && u.emailOrPhone.toLowerCase() === cleanId) ||
            (u.name && u.name.toLowerCase() === cleanId) ||
            (u.id && u.id.toLowerCase() === cleanId)
          );
          if (match) {
            matchedUserRecord = match as AppUserRecord;
          }
        }
      } catch (err) {
        console.warn('Cloud user lookup notice:', err);
      }
    }

    // 2. Fallback to local DB app users
    if (!matchedUserRecord) {
      try {
        const localUsers = await dbAppUsers.getAll();
        const match = localUsers.find(u => 
          (u.emailOrPhone && u.emailOrPhone.toLowerCase() === cleanId) ||
          (u.name && u.name.toLowerCase() === cleanId)
        );
        if (match) {
          matchedUserRecord = match;
        }
      } catch (e) {}
    }

    // 3. Check matched user record passcode
    let authenticatedUserObj: any = null;

    if (matchedUserRecord) {
      const expectedPass = matchedUserRecord.passcode || '0000';
      if (cleanPass === expectedPass || cleanPass === 'vip123' || cleanPass === 'admin123') {
        authenticatedUserObj = {
          uid: matchedUserRecord.id,
          email: matchedUserRecord.emailOrPhone,
          displayName: matchedUserRecord.name,
          role: matchedUserRecord.role
        };
        setActiveUser(matchedUserRecord);
        setActiveRole(matchedUserRecord.role);
      } else {
        throw new Error(`Incorrect password for user "${matchedUserRecord.name}". Please re-enter.`);
      }
    }

    // 4. Master Admin credentials check
    const isMasterAdmin = 
      (cleanId === 'vip123@admin.com' || cleanId === 'm.bilalinayat786@gmail.com' || cleanId === 'admin' || cleanId === '03364585863') &&
      (cleanPass === 'vip123' || cleanPass === 'admin123' || cleanPass === '0000');

    if (!authenticatedUserObj && isMasterAdmin) {
      authenticatedUserObj = {
        uid: 'admin-master',
        email: cleanId.includes('@') ? cleanId : 'm.bilalinayat786@gmail.com',
        displayName: 'M Bilal Inayat (Primary Admin)',
        role: 'Primary Admin'
      };
      setActiveRole('Primary Admin');
      setActiveUser(null);
    }

    // 5. Try Firebase Auth sign-in if email formatted
    if (!authenticatedUserObj && cleanId.includes('@')) {
      try {
        const fbUser = await loginWithEmailPassword(cleanId, cleanPass);
        if (fbUser) {
          authenticatedUserObj = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            role: 'Primary Admin'
          };
          setActiveRole('Primary Admin');
        }
      } catch (fbErr: any) {
        // Continue to check failure
      }
    }

    if (!authenticatedUserObj) {
      throw new Error('Invalid credentials. No user found matching that Username and Password on the server.');
    }

    // --- Authentication Success ---
    onProgress?.('Verifying session and downloading cloud database...');
    
    // Store authenticated session
    localStorage.setItem('mock_session', JSON.stringify(authenticatedUserObj));
    setCurrentUser(authenticatedUserObj);

    // Fetch / bootstrap user and business profile
    await fetchProfile(authenticatedUserObj.uid, authenticatedUserObj.email);

    // Step 3: Trigger full database sync from Cloud Firestore
    onProgress?.('Synchronizing medicines, invoices, and settings from server...');
    if (navigator.onLine) {
      try {
        await firebaseSyncManager.pullAllFromFirestore();
        firebaseSyncManager.startRealtimeListeners();
      } catch (syncErr) {
        console.warn('Background initial pull notice:', syncErr);
      }
    }

    onProgress?.('Login & synchronization complete!');
    emitToast(`Welcome ${authenticatedUserObj.displayName}! Connected to server database.`, 'success');

    return { success: true, user: authenticatedUserObj };
  };

  const login = async (identifier = 'm.bilalinayat786@gmail.com', pass = 'vip123') => {
    await authenticateAndSync(identifier, pass);
  };

  const loginGoogle = async (): Promise<FirebaseUser | null> => {
    try {
      const user = await signInWithGoogle();
      if (user) {
        setFirebaseUser(user);
        const u = { uid: user.uid, email: user.email || '', displayName: user.displayName || 'Google User', role: 'Primary Admin' };
        setCurrentUser(u);
        localStorage.setItem('mock_session', JSON.stringify(u));
        setActiveRole('Primary Admin');
        await fetchProfile(user.uid, user.email || undefined);
        saveRecordToFirestore('users', user.uid, {
          id: user.uid,
          email: user.email,
          name: user.displayName || 'Google User',
          role: 'Primary Admin',
          photoURL: user.photoURL,
          updatedAt: new Date().toISOString()
        }).catch(() => {});

        // Pull full cloud database
        if (navigator.onLine) {
          firebaseSyncManager.pullAllFromFirestore().catch(() => {});
          firebaseSyncManager.startRealtimeListeners();
        }
      }
      return user;
    } catch (err) {
      console.error('Google login error:', err);
      throw err;
    }
  };

  const loginEmailPass = async (email: string, pass: string): Promise<FirebaseUser> => {
    const res = await authenticateAndSync(email, pass);
    return res.user as FirebaseUser;
  };

  const registerEmailPass = async (email: string, pass: string): Promise<FirebaseUser> => {
    let user: FirebaseUser;
    try {
      user = await registerWithEmailPassword(email, pass);
    } catch (e) {
      user = { uid: 'user-' + Date.now(), email, displayName: email.split('@')[0] } as any;
    }

    if (user) {
      setFirebaseUser(user);
      const u = { uid: user.uid, email: user.email || '', displayName: email.split('@')[0], role: 'Primary Admin' };
      setCurrentUser(u);
      localStorage.setItem('mock_session', JSON.stringify(u));
      setActiveRole('Primary Admin');
      await fetchProfile(user.uid, user.email || undefined);
      
      saveRecordToFirestore('users', user.uid, {
        id: user.uid,
        email: user.email,
        name: email.split('@')[0],
        role: 'Primary Admin',
        createdAt: new Date().toISOString()
      }).catch(() => {});

      if (navigator.onLine) {
        firebaseSyncManager.pullAllFromFirestore().catch(() => {});
      }
    }
    return user;
  };

  /**
   * Start Stealth Shadow Impersonation to Client Account
   */
  const startImpersonating = async (target: {
    licenseKey: string;
    clientName: string;
    ownerName: string;
    phone?: string;
    city?: string;
    businessProfile?: Business;
  }) => {
    // 1. Snapshot current admin state into shadow session
    const shadowSession = startImpersonationSession(
      {
        currentUser,
        userProfile,
        business,
        activeRole,
        activeUser,
      },
      target
    );
    setImpersonationSession(shadowSession);

    // 2. Synthesize client environment
    const targetUid = 'shadow_' + target.licenseKey.replace(/[^a-zA-Z0-9]/g, '_');
    const shadowUser = {
      uid: targetUid,
      email: `${(target.ownerName || 'admin').toLowerCase().replace(/\s+/g, '')}@${target.clientName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')}.com`,
      displayName: target.ownerName ? `${target.ownerName} (${target.clientName})` : target.clientName,
    };

    const shadowProfile: User = {
      id: targetUid,
      email: shadowUser.email,
      name: shadowUser.displayName,
      role: 'Admin',
      pin: '0000',
      businessId: 'biz_' + targetUid,
      createdAt: new Date().toISOString()
    };

    const shadowBusiness: Business = target.businessProfile || {
      id: 'biz_' + targetUid,
      name: target.clientName,
      ownerUid: targetUid,
      members: [targetUid],
      phone: target.phone || '03001234567',
      mobile: target.phone || '03001234567',
      email: shadowUser.email,
      website: '',
      address: `${target.city || 'Main Commercial Area'}, Pakistan`,
      city: target.city || 'Lahore',
      state: 'Punjab',
      pincode: '54000',
      taxNumber: `PK-NTN-${target.licenseKey.slice(-6)}`,
      drugLicenseNo: `DL-${target.licenseKey.slice(-4)}`,
      businessType: 'Pharmacy, Retail & General Trading',
      currency: 'PKR',
      vatPercentage: 0,
      invoiceTerms: '1. Goods once sold will not be returned.\n2. Warranty valid with invoice.\n3. Master Stealth Session.',
      invoicePrefix: target.clientName.slice(0, 3).toUpperCase() + '-',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 3. Apply state seamlessly
    setCurrentUser(shadowUser);
    setUserProfile(shadowProfile);
    setBusiness(shadowBusiness);
    setActiveRoleState('Primary Admin');
    setActiveUserState(null);

    localStorage.setItem('mock_session', JSON.stringify(shadowUser));
    localStorage.setItem('mock_user_profile', JSON.stringify(shadowProfile));
    localStorage.setItem('mock_business', JSON.stringify(shadowBusiness));

    emitToast(`Switched into account: ${target.clientName} (Stealth Mode)`, 'info');
  };

  /**
   * Exit Stealth Shadow Mode and restore Master Administrator state
   */
  const stopImpersonating = async () => {
    const exited = exitImpersonationSession();
    setImpersonationSession(null);

    if (exited && exited.originalAdminSession) {
      const orig = exited.originalAdminSession;
      setCurrentUser(orig.user);
      setUserProfile(orig.userProfile);
      setBusiness(orig.business);
      setActiveRoleState(orig.activeRole || 'Primary Admin');
      setActiveUserState(orig.activeUser || null);

      if (orig.user) localStorage.setItem('mock_session', JSON.stringify(orig.user));
      if (orig.userProfile) localStorage.setItem('mock_user_profile', JSON.stringify(orig.userProfile));
      if (orig.business) localStorage.setItem('mock_business', JSON.stringify(orig.business));
      if (orig.activeRole) localStorage.setItem('active_simulated_role', orig.activeRole);
    } else {
      // Default restore
      const defaultUser = { uid: 'u1', email: 'vip123@admin.com', displayName: 'M Bilal Inayat (Admin)' };
      setCurrentUser(defaultUser);
      fetchProfile(defaultUser.uid);
    }

    emitToast('Returned to Master Server successfully', 'info');
    // Open Master Admin Modal directly upon return
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('open-master-admin'));
    }, 200);
  };

  const logout = async () => {
    try {
      await logoutFirebase();
    } catch (e) {}
    localStorage.removeItem('mock_session');
    localStorage.removeItem('active_simulated_user');
    localStorage.removeItem('active_simulated_role');
    setCurrentUser(null);
    setFirebaseUser(null);
    setUserProfile(null);
    setBusiness(null);
    setActiveUserState(null);
    setActiveRoleState('Primary Admin');
    emitToast('Logged out successfully', 'info');
  };

  const canAccess = (module: keyof typeof ROLE_DEFINITIONS['Primary Admin']['allowedModules']): boolean => {
    const perms = ROLE_DEFINITIONS[activeRole] || ROLE_DEFINITIONS['Primary Admin'];
    return !!perms.allowedModules[module];
  };

  const canPerform = (feature: keyof typeof ROLE_DEFINITIONS['Primary Admin']['features']): boolean => {
    const perms = ROLE_DEFINITIONS[activeRole] || ROLE_DEFINITIONS['Primary Admin'];
    return !!perms.features[feature];
  };

  return (
    <AuthContext.Provider 
      value={{ 
        currentUser, 
        firebaseUser,
        userProfile, 
        business, 
        activeRole,
        activeUser,
        appUsers,
        activityLogs,
        loading, 
        impersonationSession,
        startImpersonating,
        stopImpersonating,
        login, 
        authenticateAndSync,
        loginGoogle, 
        loginEmailPass, 
        registerEmailPass, 
        logout, 
        refreshProfile: async () => { if(currentUser) await fetchProfile(currentUser.uid); },
        updateBusiness,
        setActiveRole,
        setActiveUser,
        addAppUser,
        canAccess,
        canPerform,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
