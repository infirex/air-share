export interface IFileMetadata {
  fileName: string
  fileSize: number
  fileId: string
  batchId?: string
}

export interface IBatchMetadata {
  batchId: string
  totalFiles: number
  totalSize: number
}

export interface ITransferCallbacks {
  onFileProgress?: (fileId: string, progress: number) => void
  onTotalProgress?: (progress: number) => void
  onFileComplete?: (fileId: string) => void
  onError?: (fileId: string, error: Error) => void
}
