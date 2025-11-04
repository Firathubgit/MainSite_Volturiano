import { create } from 'zustand';

export const useUserStore = create((set) => ({
  session: null,
  setSession: (session) => set({ session })
}));

