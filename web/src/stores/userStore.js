import { create } from 'zustand';

export const useUserStore = create((set, get) => ({
  session: null,
  profile: null,
  status: 'idle', // idle | loading | ready
  setSession: (session) => {
    console.log('[UserStore] setSession called:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      hasAccessToken: !!session?.access_token,
      expiresAt: session?.expires_at,
      timestamp: new Date().toISOString()
    });
    set({ session });
  },
  setProfile: (profile) => {
    console.log('[UserStore] setProfile called:', {
      hasProfile: !!profile,
      profileId: profile?.id,
      timestamp: new Date().toISOString()
    });
    set({ profile });
  },
  setStatus: (status) => {
    console.log('[UserStore] setStatus called:', {
      status,
      currentSession: !!get().session,
      timestamp: new Date().toISOString()
    });
    set({ status });
  },
  reset: () => {
    console.log('[UserStore] reset called - clearing session and profile');
    set({
      session: null,
      profile: null,
      status: 'idle'
    });
  },
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

