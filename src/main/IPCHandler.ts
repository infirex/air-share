import { BrowserWindow, ipcMain } from 'electron'
import DeviceListService from './services/DeviceList.service'
import fileTransferService from './services/FileTransfer.service'
import networkDiscovery from './services/NetDiscover.service'
import { showNotification } from './Utils'

export const registerIPCMainHandlers = (window: BrowserWindow): void => {
  window.webContents.on('did-finish-load', () => {
    networkDiscovery.start().catch(console.error)
    fileTransferService.startReceiver((socketID, approveCallback) => {
      if (window.isMinimized())
        showNotification('New Transfer', 'xxx wants to start file transfer', window)
      approveCallback(false)
    })
  })

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
}
