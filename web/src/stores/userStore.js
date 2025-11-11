import { create } from 'zustand';

export const useUserStore = create((set) => ({
  session: null,
  profile: null,
  status: 'idle', // idle | loading | ready
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setStatus: (status) => set({ status }),
  reset: () =>
    set({
      session: null,
      profile: null,
      status: 'idle'
    })
}));

