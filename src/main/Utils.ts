import { BrowserWindow, Notification } from 'electron'

export const showNotification = (title: string, body: string, window: BrowserWindow) => {
  const notification = new Notification({ title, body })

  notification.on('click', () => {
    console.log('show notification')
    window.show()
  })

  notification.show()
}
