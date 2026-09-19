import { create } from 'zustand';

interface RouteLoadingState {
  isPending: boolean;
  startNavigation: () => void;
  completeNavigation: () => void;
}

export const useRouteLoadingStore = create<RouteLoadingState>((set) => ({
  isPending: false,
  startNavigation: () => set({ isPending: true }),
  completeNavigation: () => set({ isPending: false }),
}));
