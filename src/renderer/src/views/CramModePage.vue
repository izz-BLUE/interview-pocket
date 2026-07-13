<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'
import type { QuestionSource, CramQuestionSummary, QuestionDetail } from '../../../preload/index.d'

const router = useRouter()

const sources = ref<QuestionSource[]>([])
const selectedSource = ref<string>('ALL')
const questions = ref<CramQuestionSummary[]>([])
const currentQuestion = ref<QuestionDetail | null>(null)
const currentIndex = ref(0)
const showAnswer = ref(false)
const started = ref(false)
const loading = ref(false)
const completed = ref(false)
const uncertainIds = ref<Set<number>>(new Set())
const uncertainOnlyMode = ref(false)
const activeTab = ref<'standard' | 'short' | 'deep' | 'raw'>('standard')

const totalQuestions = computed(() => questions.value.length)
const uncertainCount = computed(() => uncertainIds.value.size)
const currentCramQuestion = computed(() => questions.value[currentIndex.value] ?? null)
const isUncertain = computed(() => {
  const q = currentCramQuestion.value
  return q ? uncertainIds.value.has(q.id) : false
})

const hasAnyAnswer = computed(() => {
  if (!currentQuestion.value) return false
  return !!(
    currentQuestion.value.standard_answer ||
    currentQuestion.value.short_answer ||
    currentQuestion.value.deep_answer ||
    currentQuestion.value.memory_point ||
    currentQuestion.value.raw_markdown
  )
})

const standardAnswer = computed(() => {
  if (!currentQuestion.value) return ''
  if (currentQuestion.value.standard_answer) return currentQuestion.value.standard_answer
  if (currentQuestion.value.raw_markdown) {
    const lines = currentQuestion.value.raw_markdown.split('\n')
    const contentLines = lines.filter(line => !line.trim().startsWith('#'))
    const content = contentLines.join('\n').trim()
    if (content.length > 10) return content
  }
  return ''
})

const hasMultipleTabs = computed(() => {
  if (!currentQuestion.value) return false
  return !!(currentQuestion.value.short_answer || currentQuestion.value.deep_answer)
})

const showRawTab = computed(() => {
  if (!currentQuestion.value) return false
  return !standardAnswer.value && currentQuestion.value.raw_markdown
})

onMounted(() => {
  loadSources()
})

async function loadSources() {
  loading.value = true
  try {
    const result = await api.getQuestionSources()
    if (result.success && result.data) {
      sources.value = result.data
    }
  } catch (error) {
    console.error('Failed to load sources:', error)
  } finally {
    loading.value = false
  }
}

async function startCram() {
  loading.value = true
  try {
    const sourceFile = selectedSource.value === 'ALL' ? null : selectedSource.value
    const result = await api.getCramQuestions({ sourceFile })
    if (result.success && result.data && result.data.length > 0) {
      questions.value = result.data
      currentIndex.value = 0
      started.value = true
      completed.value = false
      uncertainOnlyMode.value = false
      await loadCurrentQuestion()
    } else {
      questions.value = []
      started.value = true
      completed.value = true
    }
  } catch (error) {
    console.error('Failed to load cram questions:', error)
  } finally {
    loading.value = false
  }
}

async function loadCurrentQuestion() {
  const q = currentCramQuestion.value
  if (!q) return
  loading.value = true
  try {
    const result = await api.getQuestionById(q.id)
    if (result.success && result.data) {
      currentQuestion.value = result.data
      showAnswer.value = false
      activeTab.value = 'standard'
    }
  } catch (error) {
    console.error('Failed to load question detail:', error)
  } finally {
    loading.value = false
  }
}

function toggleAnswer() {
  showAnswer.value = !showAnswer.value
}

function toggleUncertain() {
  const q = currentCramQuestion.value
  if (!q) return
  const newSet = new Set(uncertainIds.value)
  if (newSet.has(q.id)) {
    newSet.delete(q.id)
  } else {
    newSet.add(q.id)
  }
  uncertainIds.value = newSet
}

