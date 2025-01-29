import { api } from '@/preload/index'

declare global {
  interface Window {
    api: typeof api
  }
}
