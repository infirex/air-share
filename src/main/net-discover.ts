import { IDevice } from '@/shared/interfaces/IDevice'
import * as crypto from 'crypto'
import * as dgram from 'dgram'
import { BrowserWindow } from 'electron'
import * as fs from 'fs/promises'
import network from 'network'
import NodeCache from 'node-cache'
import os from 'os'
import * as path from 'path'
import { promisify } from 'util'

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
  private readonly validDevicesCache: NodeCache
  private readonly os: string

  constructor(keyFilePath: string = './keys.json', port: number = 13456) {
    this.keyFilePath = path.resolve(keyFilePath)
    this.privateKey = null
    this.publicKey = null
    this.signedMessage = null
    this.deviceName = os.userInfo().username
    this.port = port
    this.socket = dgram.createSocket({ type: 'udp4' })
    this.validDevicesCache = new NodeCache({ stdTTL: 3 })
    this.os = os.platform()
  }

  private getValidDevices(): IDevice[] {
    return this.validDevicesCache.keys().map(this.validDevicesCache.get) as IDevice[]
  }

  private async getActiveHost(): Promise<{ ip: string; multicastAddress: string }> {
    const getActiveInterface = promisify(network.get_active_interface)

    try {
      const { ip_address, netmask } = await getActiveInterface()

      if (!ip_address || !netmask) {
        throw new Error('Active interface information is incomplete.')
      }

      const ipParts = ip_address.split('.').map(Number)
      const netmaskParts = netmask.split('.').map(Number)

      const multicastParts = ipParts.map(
        (octet: number, i: number) => octet | (~netmaskParts[i] & 255)
      )
      const multicastAddress = multicastParts.join('.')

      return {
        ip: ip_address,
        multicastAddress
      }
    } catch (error) {
      console.error('Failed to get active host IP or multicast address:', error)
      throw new Error('Unable to determine active host IP or multicast address.')
    }
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
    if (this.validDevicesCache.has(ip)) return

    this.validDevicesCache.set(ip, device)
    console.log(
      `Cached valid device: IP = ${ip}, Device Name = ${device.name}, Operating System = ${device.os}`
    )
    this.sendDevicesToRenderer()
  }

  private sendDevicesToRenderer(): void {
    const devices = this.getValidDevices()
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((win) => {
      win.webContents.send('discover-device', devices)
    })
  }

  private setupSocket(): void {
    this.socket.on('message', async (message, rinfo) => {
      try {
        const parsedMessage = JSON.parse(message.toString())
        const { signedMessage, publicKey, deviceName } = parsedMessage

        const isValid = await this.verifyMessage(
          signedMessage,
          publicKey,
          `${publicKey}:${deviceName}`
        )

        if (isValid) {
          console.log(`Valid message received from device: ${deviceName} (${rinfo.address})`)
          const device: IDevice = { id: crypto.randomUUID(), name: deviceName, os: this.os }
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

    const sendMessage = () =>
      this.socket.send(message, 0, message.length, this.port, '255.255.255.255', (err) => {
        console.log('sent message')
        if (err) console.error('Error sending announcement:', err)
      })

    sendMessage()

    setInterval(sendMessage, 5 * 1000)
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
