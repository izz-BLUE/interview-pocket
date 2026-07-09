import { contextBridge, ipcRenderer } from 'electron'

// 暴露给 renderer 的 API
const api = {
  // 导入 Markdown 文件
  importMarkdownFile: (filePath?: string) => {
    return ipcRenderer.invoke('importMarkdownFile', filePath)
  },

  // 获取题目列表
  listQuestions: (params?: { limit?: number; offset?: number }) => {
    return ipcRenderer.invoke('listQuestions', params)
  },

  // 搜索题目
  searchQuestions: (keyword: string) => {
    return ipcRenderer.invoke('searchQuestions', keyword)
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
