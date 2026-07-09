<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'
import type { ImportReport, QuestionSource, DeleteQuestionSourceResult } from '../../../preload/index.d'

const router = useRouter()
const importing = ref(false)
const errorResult = ref<string | null>(null)
const report = ref<ImportReport | null>(null)

const sources = ref<QuestionSource[]>([])
const loadingSources = ref(false)
const deletingSource = ref<string | null>(null)
const deleteResult = ref<DeleteQuestionSourceResult | null>(null)

onMounted(() => {
  loadSources()
})

async function handleImport() {
  importing.value = true
  errorResult.value = null
  report.value = null

  try {
    const response = await api.importMarkdownFile()
    if (response.success && response.report) {
      report.value = response.report
    } else if (!response.success) {
      errorResult.value = response.error || '导入失败'
    }
  } catch (error) {
    errorResult.value = String(error)
  } finally {
    importing.value = false
  }
}

function continueImport() {
  report.value = null
  errorResult.value = null
}

function viewSourceQuestions() {
  if (report.value) {
    router.push({ path: '/questions', query: { sourceFile: report.value.sourceFile } })
  }
}

async function loadSources() {
  loadingSources.value = true
  try {
    const result = await api.getQuestionSources()
    if (result.success && result.data) {
      sources.value = result.data
    }
  } finally {
    loadingSources.value = false
  }
}

async function deleteSource(sourceFile: string) {
  const source = sources.value.find(s => s.source_file === sourceFile)
  const count = source?.count ?? 0

  const confirmed = window.confirm(
    `确认删除题库来源「${sourceFile}」吗？\n\n将删除 ${count} 道题目，以及对应的复习记录和复习进度。\n此操作不可撤销。`
  )

  if (!confirmed) return

  deletingSource.value = sourceFile
  deleteResult.value = null
  errorResult.value = null

  try {
    const result = await api.deleteQuestionSource(sourceFile)
    if (result.success && result.data) {
      deleteResult.value = result.data
      await loadSources()
    } else {
      errorResult.value = result.error || '删除失败'
    }
  } finally {
    deletingSource.value = null
  }
}
</script>

