export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const size = sizes[i]

  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))
  return `${value} ${size}`
}
