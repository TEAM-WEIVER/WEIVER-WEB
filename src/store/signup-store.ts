import { create } from 'zustand';

export interface SignupAccount {
  email: string;
  signupToken?: string;
}

interface SignupState {
  terms: Record<string, boolean>;
  account: SignupAccount;
  profile: Record<string, unknown>;

  setTerms: (terms: Record<string, boolean>) => void;
  setAccount: (account: Partial<SignupAccount>) => void;
  setProfile: (profile: Record<string, unknown>) => void;
  reset: () => void;
}

const initialAccount: SignupAccount = { email: '' };

export const useSignupStore = create<SignupState>((set) => ({
  terms: {},
  account: initialAccount,
  profile: {},

  setTerms: (terms) => set({ terms }),
  setAccount: (account) => set((state) => ({ account: { ...state.account, ...account } })),
  setProfile: (profile) => set((state) => ({ profile: { ...state.profile, ...profile } })),
  reset: () =>
    set({
      terms: {},
      account: initialAccount,
      profile: {},
    }),
}));
