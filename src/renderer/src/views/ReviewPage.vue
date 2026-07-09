<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../api'
import type { QuestionDetail, QuestionReviewInfo } from '../../../preload/index.d'

const router = useRouter()
const route = useRoute()
const question = ref<QuestionDetail | null>(null)
const loading = ref(false)
const showAnswer = ref(false)
const reviewSubmitted = ref(false)
const completed = ref(false)
const submitResult = ref<any | null>(null)
const activeTab = ref<'standard' | 'short' | 'deep' | 'raw'>('standard')

// 复习记录
const reviewInfo = ref<QuestionReviewInfo | null>(null)
const loadingReviewInfo = ref(false)

// 本轮 session 统计
const sessionScores = ref<number[]>([])

// 本轮统计计算
const sessionStats = computed(() => {
  const scores = sessionScores.value
  if (scores.length === 0) return null
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  const max = Math.max(...scores)
  const min = Math.min(...scores)
  const lowCount = scores.filter(s => s <= 2).length
  const highCount = scores.filter(s => s >= 4).length
  return {
    count: scores.length,
    avg: Math.round(avg * 10) / 10,
    max,
    min,
    lowCount,
    highCount
  }
})

const scoreLabels: Record<number, string> = {
  1: '完全不会',
  2: '大部分不会',
  3: '会一半',
  4: '基本会',
  5: '完全掌握'
}

// 计算属性：是否有任何答案内容
const hasAnyAnswer = computed(() => {
  if (!question.value) return false
  return !!(
    question.value.standard_answer ||
    question.value.short_answer ||
    question.value.deep_answer ||
    question.value.memory_point ||
    question.value.raw_markdown
  )
})

// 计算属性：获取标准答案（带 fallback）
const standardAnswer = computed(() => {
  if (!question.value) return ''
  if (question.value.standard_answer) return question.value.standard_answer
  // fallback: 如果没有标准答案，但有 raw_markdown，提取除标题外的内容
  if (question.value.raw_markdown) {
    const lines = question.value.raw_markdown.split('\n')
    const contentLines = lines.filter(line => !line.trim().startsWith('#'))
    const content = contentLines.join('\n').trim()
    if (content.length > 10) return content
  }
  return ''
})

// 计算属性：是否有多个答案 tab
const hasMultipleTabs = computed(() => {
  if (!question.value) return false
  return !!(question.value.short_answer || question.value.deep_answer)
})

// 计算属性：是否显示原始内容 tab
const showRawTab = computed(() => {
  if (!question.value) return false
  // 如果没有标准答案，但有 raw_markdown，显示原始内容 tab
  return !standardAnswer.value && question.value.raw_markdown
})

onMounted(() => {
  loadInitialQuestion()
})

// 重置题目状态
function resetQuestionState() {
  showAnswer.value = false
  reviewSubmitted.value = false
  activeTab.value = 'standard'
  submitResult.value = null
  reviewInfo.value = null
}

// 根据 ID 加载题目
async function loadQuestionById(id: number) {
  loading.value = true
  try {
    const result = await api.getQuestionById(id)
    if (result.success && result.data) {
      question.value = result.data
      resetQuestionState()
      loadReviewInfo(id)
    } else {
      question.value = null
    }
  } catch (error) {
    console.error('Failed to load question:', error)
    question.value = null
  } finally {
    loading.value = false
  }
}

// 加载复习记录
async function loadReviewInfo(questionId: number) {
  loadingReviewInfo.value = true
  try {
    const result = await api.getQuestionReviewInfo(questionId)
    if (result.success && result.data) {
      reviewInfo.value = result.data
    }
  } catch (error) {
    console.error('Failed to load review info:', error)
  } finally {
    loadingReviewInfo.value = false
  }
}

// 加载第一道待复习题
async function loadFirstDueQuestion() {
  loading.value = true
  try {
    const result = await api.getDueQuestions()
    if (result.success && result.data && result.data.length > 0) {
      await loadQuestionById(result.data[0].id)
      completed.value = false
    } else {
      question.value = null
      completed.value = true
    }
  } catch (error) {
    console.error('Failed to load due questions:', error)
    question.value = null
    completed.value = true
  } finally {
    loading.value = false
  }
}

// 加载初始题目
async function loadInitialQuestion() {
  const id = Number(route.params.id)
  if (id && !isNaN(id)) {
    // 单题详情模式
    await loadQuestionById(id)
  } else {
    // 队列复习模式
    await loadFirstDueQuestion()
  }
}

function toggleAnswer() {
  showAnswer.value = !showAnswer.value
}

async function submitScore(score: number) {
  if (!question.value) return

  try {
    const result = await api.submitReview(question.value.id, score)
    if (result.success) {
      reviewSubmitted.value = true
      submitResult.value = result
      sessionScores.value.push(score)
    }
  } catch (error) {
    console.error('Failed to submit review:', error)
  }
}

async function nextQuestion() {
  await loadFirstDueQuestion()
}

