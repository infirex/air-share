import { IDevice } from '@/shared/interfaces'
import { INewTransfer } from '@/shared/interfaces/ITransfer'
import { contextBridge, ipcRenderer } from 'electron'

export const api = {
  onDiscoverDevice: (callback: (device: IDevice) => void) =>
    ipcRenderer.on('discover-device', (_event, device: IDevice) => callback(device)),
  sendFiles: (deviceID: string, files: string[]) => ipcRenderer.send('send-files', deviceID, files),
  getCurrentDeviceInfo: async (): Promise<string> =>
    await ipcRenderer.invoke('get-current-device-info'),
  listenIncomingTransfer: (callback: (newTransfer: INewTransfer) => void) =>
    ipcRenderer.on('new-transfer', (_evt, newTransfer) => callback(newTransfer)),
  approveTransfer: (socketID: string, isApproved: boolean) =>
    ipcRenderer.send('approve-transfer', socketID, isApproved),
  progressInfo: (callback: (transferId: string, progress: number) => void) =>
    ipcRenderer.on('progress-info', (_evt, transferID, progress) => callback(transferID, progress)),
  removeEventListener: (channel: string): any => ipcRenderer.removeAllListeners(channel)
}

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('api', api)
