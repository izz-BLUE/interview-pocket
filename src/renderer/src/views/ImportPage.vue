<script setup lang="ts">
import { ref } from 'vue'
import api from '../api'

const importing = ref(false)
const result = ref<{ success: boolean; count?: number; error?: string } | null>(null)

async function handleImport() {
  importing.value = true
  result.value = null

  try {
    const response = await api.importMarkdownFile()
    result.value = response

    if (response.success) {
      // 导入成功后可以跳转到题目列表
      setTimeout(() => {
        result.value = null
      }, 3000)
    }
  } catch (error) {
    result.value = { success: false, error: String(error) }
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <div class="import-container">
    <h2>导入题目</h2>

    <div class="import-card">
      <div class="import-icon">📄</div>
      <h3>从 Markdown 文件导入</h3>
      <p>选择本地 Markdown 文件，系统将自动解析题目结构</p>

      <button
        class="import-btn"
        :disabled="importing"
        @click="handleImport"
      >
        {{ importing ? '导入中...' : '选择文件' }}
      </button>

      <div v-if="result" class="result" :class="{ success: result.success, error: !result.success }">
        <template v-if="result.success">
          ✅ 成功导入 {{ result.count }} 道题目
        </template>
        <template v-else>
          ❌ 导入失败：{{ result.error }}
        </template>
      </div>
    </div>

    <div class="tips">
      <h3>支持的格式</h3>
      <ul>
        <li>## P0-1. 2 分钟介绍 xxx</li>
        <li>## Q1. 如果 xxx？</li>
        <li>## J1. 60 秒介绍 xxx</li>
        <li>## B1. 为什么不 xxx？</li>
        <li>## 1.1 请用 2 分钟介绍 xxx</li>
      </ul>
      <h3>内容字段识别</h3>
      <ul>
        <li>### 推荐回答 / 参考回答 → 标准答案</li>
        <li>### 简短回答 → 简短答案</li>
        <li>### 深入回答 / 详细回答 → 深入答案</li>
        <li>### 核心句 / 一句话锚点 → 记忆锚点</li>
        <li>### 追问点 / 可能追问 → 追问列表</li>
        <li>### 注意 / 禁忌说法 / 不要说 → 注意事项</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.import-container {
  max-width: 800px;
}

h2 {
  margin-bottom: 24px;
  color: #333;
}

.import-card {
  background: #fff;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.import-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.import-card h3 {
  margin-bottom: 8px;
  color: #333;
}

.import-card p {
  color: #666;
  margin-bottom: 24px;
}

.import-btn {
  padding: 12px 32px;
  background-color: #1976d2;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.import-btn:hover:not(:disabled) {
  background-color: #1565c0;
}

.import-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.result {
  margin-top: 20px;
  padding: 12px;
  border-radius: 6px;
  font-size: 14px;
}

.result.success {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.result.error {
  background-color: #ffebee;
  color: #c62828;
}

.tips {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tips h3 {
  margin-bottom: 12px;
  color: #333;
}

.tips ul {
  list-style: none;
  padding: 0;
  margin-bottom: 20px;
}

.tips li {
  padding: 8px 0;
  color: #666;
  font-size: 14px;
  border-bottom: 1px solid #f0f0f0;
}

.tips li:last-child {
  border-bottom: none;
}
</style>
