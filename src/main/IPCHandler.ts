import { BrowserWindow, ipcMain } from 'electron'
import fileTransferService from './services/FileTransfer.service'
import DeviceCacheService from './services/DeviceCache.service'

export const registerIPCMainHandlers = (window: BrowserWindow): void => {
  ipcMain.on('send-files', (_event, deviceID, files) => {
    const deviceIP = DeviceCacheService.get(deviceID) as string
    console.log(deviceID, files)
    if (deviceIP) {
      fileTransferService.setSocket(deviceIP)
      fileTransferService.sendFiles(files, { onFileProgress: console.log })
    } else {
      console.error(`Could not find device with ${deviceID}`)
    }
  })
}
