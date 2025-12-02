/**
 * Infotainment Zustand Store
 * Manages all state for the infotainment OS interface
 */
import { create } from 'zustand';
import {
  DRIVE_MODES,
  CAMERA_VIEWS,
  APP_IDS,
  DEFAULT_CAR_CONFIG,
} from '../constants/infotainmentConstants';

const useInfotainmentStore = create((set) => ({
  // Boot state
  booting: true,
  bootProgress: 0,
  setBooting: (booting) => set({ booting }),
  setBootProgress: (progress) => set({ bootProgress: progress }),

  // Drive mode
  driveMode: DRIVE_MODES.SPORT,
  setDriveMode: (mode) => set({ driveMode: mode }),

  // Camera view
  cameraView: CAMERA_VIEWS.DEFAULT,
  setCameraView: (view) => set({ cameraView: view }),

  // Active app
  activeApp: APP_IDS.CAR,
  setActiveApp: (appId) => set({ activeApp: appId }),

  // Car configuration
  carConfig: { ...DEFAULT_CAR_CONFIG },
  setCarColor: (color) =>
    set((state) => ({
      carConfig: { ...state.carConfig, color },
    })),
  setRimColor: (rimColor) =>
    set((state) => ({
      carConfig: { ...state.carConfig, rimColor },
    })),

  // Climate state
  driverTemp: 21.5,
  passTemp: 22.0,
  setDriverTemp: (temp) => set({ driverTemp: temp }),
  setPassTemp: (temp) => set({ passTemp: temp }),

  // Mobile detection
  isMobile: false,
  setIsMobile: (isMobile) => set({ isMobile }),

  // Reset function
  reset: () =>
    set({
      booting: true,
      bootProgress: 0,
      driveMode: DRIVE_MODES.SPORT,
      cameraView: CAMERA_VIEWS.DEFAULT,
      activeApp: APP_IDS.CAR,
      carConfig: { ...DEFAULT_CAR_CONFIG },
      driverTemp: 21.5,
      passTemp: 22.0,
      isMobile: false,
    }),
}));

export default useInfotainmentStore;
