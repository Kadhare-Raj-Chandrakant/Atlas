import { create } from 'zustand'

interface AppState {
  activeView: string
  params: Record<string, string>
  navigate: (view: string, params?: Record<string, string>) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'today',
  params: {},
  navigate: (view, params = {}) => set({ activeView: view, params }),
}))