<template>
  <div class="import-container">
    <h2>导入题目</h2>

    <!-- 导入报告 -->
    <div v-if="report" class="report-card">
      <h3>📋 导入报告</h3>

      <div class="report-section">
        <h4>基础统计</h4>
        <div class="stat-grid">
          <div class="stat-item">
            <span class="stat-label">来源文件</span>
            <span class="stat-value">{{ report.sourceFile }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">解析题目数</span>
            <span class="stat-value">{{ report.parsedCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">新增题目数</span>
            <span class="stat-value highlight">{{ report.insertedCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">重复跳过</span>
            <span class="stat-value" :class="{ warn: report.duplicatedCount > 0 }">{{ report.duplicatedCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">更新题目数</span>
            <span class="stat-value">{{ report.updatedCount }}</span>
          </div>
        </div>
      </div>

      <div class="report-section">
        <h4>答案解析统计</h4>
        <div class="stat-grid">
          <div class="stat-item">
            <span class="stat-label">标准答案</span>
            <span class="stat-value">{{ report.answerStats.standardAnswerCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">简短回答</span>
            <span class="stat-value">{{ report.answerStats.shortAnswerCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">深入回答</span>
            <span class="stat-value">{{ report.answerStats.deepAnswerCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">记忆锚点</span>
            <span class="stat-value">{{ report.answerStats.memoryPointCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">追问点</span>
            <span class="stat-value">{{ report.answerStats.followUpCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">注意/禁忌</span>
            <span class="stat-value">{{ report.answerStats.warningCount }}</span>
          </div>
        </div>
      </div>

      <div v-if="report.noAnswerQuestions.length > 0" class="report-section">
        <h4>⚠️ 疑似缺少答案的题目（{{ report.noAnswerQuestions.length }}）</h4>
        <ul class="issue-list">
          <li v-for="(q, idx) in report.noAnswerQuestions" :key="idx">
            <span class="issue-title">{{ q.title }}</span>
            <span v-if="q.category" class="issue-category">{{ q.category }}</span>
          </li>
        </ul>
      </div>

      <div v-if="report.duplicatedQuestions.length > 0" class="report-section">
        <h4>🔄 重复跳过的题目（{{ report.duplicatedCount }}）</h4>
        <ul class="issue-list">
          <li v-for="(q, idx) in report.duplicatedQuestions" :key="idx">
            <span class="issue-title">{{ q.title }}</span>
            <span v-if="q.category" class="issue-category">{{ q.category }}</span>
          </li>
        </ul>
      </div>

      <div class="report-actions">
        <button class="action-btn primary" @click="viewSourceQuestions">查看该来源题目</button>
        <button class="action-btn secondary" @click="continueImport">继续导入</button>
        <button class="action-btn secondary" @click="router.push('/')">返回首页</button>
      </div>
    </div>

    <!-- 导入区域 -->
    <div v-else class="import-card">
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

      <div v-if="errorResult" class="result error">
        ❌ 导入失败：{{ errorResult }}
      </div>
    </div>

    <!-- 题库来源管理 -->
    <div class="source-section">
      <h3>📚 题库来源管理</h3>

      <div v-if="deleteResult" class="delete-report">
        <p class="delete-report-title">✅ 已删除来源：{{ deleteResult.sourceFile }}</p>
        <div class="delete-stats">
          <span>删除题目：{{ deleteResult.deletedQuestionCount }}</span>
          <span>删除复习记录：{{ deleteResult.deletedReviewRecordCount }}</span>
          <span>删除复习进度：{{ deleteResult.deletedProgressCount }}</span>
        </div>
      </div>

      <div v-if="errorResult" class="result error">
        ❌ {{ errorResult }}
      </div>

      <div v-if="loadingSources" class="source-loading">加载中...</div>

      <div v-else-if="sources.length === 0" class="source-empty">暂无题库来源。</div>

      <div v-else class="source-list">
        <div v-for="s in sources" :key="s.source_file" class="source-item">
          <div class="source-info">
            <span class="source-name">{{ s.source_file }}</span>
            <span class="source-count">{{ s.count }} 道题</span>
          </div>
          <button
            class="delete-btn"
            :disabled="deletingSource === s.source_file"
            @click="deleteSource(s.source_file)"
          >
            {{ deletingSource === s.source_file ? '删除中...' : '删除' }}
          </button>
        </div>
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

.result.error {
  background-color: #ffebee;
  color: #c62828;
}

/* 报告卡片 */
.report-card {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.report-card > h3 {
  font-size: 22px;
  color: #333;
  margin-bottom: 24px;
}

.report-section {
  margin-bottom: 24px;
}

.report-section h4 {
  font-size: 16px;
  color: #333;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background-color: #f9f9f9;
  border-radius: 8px;
}

.stat-label {
  font-size: 12px;
  color: #999;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.stat-value.highlight {
  color: #2e7d32;
}

.stat-value.warn {
  color: #e65100;
}

.issue-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.issue-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background-color: #f9f9f9;
  border-radius: 6px;
  margin-bottom: 6px;
  font-size: 14px;
}

.issue-title {
  flex: 1;
  color: #333;
}

.issue-category {
  font-size: 12px;
  color: #1976d2;
  background-color: #e3f2fd;
  padding: 2px 8px;
  border-radius: 4px;
}

.report-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.primary {
  background-color: #1976d2;
  color: #fff;
}

.action-btn.primary:hover {
  background-color: #1565c0;
}

.action-btn.secondary {
  background-color: #fff;
  color: #1976d2;
  border: 1px solid #1976d2;
}

.action-btn.secondary:hover {
  background-color: #e3f2fd;
}

/* 题库来源管理 */
.source-section {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.source-section h3 {
  margin-bottom: 16px;
  color: #333;
}

.source-loading,
.source-empty {
  color: #999;
  font-size: 14px;
  padding: 12px 0;
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.source-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: #f9f9f9;
  border-radius: 6px;
}

.source-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.source-name {
  font-size: 14px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-count {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

.delete-btn {
  padding: 6px 16px;
  background-color: #fff;
  color: #c62828;
  border: 1px solid #c62828;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.delete-btn:hover:not(:disabled) {
  background-color: #ffebee;
}

.delete-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.delete-report {
  background-color: #e8f5e9;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.delete-report-title {
  font-weight: 600;
  color: #2e7d32;
  margin-bottom: 8px;
}

.delete-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #555;
  flex-wrap: wrap;
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
