import { create } from 'zustand';

export const useConfigStore = create((set, get) => ({
  vehicleId: null,
  selectedOptions: {},
  basePrice: 0,
  priceDelta: 0,
  setVehicle: (vehicleId, basePrice=0) => set({ vehicleId, basePrice }),
  selectOption: (optionId, valueId, priceDelta=0) => {
    const next = { ...get().selectedOptions, [optionId]: valueId };
    set({ selectedOptions: next, priceDelta: get().priceDelta + priceDelta });
  },
  totalPrice: () => get().basePrice + get().priceDelta
}));

