import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  getDocFromServer,
  FirestoreError 
} from 'firebase/firestore';
import { auth, db, signInWithGoogle } from '../lib/firebase';
import { FinancialPlan } from '../types';
import { 
  INITIAL_ALLOCATIONS, 
  INITIAL_LIABILITIES, 
  INITIAL_ACCOUNTS, 
  USER_INCOME 
} from '../constants';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  plan: FinancialPlan | null;
  savePlan: (plan: FinancialPlan) => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<FinancialPlan | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setPlan(null);
        setLoading(false);
      }
    });

    // Test connection as per critical directive
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const planRef = doc(db, 'users', user.uid, 'plan', 'current');
    
    const unsubscribe = onSnapshot(planRef, (docSnap) => {
      if (docSnap.exists()) {
        setPlan(docSnap.data() as FinancialPlan);
      } else {
        // Initialize default plan for new user
        const defaultPlan: FinancialPlan = {
          income: USER_INCOME,
          allocations: INITIAL_ALLOCATIONS,
          liabilities: INITIAL_LIABILITIES,
          emergencyFunds: INITIAL_ACCOUNTS,
          savingsTarget: 2880000
        };
        savePlan(defaultPlan);
        setPlan(defaultPlan);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/plan/current`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const savePlan = async (newPlan: FinancialPlan) => {
    if (!user) return;
    const planRef = doc(db, 'users', user.uid, 'plan', 'current');
    try {
      await setDoc(planRef, newPlan);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/plan/current`);
    }
  };

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  const signIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  return (
    <FirebaseContext.Provider value={{ user, loading, plan, savePlan, signIn, signOut }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
