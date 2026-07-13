import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase, closeDatabase } from './database'
import { registerIpcHandlers } from './ipc'
import { safeLog } from './logger'

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    try {
      const url = new URL(details.url)
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        void shell.openExternal(url.toString())
      }
    } catch {
      // 非法 URL 直接拒绝
    }
    return { action: 'deny' }
  })

  // 在开发模式下加载开发服务器，生产模式下加载打包后的文件
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// 应用启动
app.whenReady().then(async () => {
  // 设置应用用户模型 ID（Windows）
  electronApp.setAppUserModelId('com.interview-pocket')

  // 初始化数据库
  await initDatabase()

  // 注册 IPC 处理器
  registerIpcHandlers()

  // 创建窗口
  createWindow()

  // macOS 点击 dock 图标时重新创建窗口
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时退出（macOS 除外）
app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出前清理
app.on('before-quit', () => {
  closeDatabase()
})
