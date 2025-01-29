import { IDevice } from '@/shared/interfaces/IDevice'
import { create } from 'zustand'

type State = {
  devices?: IDevice[]
  selectedDevice?: IDevice
}

type Action = {
  selectDevice: (device: string) => void
  setDevices: (devices: IDevice[]) => void
  removeDevice: (id: string) => void
}

export const useDeviceStore = create<State & Action>()((set, get) => ({
  setDevices: (devices: IDevice[]) => set({ devices }),
  selectDevice: (id: string) =>
    set({
      selectedDevice: get().selectedDevice
        ? undefined
        : get().devices?.find((device) => device.id === id)
    }),
  removeDevice: (id: string) =>
    set({ devices: get().devices?.filter((device) => device.id !== id) })
}))
