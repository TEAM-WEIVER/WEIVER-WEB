import { create } from 'zustand';

export type SignupType = 'corporate' | 'individual';

export interface SignupAccount {
  email: string;
  companyName?: string;
}

export interface SignupCompanyInfo {
  companyType: string;
  employeeCount: string;
  ceoName: string;
  foundedYear: string;
  averageRevenue: string;
  website: string;
  companyAddress: string;
  culture: string;
  workSpeed: string;
  decisionMaking: string;
  roleDefinition: string;
  operationStyle: string;
  workStyleNote: string;
}

interface SignupState {
  /* 데이터 */
  type: SignupType | null;
  terms: Record<string, boolean>;
  account: SignupAccount;
  companyInfo: SignupCompanyInfo;
  profile: Record<string, unknown>;

  /* 액션 */
  setType: (type: SignupType) => void;
  setTerms: (terms: Record<string, boolean>) => void;
  setAccount: (account: Partial<SignupAccount>) => void;
  setCompanyInfo: (companyInfo: Partial<SignupCompanyInfo>) => void;
  setProfile: (profile: Record<string, unknown>) => void;
  reset: () => void;
}

const initialAccount: SignupAccount = { email: '', companyName: '' };

const initialCompanyInfo: SignupCompanyInfo = {
  companyType: '',
  employeeCount: '',
  ceoName: '',
  foundedYear: '',
  averageRevenue: '',
  website: '',
  companyAddress: '',
  culture: '',
  workSpeed: '',
  decisionMaking: '',
  roleDefinition: '',
  operationStyle: '',
  workStyleNote: '',
};

export const useSignupStore = create<SignupState>((set) => ({
  type: null,
  terms: {},
  account: initialAccount,
  companyInfo: initialCompanyInfo,
  profile: {},

  setType: (type) => set({ type }),
  setTerms: (terms) => set({ terms }),
  setAccount: (account) => set((state) => ({ account: { ...state.account, ...account } })),
  setCompanyInfo: (companyInfo) =>
    set((state) => ({ companyInfo: { ...state.companyInfo, ...companyInfo } })),
  setProfile: (profile) => set((state) => ({ profile: { ...state.profile, ...profile } })),
  reset: () =>
    set({
      type: null,
      terms: {},
      account: initialAccount,
      companyInfo: initialCompanyInfo,
      profile: {},
    }),
}));
