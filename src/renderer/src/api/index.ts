import type { ElectronAPI } from '../../../preload/index.d'
import { mockApi } from './mock'

// 获取暴露的 API
function resolveApi(): ElectronAPI {
  if (window.api) return window.api
  if (import.meta.env.DEV) return mockApi
  throw new Error('Electron preload API is unavailable')
}

const api = resolveApi()

export default api
