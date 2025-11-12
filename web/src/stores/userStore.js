import { create } from 'zustand';

export const useUserStore = create((set, get) => ({
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
    }),
  simulateAuthCycle: (duration = 2500) => {
    const snapshot = get();
    const previousSession = snapshot.session;
    const previousProfile = snapshot.profile;
    const previousStatus = snapshot.status;

    set({
      session: null,
      profile: null,
      status: 'loading'
    });

    setTimeout(() => {
      set({
        session: previousSession,
        profile: previousProfile,
        status: previousSession ? 'ready' : previousStatus ?? 'idle'
      });
    }, duration);
  }
}));