// 解析 JSON 字段
function parseJsonField(field: string | null): string[] {
  if (!field) return []
  try {
    const parsed = JSON.parse(field)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}
</script>

<template>
  <div class="review-container">
    <button class="back-btn" @click="router.push('/')">← 返回首页</button>

    <div v-if="loading" class="loading">加载中...</div>

    <!-- 队列完成页 -->
    <div v-else-if="completed" class="completed-state">
      <div class="completed-card">
        <template v-if="sessionStats">
          <h2>🎉 本轮复习完成</h2>
          <div class="session-stats">
            <div class="session-stat-item">
              <span class="session-stat-value">{{ sessionStats.count }}</span>
              <span class="session-stat-label">复习题数</span>
            </div>
            <div class="session-stat-item">
              <span class="session-stat-value">{{ sessionStats.avg }}</span>
              <span class="session-stat-label">平均分</span>
            </div>
            <div class="session-stat-item">
              <span class="session-stat-value">{{ sessionStats.max }}</span>
              <span class="session-stat-label">最高分</span>
            </div>
            <div class="session-stat-item">
              <span class="session-stat-value">{{ sessionStats.min }}</span>
              <span class="session-stat-label">最低分</span>
            </div>
            <div class="session-stat-item">
              <span class="session-stat-value warn">{{ sessionStats.lowCount }}</span>
              <span class="session-stat-label">低分题数</span>
            </div>
            <div class="session-stat-item">
              <span class="session-stat-value good">{{ sessionStats.highCount }}</span>
              <span class="session-stat-label">掌握题数</span>
            </div>
          </div>
        </template>
        <template v-else>
          <h2>🎉 今日复习已完成</h2>
          <p>所有待复习题目都已复习完毕</p>
        </template>
        <div class="completed-actions">
          <button class="action-btn primary" @click="router.push('/')">返回首页</button>
          <button class="action-btn secondary" @click="router.push('/wrong-review')">查看错题</button>
          <button class="action-btn secondary" @click="router.push('/questions')">查看题库</button>
        </div>
      </div>
    </div>

    <div v-else-if="!question" class="error">题目不存在</div>

    <template v-else>
      <div class="question-card">
        <h2 class="question-title">{{ question.title }}</h2>

        <div class="question-meta">
          <span v-if="question.category" class="tag">{{ question.category }}</span>
          <span v-if="question.source_file" class="source">来源：{{ question.source_file }}</span>
        </div>

        <div v-if="question.memory_point" class="memory-point">
          <h4>💡 记忆锚点</h4>
          <p>{{ question.memory_point }}</p>
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
              v-if="question.short_answer"
              :class="['tab-btn', { active: activeTab === 'short' }]"
              @click="activeTab = 'short'"
            >
              简短回答
            </button>
            <button
              v-if="question.deep_answer"
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
            <div v-else-if="activeTab === 'short' && question.short_answer" class="answer-text">
              {{ question.short_answer }}
            </div>
            <div v-else-if="activeTab === 'deep' && question.deep_answer" class="answer-text">
              {{ question.deep_answer }}
            </div>
            <div v-else-if="activeTab === 'raw' && question.raw_markdown" class="answer-text raw-markdown">
              <div class="raw-label">原始 Markdown 内容：</div>
              {{ question.raw_markdown }}
            </div>
            <div v-else class="answer-text no-content">
              暂无答案内容
            </div>
          </div>

          <div v-if="parseJsonField(question.follow_ups).length > 0" class="follow-ups">
            <h4>🤔 可能追问</h4>
            <ul>
              <li v-for="(item, index) in parseJsonField(question.follow_ups)" :key="index">
                {{ item }}
              </li>
            </ul>
          </div>

          <div v-if="parseJsonField(question.warnings).length > 0" class="warnings">
            <h4>⚠️ 注意事项</h4>
            <ul>
              <li v-for="(item, index) in parseJsonField(question.warnings)" :key="index">
                {{ item }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 复习记录 -->
      <div class="review-info-card">
        <h3>📊 复习记录</h3>
        <div v-if="loadingReviewInfo" class="loading-small">加载中...</div>
        <template v-else-if="reviewInfo">
          <div v-if="reviewInfo.progress" class="progress-summary">
            <div class="progress-item">
              <span class="progress-label">复习次数</span>
              <span class="progress-value">{{ reviewInfo.progress.review_count }}</span>
            </div>
            <div class="progress-item">
              <span class="progress-label">错题次数</span>
              <span class="progress-value" :class="{ warn: reviewInfo.progress.wrong_count > 0 }">{{ reviewInfo.progress.wrong_count }}</span>
            </div>
            <div class="progress-item">
              <span class="progress-label">掌握度</span>
              <span class="progress-value">{{ reviewInfo.progress.mastery_score }}%</span>
            </div>
            <div class="progress-item">
              <span class="progress-label">最近复习</span>
              <span class="progress-value small">{{ formatDate(reviewInfo.progress.last_review_date) }}</span>
            </div>
            <div class="progress-item">
              <span class="progress-label">下次复习</span>
              <span class="progress-value small">{{ formatDate(reviewInfo.progress.next_review_date) }}</span>
            </div>
          </div>
          <div v-else class="no-records">暂无复习进度</div>

          <div v-if="reviewInfo.records.length > 0" class="records-list">
            <h4>历史记录</h4>
            <div v-for="r in reviewInfo.records" :key="r.id" class="record-item">
              <span class="record-date">{{ formatDate(r.review_date) }}</span>
              <span class="record-score" :class="{ low: r.score <= 2, high: r.score >= 4 }">
                {{ r.score }} - {{ scoreLabels[r.score] || '' }}
              </span>
            </div>
          </div>
          <div v-else class="no-records">暂无复习记录</div>
        </template>
        <div v-else class="no-records">暂无复习记录</div>
      </div>

      <div v-if="showAnswer && !reviewSubmitted" class="review-section">
        <h3>自评打分</h3>
        <p>请根据你的回答情况进行评分</p>
        <div class="score-buttons">
          <button class="score-btn bad" @click="submitScore(1)">1 - 完全不会</button>
          <button class="score-btn poor" @click="submitScore(2)">2 - 大部分不会</button>
          <button class="score-btn fair" @click="submitScore(3)">3 - 部分会</button>
          <button class="score-btn good" @click="submitScore(4)">4 - 大部分会</button>
          <button class="score-btn excellent" @click="submitScore(5)">5 - 完全掌握</button>
        </div>
      </div>

      <div v-if="reviewSubmitted" class="review-complete">
        <p>✅ 评分已提交</p>
        <p v-if="submitResult?.nextReviewAt" class="next-review-time">
          下次复习时间：{{ new Date(submitResult.nextReviewAt).toLocaleDateString() }}
        </p>
        <div class="review-complete-actions">
          <button class="next-btn" @click="nextQuestion">下一题</button>
          <button class="home-btn" @click="router.push('/')">返回首页</button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.review-container {
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

.loading,
.error {
  text-align: center;
  padding: 60px;
  color: #666;
}

.loading-small {
  text-align: center;
  padding: 20px;
  color: #666;
  font-size: 14px;
}

.completed-state {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

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
  margin-bottom: 16px;
}

.completed-card p {
  color: #666;
  margin-bottom: 32px;
}

/* 本轮统计 */
.session-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.session-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px;
  background-color: #f9f9f9;
  border-radius: 8px;
}

.session-stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #1976d2;
}

.session-stat-value.warn {
  color: #e65100;
}

.session-stat-value.good {
  color: #2e7d32;
}

.session-stat-label {
  font-size: 12px;
  color: #666;
}

.completed-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.action-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
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

/* 复习记录卡片 */
.review-info-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.review-info-card h3 {
  margin-bottom: 16px;
  color: #333;
}

.progress-summary {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.progress-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 6px;
}

.progress-label {
  font-size: 11px;
  color: #999;
}

.progress-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.progress-value.warn {
  color: #e65100;
}

.progress-value.small {
  font-size: 13px;
  font-weight: 400;
}

.records-list {
  margin-top: 12px;
}

.records-list h4 {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #f9f9f9;
  border-radius: 6px;
  margin-bottom: 4px;
  font-size: 13px;
}

.record-date {
  color: #666;
}

.record-score {
  font-weight: 500;
  color: #333;
}

.record-score.low {
  color: #e65100;
}

.record-score.high {
  color: #2e7d32;
}

.no-records {
  color: #999;
  font-size: 14px;
  text-align: center;
  padding: 16px;
}

.review-section {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.review-section h3 {
  margin-bottom: 8px;
  color: #333;
}

.review-section p {
  color: #666;
  margin-bottom: 24px;
}

.score-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.score-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px;
}

.score-btn:hover {
  transform: translateY(-2px);
}

.score-btn.bad {
  background-color: #ffcdd2;
  color: #c62828;
}

.score-btn.poor {
  background-color: #ffe0b2;
  color: #e65100;
}

.score-btn.fair {
  background-color: #fff9c4;
  color: #f57f17;
}

.score-btn.good {
  background-color: #c8e6c9;
  color: #2e7d32;
}

.score-btn.excellent {
  background-color: #a5d6a7;
  color: #1b5e20;
}

.review-complete {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.review-complete p {
  font-size: 18px;
  color: #2e7d32;
  margin-bottom: 12px;
}

.review-complete .next-review-time {
  font-size: 14px;
  color: #666;
  margin-bottom: 24px;
}

.review-complete-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.next-btn {
  padding: 12px 32px;
  background-color: #1976d2;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

.next-btn:hover {
  background-color: #1565c0;
}

.home-btn {
  padding: 12px 32px;
  background-color: #fff;
  color: #1976d2;
  border: 1px solid #1976d2;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

.home-btn:hover {
  background-color: #e3f2fd;
}
</style>
