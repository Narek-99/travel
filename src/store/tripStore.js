import { create } from 'zustand';

export const useTripStore = create((set) => ({
    tripData: {},
    setTripData: (newData) =>
        set((state) => ({ tripData: { ...state.tripData, ...newData } })),
    resetTrip: () => set({ tripData: {} }),
    isEditing: false,
    setEditing: (flag) => set({ isEditing: flag }),
}));