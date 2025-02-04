import { BrowserWindow, ipcMain } from 'electron'
import DeviceCacheService from './services/DeviceCache'
import { FileTransfer } from './file-transfer'

export const registerIPCMainHandlers = (window: BrowserWindow): void => {
  ipcMain.handle('send-files', (_event, deviceID, files) => {
    const deviceIP = DeviceCacheService.get(deviceID)
    if (deviceIP) {
      const fileTransfer = new FileTransfer(deviceIP as string)
      fileTransfer.sendFiles(files, { onFileProgress: console.log })
    } else {
      console.error(`Could not find device with ${deviceID}`)
    }
  })
}
