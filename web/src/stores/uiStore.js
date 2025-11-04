import { create } from 'zustand';

export const useUiStore = create((set) => ({
  muted: true,
  viewerMode: '2d',
  setMuted: (muted) => set({ muted }),
  setViewerMode: (viewerMode) => set({ viewerMode })
}));

