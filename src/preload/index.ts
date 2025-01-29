import { IDevice } from '@/shared/interfaces/IDevice'
import { ipcRenderer, contextBridge } from 'electron'

export const api = {
  onDiscoverDevices: (callback: (devices: IDevice[]) => void) =>
    ipcRenderer.on('discover-device', (_event, devices: IDevice[]) => callback(devices))
}

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('api', api)
