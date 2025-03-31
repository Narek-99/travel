import { create } from 'zustand';

export const useTripStore = create((set) => ({
    tripData: {}, // Speichert alle Antworten des Users
    setTripData: (newData) =>
        set((state) => ({ tripData: { ...state.tripData, ...newData } })),
    resetTrip: () => set({ tripData: {} }), // Setzt alle Daten zurück
}));