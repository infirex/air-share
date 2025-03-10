/**
 * Bidirectional WebSocket file transfer handler. Manages concurrent
 * send/receive operations with progress tracking and cancellation.
 * Features: Stream-based chunking, UUID tracking, batch
 * transfers, automatic reconnection. Operates as both client
 * and server simultaneously.
 */
import { PORT } from '@/shared/constants'
import {
  IBatchMetadata,
  IFileMetadata,
  INewTransfer,
  ITransferCallbacks
} from '@/shared/interfaces/ITransfer'
import fs from 'fs'
import http from 'http'
import path from 'path'
import { Server } from 'socket.io'
import { Socket, io } from 'socket.io-client'
import { Transform } from 'stream'
import { pipeline } from 'stream/promises'
import DeviceListService from './DeviceList.service'
import { app } from 'electron'

export class FileTransfer {
  private socket: Socket | null = null
  private server: http.Server | null = null
  private ioServer: Server | null = null
  private readonly activeTransfers = new Map<string, AbortController>()
  private readonly batchProgress = new Map<string, { sent: number; total: number }>()
  private readonly port: number = PORT

  async setSocket(deviceIP: string, port: number = PORT): Promise<boolean> {
    return new Promise((resolve) => {
      this.socket = io(`http://${deviceIP}:${port}`, {
        reconnectionAttempts: 3,
        timeout: 5000
      })

      this.socket.on('connect', () => {
        console.log(`Connected to ${deviceIP}`)
        resolve(true)
      })

      this.socket.on('connect_error', (err) => {
        console.error(`Connection error: ${err.message}`)
        resolve(false)
      })

      this.socket.on('disconnect', () => {
        console.warn(`Disconnected from ${deviceIP}`)
      })
    })
  }

  // RECEIVER SETUP
  startReceiver(
    onConnectionRequest: (
      newTransfer: INewTransfer,
      approveCallback: (
        approved: boolean,
        folderPath?: string,
        progressCb?: (progress: number) => void
      ) => void
    ) => void
  ) {
    this.server = http.createServer()
    this.ioServer = new Server(this.server)

    this.ioServer.on('connection', (socket) => {
      socket.on('batch-start', ({ batchId, files }: IBatchMetadata) => {
        const deviceID = [...DeviceListService].find(
          ([_, v]) => v === socket.conn.remoteAddress.split('::ffff:')[1]
        )?.[0]

        if (!deviceID) {
          console.error('Device not found')
          return
        }

        onConnectionRequest(
          { socketID: socket.id, deviceID, files },
          (approved, folderPath, progressCb) => {
            if (!approved) {
              console.log(`Connection rejected: ${socket.id}`)
              socket.emit('transfer-approve', batchId, false)
              return
            }

            socket.emit('transfer-approve', batchId, true)

            const activeFiles = new Map<string, fs.WriteStream>()

            const totalSize = files.reduce((acc, curr) => acc + curr.size, 0)
            let transferredSize = 0

            socket.on('file-metadata', ({ fileId, fileName }: IFileMetadata) => {
              const downloadsDir = path.join(folderPath ?? app.getPath('downloads'))
              if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir)

              const writeStream = fs.createWriteStream(path.join(downloadsDir, fileName))
              activeFiles.set(fileId, writeStream)
            })

            socket.on('file-chunk', async ({ fileId, chunk }, callback) => {
              const writeStream = activeFiles.get(fileId)
              if (!writeStream) return callback({ status: 'error' })

              try {
                writeStream.write(chunk)
                transferredSize += chunk.length

                const progress = (transferredSize / totalSize) * 100
                if (progressCb) progressCb(progress)

                callback({ status: 'received' })
              } catch (error) {
                callback({ status: 'error', message: (error as Error).message })
              }
            })

            socket.on('file-end', ({ fileId }) => {
              activeFiles.get(fileId)?.end(() => activeFiles.delete(fileId))
            })

            socket.on('disconnect', () => {
              activeFiles.forEach((stream) => stream.destroy())
            })
          }
        )
      })
    })

    this.server.listen(this.port, () => {
      console.log(`Receiver listening on port ${this.port}`)
    })
  }

  // FILE TRANSFER METHODS
  private async sendFile(
    filePath: string,
    callbacks?: ITransferCallbacks,
    batchId?: string
  ): Promise<string> {
    if (!this.socket?.connected) throw new Error('Connection not established')

    const fileId = crypto.randomUUID()
    const fileSize = fs.statSync(filePath).size
    const abortController = new AbortController()

    this.activeTransfers.set(fileId, abortController)
    this.socket.emit('file-metadata', {
      fileName: path.basename(filePath),
      fileSize,
      fileId,
      batchId
    })

    try {
      await pipeline(
        fs.createReadStream(filePath, { highWaterMark: 256 * 1024 }),
        this.createChunkTransformer(fileId, fileSize, callbacks),
        async function* (source) {
          for await (const _chunk of source) {
            // Gelen veriyi kullanmaya gerek yok; sadece akışın tamamlanmasını sağlıyoruz.
          }
        },
        { signal: abortController.signal }
      )

      this.socket.emit('file-end', { fileId })
      callbacks?.onFileComplete?.(fileId)
      return fileId
    } catch (error) {
      callbacks?.onError?.(fileId, error as Error)
      throw error
    } finally {
      this.activeTransfers.delete(fileId)
      this.updateBatchProgress(batchId, fileSize)
    }
  }

  async sendFiles(filePaths: string[], callbacks?: ITransferCallbacks) {
    if (!this.socket?.connected) throw new Error('Connection not established')

    const batchId = crypto.randomUUID()
    const files = filePaths.map((filePath) => ({
      name: path.basename(filePath),
      size: fs.statSync(filePath).size
    }))

    this.socket.emit('batch-start', { batchId, files } as IBatchMetadata)

    this.socket.once('transfer-approve', async (sentBatchID, approved) => {
      if (sentBatchID === batchId) {
        if (approved) {
          const results = []
          for (const filePath of filePaths) {
            try {
              const fileId = await this.sendFile(
                filePath,
                {
                  onFileProgress: callbacks?.onFileProgress,
                  onError: callbacks?.onError
                },
                batchId
              )
              results.push(fileId)
            } catch (error) {
              console.error(`Error sending ${path.basename(filePath)}:`, error)
            }
          }

          return results
        } else return
      }
    })
  }

  // HELPER METHODS
  private createChunkTransformer(
    fileId: string,
    fileSize: number,
    callbacks?: ITransferCallbacks
  ): Transform {
    let sentBytes = 0

    return new Transform({
      objectMode: true,
      transform: async (chunk, encoding, callback) => {
        try {
          await this.socket!.emitWithAck('file-chunk', { fileId, chunk })
          sentBytes += chunk.length

          const progress = (sentBytes / fileSize) * 100
          callbacks?.onFileProgress?.(fileId, progress)
          callback(null, chunk)
        } catch (error) {
          callback(error as Error)
        }
      }
    })
  }

  private updateBatchProgress(batchId?: string, fileSize: number = 0): void {
    if (!batchId) return

    const batch = this.batchProgress.get(batchId)
    if (batch) {
      batch.sent += fileSize
      const progress = (batch.sent / batch.total) * 100
      this.socket!.emit('batch-progress', { batchId, progress })
    }
  }

  cancelTransfer(fileId: string): void {
    this.activeTransfers.get(fileId)?.abort()
    this.activeTransfers.delete(fileId)
  }

  disconnect(): void {
    this.socket?.disconnect()
    this.ioServer?.close()
    this.server?.close()
  }
}

const fileTransferService = new FileTransfer()
export default fileTransferService
