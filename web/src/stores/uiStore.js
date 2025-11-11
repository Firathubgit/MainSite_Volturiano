import { create } from 'zustand';

export const useUiStore = create((set) => ({
  muted: true,
  viewerMode: '2d',
  accountMenuOpen: false,
  navMenuOpen: false,
  languageMenuOpen: false,
  setMuted: (muted) => set({ muted }),
  setViewerMode: (viewerMode) => set({ viewerMode }),
  openAccountMenu: () => set({ accountMenuOpen: true }),
  closeAccountMenu: () => set({ accountMenuOpen: false }),
  toggleAccountMenu: () =>
    set((state) => ({ accountMenuOpen: !state.accountMenuOpen })),
  openNavMenu: () => set({ navMenuOpen: true }),
  closeNavMenu: () => set({ navMenuOpen: false }),
  toggleNavMenu: () =>
    set((state) => ({ navMenuOpen: !state.navMenuOpen })),
  openLanguageMenu: () => set({ languageMenuOpen: true }),
  closeLanguageMenu: () => set({ languageMenuOpen: false }),
  toggleLanguageMenu: () =>
    set((state) => ({ languageMenuOpen: !state.languageMenuOpen }))
}));

