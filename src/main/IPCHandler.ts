import { BrowserWindow, ipcMain } from 'electron'
import DeviceListService from './services/DeviceList.service'
import fileTransferService from './services/FileTransfer.service'
import os from 'os'

export const registerIPCMainHandlers = (window: BrowserWindow): void => {
  ipcMain.on('send-files', (_event, deviceID, files) => {
    const deviceIP = DeviceListService.get(deviceID) as string
    console.log(deviceID, files)
    if (deviceIP) {
      fileTransferService
        .setSocket(deviceIP)
        .then(() => {
          fileTransferService.sendFiles(files, { onFileProgress: console.log })
        })
        .catch(console.error)
    } else {
      console.error(`Could not find device with ${deviceID}`)
    }
  })

  ipcMain.handle('get-current-device-info', (_event) => os.userInfo().username)
}
