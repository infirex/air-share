import { BrowserWindow, dialog, ipcMain } from 'electron'
import DeviceListService from './services/DeviceList.service'
import fileTransferService from './services/FileTransfer.service'
import networkDiscovery from './services/NetDiscover.service'
import os from 'os'

export const registerIPCMainHandlers = (window: BrowserWindow): void => {
  window.webContents.on('did-finish-load', () => {
    networkDiscovery.start().catch(console.error)

    fileTransferService.startReceiver((newTransfer, approveCallback) => {
      // TODO: click event is not working, handle it
      // if (window.isMinimized())
      // showNotification('New Transfer', 'xxx wants to start file transfer', window)

      window.webContents.send('new-transfer', newTransfer)

      ipcMain.on(
        'approve-transfer',
        (_evt, approvedSocketID: string, isApproved: boolean, folderPath?: string) => {
          if (newTransfer.socketID === approvedSocketID)
            approveCallback(isApproved, folderPath, (progress) => {
              window.webContents.send('progress-info', approvedSocketID, progress)
            })
        }
      )
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

  ipcMain.handle('get-current-device-info', (_event) => os.userInfo().username)

  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Pick directory',
      properties: ['openDirectory'] // only directory
    })

    return result.canceled ? undefined : result.filePaths[0] // directory path
  })
}
