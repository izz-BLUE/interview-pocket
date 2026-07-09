<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../api'
import type { QuestionSource, QuestionSummary, SearchResult } from '../../../preload/index.d'

const router = useRouter()
const route = useRoute()
const questions = ref<(QuestionSummary | SearchResult)[]>([])
const loading = ref(true)
const searchKeyword = ref('')
const total = ref(0)
const isSearchMode = ref(false)

const sources = ref<QuestionSource[]>([])
const selectedSource = ref('ALL')

onMounted(async () => {
  // 从 query 参数读取来源筛选
  const querySource = route.query.sourceFile
  if (querySource && typeof querySource === 'string') {
    selectedSource.value = querySource
  }
  await loadSources()
  await loadQuestions()
})

async function loadSources() {
  try {
    const result = await api.getQuestionSources()
    if (result.success && result.data) {
      sources.value = result.data
    }
  } catch (error) {
    console.error('Failed to load sources:', error)
  }
}

async function loadQuestions() {
  loading.value = true
  isSearchMode.value = false
  const sourceFile = selectedSource.value === 'ALL' ? null : selectedSource.value
  try {
    const result = await api.listQuestions({ limit: 500, offset: 0, sourceFile })
    if (result.success && result.data) {
      questions.value = result.data
      total.value = result.total || 0
    }
  } catch (error) {
    console.error('Failed to load questions:', error)
  } finally {
    loading.value = false
  }
}

async function handleSearch() {
  if (!searchKeyword.value.trim()) {
    loadQuestions()
    return
  }

  loading.value = true
  isSearchMode.value = true
  const sourceFile = selectedSource.value === 'ALL' ? null : selectedSource.value
  try {
    const result = await api.searchQuestions(searchKeyword.value, { sourceFile })
    if (result.success && result.data) {
      questions.value = result.data
      total.value = result.data.length
    }
  } catch (error) {
    console.error('Search failed:', error)
  } finally {
    loading.value = false
  }
}

function onSourceChange() {
  if (searchKeyword.value.trim()) {
    handleSearch()
  } else {
    loadQuestions()
  }
}

function clearSearch() {
  searchKeyword.value = ''
  loadQuestions()
}

function goToReview(id: number) {
  router.push(`/review/${id}`)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    handleSearch()
  }
}

function isSearchResult(q: any): q is SearchResult {
  return 'matchField' in q
}

function getMatchFieldLabel(field: string): string {
  switch (field) {
    case 'title': return '标题'
    case 'memory_point': return '记忆锚点'
    case 'standard_answer': return '标准答案'
    case 'raw_markdown': return '原始内容'
    default: return field
  }
}

function getSourceLabel(): string {
  if (selectedSource.value === 'ALL') return '全部题库'
  return selectedSource.value
}

function getMasteryClass(score: number): string {
  if (score < 40) return 'low'
  if (score < 70) return 'medium'
  return 'high'
}
</script>

