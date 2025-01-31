import { IDevice } from '@/shared/interfaces/IDevice'
import * as crypto from 'crypto'
import * as dgram from 'dgram'
import { BrowserWindow } from 'electron'
import * as fs from 'fs/promises'
import os from 'os'
import * as path from 'path'
import { promisify } from 'util'
import DeviceCacheService from './services/DeviceCache'
import { announcePresencePeriod, broadCastAddr } from '@/shared/constants'

type KeyPair = {
  privateKey: string
  publicKey: string
}

class NetworkDiscoveryUDP {
  private readonly keyFilePath: string
  private privateKey: string | null
  private publicKey: string | null
  private readonly deviceName: string
  private readonly port: number
  private signedMessage: string | null
  private readonly socket: dgram.Socket
  private readonly os: string

  constructor(keyFilePath: string = './keys.json', port: number = 13456) {
    this.keyFilePath = path.resolve(keyFilePath)
    this.privateKey = null
    this.publicKey = null
    this.signedMessage = null
    this.deviceName = os.userInfo().username
    this.port = port
    this.socket = dgram.createSocket({ type: 'udp4' })
    this.os = os.platform()
  }

  private async loadOrCreateKeys(): Promise<void> {
    try {
      const keys = await fs.readFile(this.keyFilePath, 'utf-8')
      const parsedKeys: KeyPair = JSON.parse(keys)
      this.privateKey = parsedKeys.privateKey
      this.publicKey = parsedKeys.publicKey
      console.log('Key pair loaded from file.')
    } catch (err) {
      console.log('No key file found, generating new key pair...')
      const generateKeyPairAsync = promisify(crypto.generateKeyPair)
      const { privateKey, publicKey } = await generateKeyPairAsync('ed25519', {
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        publicKeyEncoding: { type: 'spki', format: 'pem' }
      })
      this.privateKey = privateKey
      this.publicKey = publicKey
      await fs.writeFile(this.keyFilePath, JSON.stringify({ privateKey, publicKey }))
      console.log('New key pair generated and saved.')
    }
  }

  private async signMessage(message: string): Promise<string> {
    if (!this.privateKey) throw new Error('Private key is not loaded.')
    const signature = crypto.sign(null, Buffer.from(message), this.privateKey)
    return signature.toString('hex')
  }

  private async verifyMessage(
    signedMessage: string,
    senderPublicKey: string,
    data: string
  ): Promise<boolean> {
    try {
      const signature = Buffer.from(signedMessage, 'hex')
      const isValid = crypto.verify(null, Buffer.from(data), senderPublicKey, signature)
      return isValid
    } catch (err) {
      console.error('Error during message verification:', err)
      return false
    }
  }

  private async handleValidDevice(ip: string, device: IDevice): Promise<void> {
    if (DeviceCacheService.has(device.id)) {
      DeviceCacheService.ttl(device.id, DeviceCacheService.getTtl(device.id)!)
      return
    }

    DeviceCacheService.set(device.id, { ...device, ip })
    this.sendDeviceToRenderer(device)
    console.log(
      `Cached valid device: ID = ${device.id}, Device Name = ${device.name}, Operating System = ${device.os}`
    )
  }

  private sendDeviceToRenderer(device: IDevice): void {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((win) => {
      win.webContents.send('discover-device', device)
    })
  }

  private setupSocket(): void {
    this.socket.on('message', async (message, rinfo) => {
      try {
        const parsedMessage = JSON.parse(message.toString())
        const { signedMessage, publicKey, deviceName, os } = parsedMessage

        const isValid = await this.verifyMessage(
          signedMessage,
          publicKey,
          `${publicKey}:${deviceName}`
        )

        if (isValid) {
          const id = crypto
            .createHash('sha256')
            .update(publicKey + deviceName)
            .digest('hex')

          const device: IDevice = { id, name: deviceName, os }
          await this.handleValidDevice(rinfo.address, device)
        } else {
          console.log('Message signature verification failed.')
        }
      } catch (err) {
        console.error('Error processing incoming message:', err)
      }
    })

    this.socket.bind(this.port, () => {
      this.socket.setMulticastLoopback(false)
      this.socket.setBroadcast(true)

      console.log(`Socket bound to port ${this.port}`)
    })
  }

  private async announcePresence(): Promise<void> {
    const message = JSON.stringify({
      signedMessage: this.signedMessage,
      publicKey: this.publicKey,
      deviceName: this.deviceName,
      os: this.os
    })

    const sendMessage = () => {
      this.socket.send(message, 0, message.length, this.port, broadCastAddr, (err) => {
        if (err) console.error('Error sending announcement:', err)
      })
    }

    sendMessage()

    setInterval(sendMessage, announcePresencePeriod)
  }

  public async start(): Promise<void> {
    await this.loadOrCreateKeys()
    this.signedMessage = await this.signMessage(`${this.publicKey}:${this.deviceName}`)
    this.setupSocket()
    this.announcePresence()
  }
}

const networkDiscovery = new NetworkDiscoveryUDP()
export default networkDiscovery
