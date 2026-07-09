import { contextBridge, ipcRenderer } from 'electron'

// 暴露给 renderer 的 API
const api = {
  // 导入 Markdown 文件
  importMarkdownFile: (filePath?: string) => {
    return ipcRenderer.invoke('importMarkdownFile', filePath)
  },

  // 获取题目列表
  listQuestions: (params?: { limit?: number; offset?: number; sourceFile?: string | null; reviewStatus?: string }) => {
    return ipcRenderer.invoke('listQuestions', params)
  },

  // 搜索题目
  searchQuestions: (keyword: string, params?: { sourceFile?: string | null; reviewStatus?: string }) => {
    return ipcRenderer.invoke('searchQuestions', keyword, params)
  },

  // 根据 ID 获取题目详情
  getQuestionById: (id: number) => {
    return ipcRenderer.invoke('getQuestionById', id)
  },

  // 提交复习评分
  submitReview: (questionId: number, score: number) => {
    return ipcRenderer.invoke('submitReview', questionId, score)
  },

  // 获取统计数据
  getStats: () => {
    return ipcRenderer.invoke('getStats')
  },

  // 获取今日待复习题目
  getDueQuestions: () => {
    return ipcRenderer.invoke('getDueQuestions')
  },

  // 获取题库来源列表
  getQuestionSources: () => {
    return ipcRenderer.invoke('getQuestionSources')
  },

  // 获取突击模式题目列表
  getCramQuestions: (params?: { sourceFile?: string | null; limit?: number }) => {
    return ipcRenderer.invoke('getCramQuestions', params)
  },

  // 获取错题列表
  getWrongQuestions: () => {
    return ipcRenderer.invoke('getWrongQuestions')
  },

  // 重置错题计数
  resetWrongCount: (questionId: number) => {
    return ipcRenderer.invoke('resetWrongCount', questionId)
  },

  // 获取单题复习信息
  getQuestionReviewInfo: (questionId: number) => {
    return ipcRenderer.invoke('getQuestionReviewInfo', questionId)
  },

  // 删除题库来源
  deleteQuestionSource: (sourceFile: string) => {
    return ipcRenderer.invoke('deleteQuestionSource', sourceFile)
  }
}

// 使用 contextBridge 安全地暴露 API
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.api = api
}
