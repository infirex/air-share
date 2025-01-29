import * as crypto from 'crypto'
import { Bonjour } from 'bonjour-service'
import * as fs from 'fs/promises'
import * as path from 'path'
import { promisify } from 'util'
import os from 'os'
import network from 'network'

type KeyPair = {
  privateKey: string
  publicKey: string
}

class NetworkDiscovery {
  private readonly keyFilePath: string
  private readonly bonjour: Bonjour
  private privateKey: string | null
  private publicKey: string | null
  private readonly deviceName: string
  private ipv4Addr: string
  private signedMessage: string | null

  constructor(keyFilePath: string = './keys.json') {
    this.keyFilePath = path.resolve(keyFilePath)
    this.bonjour = new Bonjour()
    this.privateKey = null
    this.publicKey = null
    this.signedMessage = null
    this.deviceName = os.userInfo().username
    this.ipv4Addr = '127.0.0.1'
  }

  private async getActiveHost(): Promise<string> {
    const getActiveInterface = promisify(network.get_active_interface)
    try {
      const activeInterface = await getActiveInterface()
      return activeInterface.ip_address
    } catch (error) {
      console.error('Failed to get active host IP:', error)
      throw new Error('Unable to determine active host IP address.')
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
      await fs.writeFile(this.keyFilePath, JSON.stringify({ privateKey, publicKey }), 'utf-8')
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
    if (!senderPublicKey) {
      console.error('Sender public key is missing.')
      return false
    }

    if (!signedMessage || !data) {
      console.error('Signed message or data is missing.')
      return false
    }

    try {
      const signature = Buffer.from(signedMessage, 'hex')
      const isValid = crypto.verify(null, Buffer.from(data), senderPublicKey, signature)
      return isValid
    } catch (err) {
      console.error('Error during message verification:', err)
      console.error('Signed Message:', signedMessage)
      console.error('Sender Public Key:', senderPublicKey)
      console.error('Data:', data)
      throw err
    }
  }

  private announcePresence(): void {
    console.log('Announcing presence on the local network...')

    this.bonjour.publish({
      name: this.deviceName,
      type: 'air-share',
      port: 12431,
      txt: {
        signedMessage: this.signedMessage!,
        publicKey: this.publicKey!,
        deviceName: this.deviceName,
        ipv4Addr: this.ipv4Addr
      }
    })

    this.bonjour.find({ type: 'air-share' }, (service) => {
      const txt = service.txt as Record<string, string>
      const { signedMessage, publicKey, deviceName, ipv4Addr } = txt

      // this.verifyMessage(signedMessage, publicKey, `${publicKey}:${deviceName}:${ipv4Addr}`)
      //   .then((isValid) => {
      //     if (isValid) {
      //       console.log(`Valid message received from device: ${deviceName} ${ipv4Addr}`)
      //     } else {
      //       console.log('Message signature verification failed.')
      //     }
      //   })
      //   .catch((err) => console.error('Error verifying message:', err))
    })
  }

  public async start(): Promise<void> {
    this.ipv4Addr = await this.getActiveHost()
    await this.loadOrCreateKeys()
    this.signedMessage = await this.signMessage(
      `${this.publicKey}:${this.deviceName}:${this.ipv4Addr}`
    )
    this.announcePresence()
  }
}

const networkDiscovery = new NetworkDiscovery()
// networkDiscovery.start();

export default networkDiscovery
