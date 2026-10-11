import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase/config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  authorizedEmails: string[];
}

const PRIMARY_ADMIN_EMAIL = 'shivangshukla884@gmail.com';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authorizedEmails, setAuthorizedEmails] = useState<string[]>([PRIMARY_ADMIN_EMAIL]);

  useEffect(() => {
    // Fetch authorized emails from backend
    fetch('/api/auth/admin-list')
      .then((res) => res.json())
      .then((data) => {
        if (data?.authorizedEmails) {
          setAuthorizedEmails(data.authorizedEmails);
        }
      })
      .catch((err) => console.warn('Could not load server admin list:', err));
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthError(null);

      if (currentUser) {
        try {
          const userEmail = (currentUser.email || '').toLowerCase();
          const isPrimary = userEmail === PRIMARY_ADMIN_EMAIL.toLowerCase();

          // Check if admin document exists
          let adminDocExists = false;
          try {
            const adminDocRef = doc(db, 'admins', currentUser.uid);
            const adminDocSnap = await getDoc(adminDocRef);
            if (adminDocSnap.exists()) {
              adminDocExists = true;
            } else if (isPrimary) {
              // Auto-seed primary admin record in admins collection
              await setDoc(adminDocRef, {
                email: currentUser.email,
                role: 'admin',
                displayName: currentUser.displayName || 'Department Administrator',
                createdAt: new Date().toISOString(),
              });
              adminDocExists = true;
            }
          } catch (err) {
            console.warn('Admin check error:', err);
          }

          const adminAuthorized = isPrimary || adminDocExists;
          setIsAdmin(adminAuthorized);

          if (!adminAuthorized) {
            setAuthError(
              `Access Denied: The account ${currentUser.email} is not authorized for university department timetable administration.`
            );
          }
        } catch (err: any) {
          console.error('Error during admin status verification:', err);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setAuthError(err.message || 'Failed to authenticate with Google.');
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAdmin(false);
      setAuthError(null);
    } catch (err: any) {
      console.error('Sign-out error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        authError,
        signInWithGoogle,
        signOutUser,
        authorizedEmails,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
