import { IDevice } from '@/shared/interfaces'
import { ipcRenderer, contextBridge } from 'electron'

export const api = {
  onDiscoverDevice: (callback: (device: IDevice) => void) =>
    ipcRenderer.on('discover-device', (_event, device: IDevice) => callback(device)),
  sendFiles: (deviceID: string, files: string[]) => ipcRenderer.send('send-files', deviceID, files)
}

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('api', api)
