import { IDevice } from '@/shared/interfaces'
import { create } from 'zustand'

type State = {
  devices: IDevice[]
  selectedDevice?: IDevice
}

type Action = {
  addDevice: (device: IDevice) => void
  selectDevice: (device: string) => void
  setDevices: (devices: IDevice[]) => void
  removeDevice: (id: string) => void
}

export const useDeviceStore = create<State & Action>()((set) => ({
  devices: [],
  addDevice: (device: IDevice) => set((state) => ({ devices: [...state.devices, device] })),
  setDevices: (devices: IDevice[]) => set({ devices }),
  selectDevice: (id: string) =>
    set((state) => ({
      selectedDevice: state.selectedDevice
        ? undefined
        : state.devices?.find((device) => device.id === id)
    })),
  removeDevice: (id: string) =>
    set((state) => ({ devices: state.devices?.filter((device) => device.id !== id) }))
}))
