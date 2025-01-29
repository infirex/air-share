import * as crypto from 'crypto'
import mDNS from 'multicast-dns'
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
  private readonly mdns: mDNS.MulticastDNS
  private privateKey: string | null
  private publicKey: string | null
  private readonly deviceName: string
  private ipv4Addr: string
  private readonly castingName: string
  private signedMessage: string | null

  constructor(keyFilePath: string = './keys.json') {
    this.keyFilePath = path.resolve(keyFilePath)
    this.mdns = mDNS({ loopback: false })
    this.privateKey = null
    this.publicKey = null
    this.signedMessage = null
    this.deviceName = os.userInfo().username
    this.castingName = 'airShare.local'
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
      await fs.writeFile(this.keyFilePath, JSON.stringify({ privateKey, publicKey }))
      console.log('New key pair generated and saved.')
    }
  }

  private async signMessage(message: string): Promise<string> {
    if (!this.privateKey) throw new Error('Private key is not loaded.')
    const signature = crypto.sign(null, Buffer.from(message), this.privateKey)
    return signature.toString('hex')
  }

  private announcePresence(): void {
    console.log('Announcing presence on the local network...')

    this.mdns.on('query', (query) => {
      if (query.questions.some((q) => q.name === this.castingName && q.type === 'TXT')) {
        this.mdns.respond([
          {
            name: this.castingName,
            type: 'TXT',
            data: this.signedMessage! // İmza
          },
          {
            name: `${this.castingName}-data`,
            type: 'TXT',
            data: `${this.publicKey}:${this.deviceName}:${this.ipv4Addr}` // Veri
          }
        ])
      }
    })

    // Ağdaki diğer cihazları sorgula
    this.mdns.query([{ name: this.castingName, type: 'TXT' }])

    // Gelen mesajları dinle ve doğrula
    this.mdns.on('response', (response) => {
      const signatureRecord = response.answers.find(
        (a) => a.type === 'TXT' && a.name === this.castingName
      )
      const dataRecord = response.answers.find(
        (a) => a.type === 'TXT' && a.name === `${this.castingName}-data`
      )

      if (signatureRecord && dataRecord) {
        const signedMessage = signatureRecord.data.toString()
        const data = dataRecord.data.toString()
        const [senderPublicKey, deviceName, ipv4Addr] = data.split(':') // Public key'i ayıkla

        this.verifyMessage(signedMessage, senderPublicKey, data)
          .then((isValid) => {
            if (isValid) {
              console.log(`Valid message received from device: ${deviceName} ${ipv4Addr}`)
            } else {
              console.log('Message signature verification failed.')
            }
          })
          .catch((err) => console.error('Error verifying message:', err))
      }
    })
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
      return false
    }
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
// networkDiscovery.start()

export default networkDiscovery
