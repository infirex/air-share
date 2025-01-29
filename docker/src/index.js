const crypto = require('crypto')
const dgram = require('dgram')
const fs = require('fs/promises')
const network = require('network')
const NodeCache = require('node-cache')
const os = require('os')
const path = require('path')
const { promisify } = require('util')

class NetworkDiscoveryUDP {
  constructor(keyFilePath = './keys.json', port = 13456) {
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

  getValidDevices() {
    return this.validDevicesCache.keys().map((key) => this.validDevicesCache.get(key))
  }

  async getActiveHost() {
    const getActiveInterface = promisify(network.get_active_interface)

    try {
      const { ip_address, netmask } = await getActiveInterface()

      if (!ip_address || !netmask) {
        throw new Error('Active interface information is incomplete.')
      }

      const ipParts = ip_address.split('.').map(Number)
      const netmaskParts = netmask.split('.').map(Number)

      const multicastParts = ipParts.map((octet, i) => octet | (~netmaskParts[i] & 255))
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

  async loadOrCreateKeys() {
    try {
      const keys = await fs.readFile(this.keyFilePath, 'utf-8')
      const parsedKeys = JSON.parse(keys)
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

  async signMessage(message) {
    if (!this.privateKey) throw new Error('Private key is not loaded.')
    const signature = crypto.sign(null, Buffer.from(message), this.privateKey)
    return signature.toString('hex')
  }

  async verifyMessage(signedMessage, senderPublicKey, data) {
    try {
      const signature = Buffer.from(signedMessage, 'hex')
      const isValid = crypto.verify(null, Buffer.from(data), senderPublicKey, signature)
      return isValid
    } catch (err) {
      console.error('Error during message verification:', err)
      return false
    }
  }

  async handleValidDevice(ip, device) {
    if (this.validDevicesCache.has(ip)) return

    this.validDevicesCache.set(ip, device)
    console.log(
      `Cached valid device: IP = ${ip}, Device Name = ${device.name}, Operating System = ${device.os}`
    )
  }

  setupSocket() {
    this.socket.on('message', async (message, rinfo) => {
      try {
        if (rinfo.address === (await this.getActiveHost()).ip) return
        const parsedMessage = JSON.parse(message.toString())
        const { signedMessage, publicKey, deviceName } = parsedMessage

        const isValid = await this.verifyMessage(
          signedMessage,
          publicKey,
          `${publicKey}:${deviceName}`
        )

        if (isValid) {
          console.log(`Valid message received from device: ${deviceName} (${rinfo.address})`)
          const device = { id: crypto.randomUUID(), name: deviceName, os: this.os }
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

  async announcePresence() {
    const { multicastAddress } = await this.getActiveHost()
    const message = JSON.stringify({
      signedMessage: this.signedMessage,
      publicKey: this.publicKey,
      deviceName: this.deviceName,
      os: this.os
    })

    setInterval(() => {
      this.socket.send(message, 0, message.length, this.port, multicastAddress, (err) => {
        if (err) console.error('Error sending announcement:', err)
      })
    }, 1000)
  }

  async start() {
    await this.loadOrCreateKeys()
    this.signedMessage = await this.signMessage(`${this.publicKey}:${this.deviceName}`)
    this.setupSocket()
    this.announcePresence()
  }
}

const networkDiscovery = new NetworkDiscoveryUDP()
networkDiscovery.start()
