import { cacheTTL } from '@/shared/constants'
import NodeCache from 'node-cache'

const DeviceCacheService = new NodeCache({ stdTTL: cacheTTL })

export default DeviceCacheService
