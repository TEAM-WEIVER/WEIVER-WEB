import { create } from 'zustand';

export type SignupType = 'corporate' | 'individual';

interface SignupState {
  /* 데이터 */
  type: SignupType | null;
  terms: Record<string, boolean>;
  account: {
    email: string;
    password: string;
    passwordConfirm: string;
    companyName?: string;
  };
  profile: Record<string, unknown>;

  /* 액션 */
  setType: (type: SignupType) => void;
  setTerms: (terms: Record<string, boolean>) => void;
  setAccount: (account: Partial<SignupState['account']>) => void;
  setProfile: (profile: Record<string, unknown>) => void;
  reset: () => void;
}

const initialAccount = { email: '', password: '', passwordConfirm: '', companyName: '' };

export const useSignupStore = create<SignupState>((set) => ({
  type: null,
  terms: {},
  account: initialAccount,
  profile: {},

  setType: (type) => set({ type }),
  setTerms: (terms) => set({ terms }),
  setAccount: (account) => set((state) => ({ account: { ...state.account, ...account } })),
  setProfile: (profile) => set((state) => ({ profile: { ...state.profile, ...profile } })),
  reset: () => set({ type: null, terms: {}, account: initialAccount, profile: {} }),
}));
