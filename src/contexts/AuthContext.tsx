import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, CurrencyCode, NotificationPrefs } from '../types';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: {
    displayName?: string;
    photoURL?: string;
    currency?: CurrencyCode;
    bio?: string;
    homeCity?: string;
    notificationPrefs?: NotificationPrefs;
  }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEFAULT_PREFS: NotificationPrefs = {
  tripReminders: true,
  packingReminders: true,
  budgetWarnings: true,
  invitations: true,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        let userProfile: UserProfile;

        if (!snap.exists()) {
          userProfile = {
            uid: user.uid,
            displayName: (user.displayName || user.email?.split('@')[0] || 'Traveler').slice(0, 120),
            email: (user.email || `${user.uid}@tripmate.local`).slice(0, 254),
            photoURL: (user.photoURL || '').slice(0, 1000),
            role: 'USER',
            currency: 'USD',
            bio: '',
            homeCity: '',
            notificationPrefs: DEFAULT_PREFS,
          };
          await setDoc(userRef, {
            ...userProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          userProfile = snap.data() as UserProfile;
        }

        let adminFlag =
          user.email === 'anikasaida5@gmail.com' && user.emailVerified === true;
        if (!adminFlag) {
          try {
            const adminSnap = await getDoc(doc(db, 'admins', user.uid));
            if (adminSnap.exists()) adminFlag = true;
          } catch {
            // Non-admin read is denied cleanly
          }
        }

        setProfile(userProfile);
        setIsAdmin(adminFlag || userProfile.role === 'ADMIN');
      } catch (err) {
        console.error('Failed to sync user profile:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const registerWithEmail = async (name: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: name.trim().slice(0, 120) });
    try {
      await sendEmailVerification(cred.user);
    } catch {
      // Verification email best effort
    }
    const userProfile: UserProfile = {
      uid: cred.user.uid,
      displayName: name.trim().slice(0, 120),
      email: email.trim().slice(0, 254),
      photoURL: '',
      role: 'USER',
      currency: 'USD',
      bio: '',
      homeCity: '',
      notificationPrefs: DEFAULT_PREFS,
    };
    try {
      await setDoc(doc(db, 'users', cred.user.uid), {
        ...userProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setProfile(userProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${cred.user.uid}`);
    }
  };

  const sendResetEmail = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateUserProfileData = async (updates: {
    displayName?: string;
    photoURL?: string;
    currency?: CurrencyCode;
    bio?: string;
    homeCity?: string;
    notificationPrefs?: NotificationPrefs;
  }) => {
    if (!firebaseUser) return;
    if (updates.displayName || updates.photoURL !== undefined) {
      await updateProfile(firebaseUser, {
        displayName: updates.displayName?.slice(0, 120) ?? firebaseUser.displayName,
        photoURL: updates.photoURL?.slice(0, 1000) ?? firebaseUser.photoURL,
      });
    }

    const clean: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.displayName !== undefined) clean.displayName = updates.displayName.trim().slice(0, 120);
    if (updates.photoURL !== undefined) clean.photoURL = updates.photoURL.trim().slice(0, 1000);
    if (updates.currency !== undefined) clean.currency = updates.currency;
    if (updates.bio !== undefined) clean.bio = updates.bio.trim().slice(0, 500);
    if (updates.homeCity !== undefined) clean.homeCity = updates.homeCity.trim().slice(0, 120);
    if (updates.notificationPrefs !== undefined) clean.notificationPrefs = updates.notificationPrefs;

    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), clean);
      setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!firebaseUser || !firebaseUser.email) {
      throw new Error('Password changes are only available for email/password accounts.');
    }
    const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
    await reauthenticateWithCredential(firebaseUser, credential);
    await updatePassword(firebaseUser, newPassword);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        isAdmin,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        sendResetEmail,
        logout,
        updateUserProfile: updateUserProfileData,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
