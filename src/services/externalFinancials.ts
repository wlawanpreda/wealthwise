import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { initializeApp, getApp, getApps } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { FinancialAccount } from '../types';

// Database IDs from the user's request
const RETIRE_TAX_DB_ID = 'ai-studio-dd59df49-bdc8-4a37-b1db-474d9eb6670d';
const RETIRE_5_PERCENT_DB_ID = 'ai-studio-f28f242a-7cd7-4595-a85a-ecaf6d132941';

export async function fetchExternalInvestments(userId: string): Promise<FinancialAccount[]> {
  const accounts: FinancialAccount[] = [];
  
  // Ensure the app is initialized
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

  try {
    // 1. Fetch from Retire Tax (APRN) - https://retire-tax.epj.icu/
    // Path: users/{uid} -> current_portfolio.holdings[]
    const dbTax = getFirestore(app, RETIRE_TAX_DB_ID);
    const userDocRef = doc(dbTax, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      if (data.current_portfolio && data.current_portfolio.holdings) {
        const holdings = data.current_portfolio.holdings as any[];
        holdings.forEach((holding, index) => {
          accounts.push({
            id: `ext-tax-${userId}-${index}`,
            name: holding.name || `Asset ${index + 1} (Retire-Tax)`,
            amount: holding.value || holding.amount || 0,
            purpose: `Synced from Retire-Tax: ${holding.name || 'Holding'}`,
            isEmergencyFund: false,
            type: 'Investment',
            transactions: []
          });
        });
      }
    }

    // 2. Fetch from Retire 5% - https://retire-5.epj.icu/
    // Path: users/{uid}/investments (collection)
    const db5Percent = getFirestore(app, RETIRE_5_PERCENT_DB_ID);
    const investmentsColRef = collection(db5Percent, 'users', userId, 'investments');
    const investmentsSnap = await getDocs(investmentsColRef);

    investmentsSnap.forEach((doc) => {
      const data = doc.data();
      const name = data.name || data.accountName || `Asset ${doc.id.slice(0, 4)} (Retire-5%)`;
      accounts.push({
        id: `ext-5p-${userId}-${doc.id}`,
        name: name,
        amount: data.amount || data.value || 0,
        purpose: `Synced from Retire-5%: ${name}`,
        isEmergencyFund: false,
        type: 'Investment',
        transactions: []
      });
    });

  } catch (error) {
    console.error("Error fetching external investments:", error);
    // Silent fail or return what we found so far
  }

  return accounts;
}