function goNext() {
  if (currentIndex.value >= questions.value.length - 1) {
    completed.value = true
    return
  }
  currentIndex.value++
  loadCurrentQuestion()
}

function reviewUncertain() {
  if (uncertainIds.value.size === 0) return
  questions.value = questions.value.filter(q => uncertainIds.value.has(q.id))
  uncertainOnlyMode.value = true
  currentIndex.value = 0
  completed.value = false
  loadCurrentQuestion()
}

function restart() {
  started.value = false
  completed.value = false
  questions.value = []
  currentQuestion.value = null
  currentIndex.value = 0
  uncertainIds.value = new Set()
  uncertainOnlyMode.value = false
}

function parseJsonField(field: string | null): string[] {
  if (!field) return []
  try {
    const parsed = JSON.parse(field)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
</script>

<template>
  <div class="cram-container">
    <button class="back-btn" @click="router.push('/')">← 返回首页</button>

    <!-- 选择阶段 -->
    <div v-if="!started" class="setup-section">
      <div class="setup-card">
        <h2>⚡ 面试前突击模式</h2>
        <p class="hint">该模式仅用于快速浏览，不会记录复习数据。</p>

        <div v-if="loading" class="loading">加载中...</div>

        <template v-else>
          <div class="source-select">
            <h3>选择题库来源</h3>
            <div class="source-list">
              <label class="source-item" :class="{ active: selectedSource === 'ALL' }">
                <input type="radio" v-model="selectedSource" value="ALL" />
                <span class="source-name">全部题库</span>
              </label>
              <label
                v-for="s in sources"
                :key="s.source_key"
                class="source-item"
                :class="{ active: selectedSource === s.source_key }"
              >
                <input type="radio" v-model="selectedSource" :value="s.source_key" />
                <span class="source-name">{{ s.display_name }}</span>
                <span class="source-count">{{ s.count }} 题</span>
              </label>
            </div>
          </div>

          <button class="start-btn" @click="startCram">开始突击</button>
        </template>
      </div>
    </div>

    <!-- 突击完成 -->
    <div v-else-if="completed" class="completed-section">
      <div class="completed-card">
        <h2>🎯 本轮突击完成</h2>
        <div class="stats">
          <div class="stat-item">
            <span class="stat-value">{{ totalQuestions }}</span>
            <span class="stat-label">总题数</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ uncertainCount }}</span>
            <span class="stat-label">不确定题数</span>
          </div>
        </div>
        <div class="completed-actions">
          <button
            class="action-btn primary"
            :disabled="uncertainCount === 0"
            @click="reviewUncertain"
          >
            复习不确定题 ({{ uncertainCount }})
          </button>
          <button class="action-btn secondary" @click="restart">重新开始</button>
          <button class="action-btn secondary" @click="router.push('/')">返回首页</button>
          <button class="action-btn secondary" @click="router.push('/questions')">查看题库</button>
        </div>
      </div>
    </div>

    <!-- 答题区 -->
    <template v-else>
      <div v-if="loading" class="loading">加载中...</div>

      <template v-else-if="currentQuestion">
        <div class="progress-bar">
          <span>第 {{ currentIndex + 1 }} / {{ totalQuestions }} 题</span>
          <span v-if="uncertainOnlyMode" class="uncertain-tag">仅不确定题</span>
          <span class="uncertain-count">不确定：{{ uncertainCount }}</span>
        </div>

        <div class="question-card">
          <h2 class="question-title">{{ currentQuestion.title }}</h2>

          <div class="question-meta">
            <span v-if="currentQuestion.category" class="tag">{{ currentQuestion.category }}</span>
            <span v-if="currentQuestion.source_file" class="source">来源：{{ currentQuestion.source_file }}</span>
          </div>

          <div v-if="currentQuestion.memory_point && showAnswer" class="memory-point">
            <h4>💡 记忆锚点</h4>
            <p>{{ currentQuestion.memory_point }}</p>
          </div>

          <button
            v-if="!showAnswer"
            class="show-answer-btn"
            @click="toggleAnswer"
          >
            显示答案
          </button>

          <div v-if="showAnswer" class="answer-section">
            <div v-if="hasMultipleTabs || showRawTab" class="answer-tabs">
              <button
                v-if="standardAnswer"
                :class="['tab-btn', { active: activeTab === 'standard' }]"
                @click="activeTab = 'standard'"
              >
                标准答案
              </button>
              <button
                v-if="currentQuestion.short_answer"
                :class="['tab-btn', { active: activeTab === 'short' }]"
                @click="activeTab = 'short'"
              >
                简短回答
              </button>
              <button
                v-if="currentQuestion.deep_answer"
                :class="['tab-btn', { active: activeTab === 'deep' }]"
                @click="activeTab = 'deep'"
              >
                深入回答
              </button>
              <button
                v-if="showRawTab"
                :class="['tab-btn', { active: activeTab === 'raw' }]"
                @click="activeTab = 'raw'"
              >
                原始内容
              </button>
            </div>

            <div class="answer-content">
              <div v-if="activeTab === 'standard' && standardAnswer" class="answer-text">
                {{ standardAnswer }}
              </div>
              <div v-else-if="activeTab === 'short' && currentQuestion.short_answer" class="answer-text">
                {{ currentQuestion.short_answer }}
              </div>
              <div v-else-if="activeTab === 'deep' && currentQuestion.deep_answer" class="answer-text">
                {{ currentQuestion.deep_answer }}
              </div>
              <div v-else-if="activeTab === 'raw' && currentQuestion.raw_markdown" class="answer-text raw-markdown">
                <div class="raw-label">原始 Markdown 内容：</div>
                {{ currentQuestion.raw_markdown }}
              </div>
              <div v-else class="answer-text no-content">
                暂无答案内容
              </div>
            </div>

            <div v-if="parseJsonField(currentQuestion.follow_ups).length > 0" class="follow-ups">
              <h4>🤔 可能追问</h4>
              <ul>
                <li v-for="(item, index) in parseJsonField(currentQuestion.follow_ups)" :key="index">
                  {{ item }}
                </li>
              </ul>
            </div>

            <div v-if="parseJsonField(currentQuestion.warnings).length > 0" class="warnings">
              <h4>⚠️ 注意事项</h4>
              <ul>
                <li v-for="(item, index) in parseJsonField(currentQuestion.warnings)" :key="index">
                  {{ item }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="action-bar">
          <button
            :class="['uncertain-btn', { active: isUncertain }]"
            @click="toggleUncertain"
          >
            {{ isUncertain ? '✓ 已标记不确定' : '❓ 标记不确定' }}
          </button>
          <button class="next-btn" @click="goNext">
            {{ currentIndex >= totalQuestions - 1 ? '完成突击' : '下一题 →' }}
          </button>
          <button class="home-btn" @click="router.push('/')">返回首页</button>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.cram-container {
  max-width: 800px;
}

.back-btn {
  padding: 8px 16px;
  background: none;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 20px;
  font-size: 14px;
  color: #666;
}

.back-btn:hover {
  background-color: #f5f5f5;
}

.loading {
  text-align: center;
  padding: 60px;
  color: #666;
}

/* 选择阶段 */
.setup-card {
  background: #fff;
  border-radius: 12px;
  padding: 48px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.setup-card h2 {
  font-size: 28px;
  color: #333;
  margin-bottom: 8px;
}

.hint {
  color: #999;
  font-size: 14px;
  margin-bottom: 32px;
}

.source-select {
  text-align: left;
  margin-bottom: 32px;
}

.source-select h3 {
  font-size: 16px;
  color: #333;
  margin-bottom: 16px;
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.source-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid #eee;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.source-item:hover {
  border-color: #1976d2;
  background-color: #f5f9ff;
}

.source-item.active {
  border-color: #1976d2;
  background-color: #e3f2fd;
}

.source-item input[type="radio"] {
  margin: 0;
}

.source-name {
  flex: 1;
  font-size: 15px;
  color: #333;
}

.source-count {
  font-size: 13px;
  color: #999;
}

.start-btn {
  padding: 14px 48px;
  background-color: #1976d2;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.start-btn:hover {
  background-color: #1565c0;
}

/* 完成阶段 */
.completed-card {
  background: #fff;
  border-radius: 12px;
  padding: 48px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.completed-card h2 {
  font-size: 28px;
  color: #2e7d32;
  margin-bottom: 24px;
}

.stats {
  display: flex;
  justify-content: center;
  gap: 48px;
  margin-bottom: 32px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 48px;
  font-weight: bold;
  color: #1976d2;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

.completed-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

/* 答题区 */
.progress-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 14px;
  color: #666;
}

.uncertain-tag {
  background-color: #fff3e0;
  color: #e65100;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.uncertain-count {
  color: #999;
}

.question-card {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.question-title {
  font-size: 24px;
  color: #333;
  margin-bottom: 16px;
  line-height: 1.4;
}

.question-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  font-size: 14px;
}

.tag {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 4px 12px;
  border-radius: 4px;
}

.source {
  color: #999;
}

.memory-point {
  background-color: #fff3e0;
  border-left: 4px solid #ff9800;
  padding: 16px;
  margin-bottom: 24px;
  border-radius: 0 8px 8px 0;
}

.memory-point h4 {
  margin-bottom: 8px;
  color: #e65100;
}

.memory-point p {
  color: #333;
  font-size: 16px;
}

.show-answer-btn {
  width: 100%;
  padding: 16px;
  background-color: #1976d2;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.show-answer-btn:hover {
  background-color: #1565c0;
}

.answer-section {
  margin-top: 24px;
}

.answer-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid #eee;
  padding-bottom: 12px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 8px 16px;
  background: none;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.2s;
}

.tab-btn.active {
  background-color: #1976d2;
  color: #fff;
  border-color: #1976d2;
}

.answer-content {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
}

.answer-text {
  font-size: 15px;
  line-height: 1.8;
  color: #333;
  white-space: pre-wrap;
}

.answer-text.raw-markdown {
  background-color: #f5f5f5;
  border: 1px dashed #ddd;
  padding: 16px;
  border-radius: 6px;
}

.raw-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
  font-style: italic;
}

.answer-text.no-content {
  color: #999;
  font-style: italic;
  text-align: center;
  padding: 20px;
}

.follow-ups,
.warnings {
  margin-bottom: 20px;
}

.follow-ups h4,
.warnings h4 {
  margin-bottom: 12px;
  color: #333;
}

.follow-ups ul,
.warnings ul {
  list-style: none;
  padding: 0;
}

.follow-ups li,
.warnings li {
  padding: 10px 16px;
  background-color: #f5f5f5;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #555;
}

/* 操作栏 */
.action-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.uncertain-btn {
  flex: 1;
  padding: 14px 20px;
  background-color: #fff3e0;
  color: #e65100;
  border: 1px solid #ffcc80;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.uncertain-btn:hover {
  background-color: #ffe0b2;
}

.uncertain-btn.active {
  background-color: #e65100;
  color: #fff;
  border-color: #e65100;
}

.next-btn {
  flex: 1;
  padding: 14px 20px;
  background-color: #1976d2;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.next-btn:hover {
  background-color: #1565c0;
}

.home-btn {
  padding: 14px 20px;
  background-color: #fff;
  color: #1976d2;
  border: 1px solid #1976d2;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
}

.home-btn:hover {
  background-color: #e3f2fd;
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

.action-btn.primary:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.action-btn.secondary {
  background-color: #fff;
  color: #1976d2;
  border: 1px solid #1976d2;
}

.action-btn.secondary:hover {
  background-color: #e3f2fd;
}
</style>
