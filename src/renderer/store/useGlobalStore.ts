import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeModeType = 'system' | 'light' | 'dark'

export enum ActivePageType {
  Compose = 'Compose',
  Inbox = 'Inbox',
  Sent = 'Sent',
  Settings = 'Settings'
}

type State = {
  mode: ThemeModeType
  activePage?: ActivePageType
}

type Action = {
  setMode: (mode: ThemeModeType) => void
  setActivePage: (page: ActivePageType) => void
}

export const useGlobalStore = create<State & Action>()(
  persist(
    (set) => ({
      mode: 'system',
      activePage: ActivePageType.Compose,
      setActivePage: (page: ActivePageType) => set({ activePage: page }),
      setMode: (mode: ThemeModeType) => set({ mode })
    }),
    {
      name: 'globalSettings',
      partialize: (state) => ({
        mode: state.mode
      })
    }
  )
)
