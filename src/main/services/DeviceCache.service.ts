import { CACHE_TTL } from '@/shared/constants'
import NodeCache from 'node-cache'

const DeviceCacheService = new NodeCache({ stdTTL: CACHE_TTL })

export default DeviceCacheService