<template>
  <div class="question-list-container">
    <h2>题库</h2>

    <div class="search-bar">
      <input
        v-model="searchKeyword"
        type="text"
        placeholder="搜索题目..."
        @keydown="handleKeydown"
      />
      <button @click="handleSearch">搜索</button>
      <button v-if="isSearchMode" class="clear-btn" @click="clearSearch">清除</button>
    </div>

    <div class="source-filter">
      <label class="filter-label">来源筛选：</label>
      <select v-model="selectedSource" @change="onSourceChange" class="source-select">
        <option value="ALL">全部题库</option>
        <option v-for="s in sources" :key="s.source_file" :value="s.source_file">
          {{ s.source_file }}（{{ s.count }}）
        </option>
      </select>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else-if="questions.length === 0" class="empty">
      <p>{{ isSearchMode ? '未找到匹配的题目' : '当前筛选条件下暂无题目' }}</p>
      <button v-if="!isSearchMode" @click="router.push('/import')">去导入</button>
    </div>

    <div v-else class="question-list">
      <div class="list-header">
        <span>当前来源：{{ getSourceLabel() }}</span>
        <span>{{ isSearchMode ? `找到 ${total} 道相关题目` : `共 ${total} 道题` }}</span>
      </div>
      <div v-if="isSearchMode" class="search-limit-hint">
        搜索结果最多显示前 100 条。
      </div>

      <div
        v-for="q in questions"
        :key="q.id"
        class="question-item"
        @click="goToReview(q.id)"
      >
        <div class="question-title">{{ q.title }}</div>
        <div class="question-meta">
          <span v-if="q.category" class="tag">{{ q.category }}</span>
          <span v-if="q.source_file" class="source">{{ q.source_file }}</span>
        </div>

        <!-- 复习状态 -->
        <div class="review-status">
          <template v-if="(q.review_count ?? 0) > 0">
            <div class="mastery-bar-wrapper">
              <span class="mastery-label">掌握度</span>
              <div class="mastery-bar">
                <div
                  class="mastery-fill"
                  :class="getMasteryClass(q.mastery_score ?? 0)"
                  :style="{ width: (q.mastery_score ?? 0) + '%' }"
                ></div>
              </div>
              <span class="mastery-value">{{ q.mastery_score ?? 0 }}%</span>
            </div>
            <span class="status-tag">复习 {{ q.review_count ?? 0 }} 次</span>
            <span v-if="(q.wrong_count ?? 0) > 0" class="status-tag warn">错题 {{ q.wrong_count }}</span>
          </template>
          <span v-else class="status-tag empty">未复习</span>
        </div>

        <div v-if="isSearchResult(q)" class="match-info">
          <div class="match-tags">
            <span class="match-field">命中位置：{{ getMatchFieldLabel(q.matchField) }}</span>
            <span v-if="q.matchedTerms && q.matchedTerms.length > 0" class="matched-terms">
              命中词：{{ q.matchedTerms.join(', ') }}
            </span>
          </div>
          <span v-if="q.matchSnippet" class="match-snippet">{{ q.matchSnippet }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.question-list-container {
  max-width: 800px;
}

h2 {
  margin-bottom: 24px;
  color: #333;
}

.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.search-bar input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.search-bar input:focus {
  border-color: #1976d2;
}

.search-bar button {
  padding: 12px 24px;
  background-color: #1976d2;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-bar button:hover {
  background-color: #1565c0;
}

.clear-btn {
  background-color: #757575 !important;
}

.clear-btn:hover {
  background-color: #616161 !important;
}

.source-filter {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.filter-label {
  font-size: 14px;
  color: #666;
  white-space: nowrap;
}

.source-select {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  color: #333;
  background-color: #fff;
  outline: none;
  cursor: pointer;
}

.source-select:focus {
  border-color: #1976d2;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.empty {
  text-align: center;
  padding: 60px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty p {
  color: #666;
  margin-bottom: 16px;
}

.empty button {
  padding: 10px 20px;
  background-color: #1976d2;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.list-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  color: #666;
  font-size: 14px;
}

.search-limit-hint {
  font-size: 12px;
  color: #999;
  margin-bottom: 12px;
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.question-item {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.question-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.question-title {
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
}

.question-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  margin-bottom: 8px;
}

.tag {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 2px 8px;
  border-radius: 4px;
}

.source {
  color: #999;
}

/* 复习状态 */
.review-status {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
}

.mastery-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mastery-label {
  color: #999;
}

.mastery-bar {
  width: 60px;
  height: 6px;
  background-color: #eee;
  border-radius: 3px;
  overflow: hidden;
}

.mastery-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.mastery-fill.low {
  background-color: #e53935;
}

.mastery-fill.medium {
  background-color: #fb8c00;
}

.mastery-fill.high {
  background-color: #43a047;
}

.mastery-value {
  color: #666;
  min-width: 32px;
}

.status-tag {
  font-size: 11px;
  color: #666;
  background-color: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
}

.status-tag.warn {
  color: #e65100;
  background-color: #fff3e0;
}

.status-tag.empty {
  color: #999;
}

.match-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #eee;
}

.match-tags {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.match-field {
  font-size: 12px;
  color: #1976d2;
  font-weight: 500;
}

.matched-terms {
  font-size: 11px;
  color: #757575;
  background-color: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
}

.match-snippet {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
