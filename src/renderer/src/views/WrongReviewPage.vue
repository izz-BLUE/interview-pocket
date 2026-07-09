<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'
import type { QuestionDetail, WrongQuestionSummary } from '../../../preload/index.d'

const router = useRouter()

const wrongQuestions = ref<WrongQuestionSummary[]>([])
const question = ref<QuestionDetail | null>(null)
const loading = ref(true)
const showAnswer = ref(false)
const reviewSubmitted = ref(false)
const submitResult = ref<any>(null)
const completed = ref(false)
const reviewedIds = ref(new Set<number>())
const activeTab = ref<'standard' | 'short' | 'deep'>('standard')

onMounted(async () => {
  await loadWrongQuestions()
})

async function loadWrongQuestions() {
  loading.value = true
  try {
    const result = await api.getWrongQuestions()
    if (result.success && result.data) {
      wrongQuestions.value = result.data
      // 过滤已复习的题目，取第一道
      const next = result.data.find((q) => !reviewedIds.value.has(q.id))
      if (next) {
        await loadQuestionById(next.id)
        completed.value = false
      } else {
        question.value = null
        completed.value = true
      }
    } else {
      wrongQuestions.value = []
      question.value = null
      completed.value = true
    }
  } catch (error) {
    console.error('Failed to load wrong questions:', error)
    wrongQuestions.value = []
    question.value = null
    completed.value = true
  } finally {
    loading.value = false
  }
}

async function loadQuestionById(id: number) {
  loading.value = true
  try {
    const result = await api.getQuestionById(id)
    if (result.success && result.data) {
      question.value = result.data
      resetQuestionState()
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

function resetQuestionState() {
  showAnswer.value = false
  reviewSubmitted.value = false
  activeTab.value = 'standard'
  submitResult.value = null
}

async function submitScore(score: number) {
  if (!question.value) return
  try {
    const result = await api.submitReview(question.value.id, score)
    if (result.success) {
      reviewSubmitted.value = true
      submitResult.value = result
      // 标记为已复习
      reviewedIds.value.add(question.value.id)
    }
  } catch (error) {
    console.error('Failed to submit review:', error)
  }
}

async function nextQuestion() {
  // 重新加载错题列表，过滤已复习的
  loading.value = true
  try {
    const result = await api.getWrongQuestions()
    if (result.success && result.data) {
      wrongQuestions.value = result.data
      const next = result.data.find((q) => !reviewedIds.value.has(q.id))
      if (next) {
        await loadQuestionById(next.id)
      } else {
        question.value = null
        completed.value = true
      }
    } else {
      question.value = null
      completed.value = true
    }
  } catch (error) {
    console.error('Failed to load next wrong question:', error)
    question.value = null
    completed.value = true
  } finally {
    loading.value = false
  }
}

async function markAsMastered() {
  if (!question.value) return
  try {
    const result = await api.resetWrongCount(question.value.id)
    if (result.success) {
      reviewedIds.value.add(question.value.id)
      await nextQuestion()
    }
  } catch (error) {
    console.error('Failed to reset wrong count:', error)
  }
}

// 获取当前题目的错题信息
function getWrongInfo(): WrongQuestionSummary | undefined {
  if (!question.value) return undefined
  return wrongQuestions.value.find((q) => q.id === question.value!.id)
}

// 解析 JSON 数组字符串，失败则返回 null
function parseJsonArray(str: string | null): string[] | null {
  if (!str) return null
  try {
    const parsed = JSON.parse(str)
    if (Array.isArray(parsed)) return parsed
    return null
  } catch {
    return null
  }
}
</script>

<template>
  <div class="wrong-review-container">
    <div class="page-header">
      <h2>🧯 错题复习</h2>
      <button class="back-btn" @click="router.push('/')">← 返回首页</button>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading">加载中...</div>

    <!-- 没有错题 / 复习完成 -->
    <div v-else-if="!question || completed" class="empty-state">
      <div class="empty-icon">🎉</div>
      <h3 v-if="reviewedIds.size > 0">本轮错题复习完成</h3>
      <h3 v-else>暂无错题</h3>
      <p v-if="reviewedIds.size > 0">你已复习了 {{ reviewedIds.size }} 道错题，继续保持！</p>
      <p v-else>所有题目掌握良好，没有需要重点复习的题目。</p>
      <div class="empty-actions">
        <button class="action-btn primary" @click="router.push('/')">返回首页</button>
        <button class="action-btn secondary" @click="router.push('/questions')">查看题库</button>
      </div>
    </div>

    <!-- 题目展示 -->
    <div v-else class="question-card">
      <!-- 题目信息 -->
      <div class="question-header">
        <h3 class="question-title">{{ question.title }}</h3>
        <div class="question-meta">
          <span v-if="question.source_file" class="meta-tag">📄 {{ question.source_file }}</span>
          <span v-if="question.category" class="meta-tag category">📁 {{ question.category }}</span>
        </div>
        <!-- 错题信息 -->
        <div class="wrong-info" v-if="getWrongInfo()">
          <span class="wrong-count">错题次数：{{ getWrongInfo()!.wrong_count }}</span>
          <span class="mastery-score">掌握度：{{ getWrongInfo()!.mastery_score }}%</span>
        </div>
      </div>

      <!-- 思考区域 -->
      <div class="think-area" v-if="!showAnswer">
        <p class="think-hint">💡 先思考一下这道题怎么回答...</p>
        <button class="action-btn primary" @click="showAnswer = true">显示答案</button>
      </div>

      <!-- 答案区域 -->
      <div v-if="showAnswer" class="answer-section">
        <!-- 答案 Tab -->
        <div class="answer-tabs">
          <button
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
        </div>

        <!-- 标准答案 -->
        <div v-if="activeTab === 'standard'" class="answer-content">
          <pre v-if="question.standard_answer" class="answer-text">{{ question.standard_answer }}</pre>
          <div v-else class="no-answer">暂无标准答案</div>
        </div>

        <!-- 简短回答 -->
        <div v-if="activeTab === 'short'" class="answer-content">
          <pre class="answer-text">{{ question.short_answer }}</pre>
        </div>

        <!-- 深入回答 -->
        <div v-if="activeTab === 'deep'" class="answer-content">
          <pre class="answer-text">{{ question.deep_answer }}</pre>
        </div>

        <!-- 记忆锚点 -->
        <div v-if="question.memory_point" class="memory-point">
          <h4>🎯 记忆锚点</h4>
          <pre class="answer-text">{{ question.memory_point }}</pre>
        </div>

        <!-- 追问点 -->
        <div v-if="question.follow_ups" class="follow-ups">
          <h4>❓ 可能追问</h4>
          <ul v-if="parseJsonArray(question.follow_ups)">
            <li v-for="(item, idx) in parseJsonArray(question.follow_ups)" :key="idx">{{ item }}</li>
          </ul>
          <pre v-else class="answer-text">{{ question.follow_ups }}</pre>
        </div>

        <!-- 注意事项 -->
        <div v-if="question.warnings" class="warnings">
          <h4>⚠️ 注意</h4>
          <ul v-if="parseJsonArray(question.warnings)">
            <li v-for="(item, idx) in parseJsonArray(question.warnings)" :key="idx">{{ item }}</li>
          </ul>
          <pre v-else class="answer-text">{{ question.warnings }}</pre>
        </div>
      </div>

      <!-- 评分区域 -->
      <div v-if="showAnswer && !reviewSubmitted" class="review-section">
        <h4>自评打分</h4>
        <div class="score-buttons">
          <button class="score-btn score-1" @click="submitScore(1)">1 - 完全不会</button>
          <button class="score-btn score-2" @click="submitScore(2)">2 - 大部分不会</button>
          <button class="score-btn score-3" @click="submitScore(3)">3 - 会一半</button>
          <button class="score-btn score-4" @click="submitScore(4)">4 - 基本会</button>
          <button class="score-btn score-5" @click="submitScore(5)">5 - 完全掌握</button>
        </div>
      </div>

      <!-- 评分完成 -->
      <div v-if="reviewSubmitted" class="submitted-section">
        <div class="submitted-message">
          <span class="success-icon">✅</span>
          评分已提交
          <span v-if="submitResult?.nextReviewTime">
            · 下次复习：{{ submitResult.nextReviewTime }}
          </span>
        </div>
        <div class="submitted-actions">
          <button class="action-btn primary" @click="nextQuestion">下一题</button>
          <button class="action-btn success" @click="markAsMastered">标记已掌握</button>
          <button class="action-btn secondary" @click="router.push('/')">返回首页</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrong-review-container {
  max-width: 800px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
}

.back-btn {
  background: none;
  border: 1px solid #d9d9d9;
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #555;
}

.back-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #999;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #333;
}

.empty-state p {
  color: #666;
  margin-bottom: 24px;
}

.empty-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.question-card {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}

.question-header {
  margin-bottom: 20px;
}

.question-title {
  margin: 0 0 12px 0;
  font-size: 18px;
  color: #333;
  line-height: 1.5;
}

.question-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.meta-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #f5f5f5;
  color: #666;
}

.meta-tag.category {
  background: #e6f7ff;
  color: #1890ff;
}

.wrong-info {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.wrong-count {
  font-size: 13px;
  color: #ff4d4f;
  font-weight: 500;
}

.mastery-score {
  font-size: 13px;
  color: #faad14;
  font-weight: 500;
}

.think-area {
  text-align: center;
  padding: 40px 20px;
  background: #fafafa;
  border-radius: 8px;
}

.think-hint {
  color: #666;
  margin-bottom: 20px;
}

.answer-section {
  margin-top: 20px;
}

.answer-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.tab-btn {
  background: none;
  border: 1px solid #d9d9d9;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #555;
}

.tab-btn.active {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}

.answer-content {
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;
  margin-bottom: 16px;
}

.answer-text {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  font-family: inherit;
  font-size: inherit;
  line-height: 1.7;
  color: #333;
}

.no-answer {
  color: #999;
  font-style: italic;
}

.follow-ups ul,
.warnings ul {
  margin: 0;
  padding-left: 20px;
}

.follow-ups li,
.warnings li {
  margin-bottom: 6px;
  line-height: 1.6;
}

.memory-point {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fffbe6;
  border-radius: 6px;
  border: 1px solid #ffe58f;
}

.memory-point h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.follow-ups {
  margin-top: 16px;
  padding: 12px 16px;
  background: #f6ffed;
  border-radius: 6px;
  border: 1px solid #b7eb8f;
}

.follow-ups h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.warnings {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fff2f0;
  border-radius: 6px;
  border: 1px solid #ffccc7;
}

.warnings h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.review-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.review-section h4 {
  margin: 0 0 12px 0;
  color: #333;
}

.score-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.score-btn {
  flex: 1;
  min-width: 100px;
  padding: 10px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #fff;
  transition: opacity 0.2s;
}

.score-btn:hover {
  opacity: 0.85;
}

.score-1 { background: #ff4d4f; }
.score-2 { background: #fa8c16; }
.score-3 { background: #fadb14; color: #333; }
.score-4 { background: #52c41a; }
.score-5 { background: #1890ff; }

.submitted-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.submitted-message {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  color: #52c41a;
  font-weight: 500;
}

.success-icon {
  font-size: 18px;
}

.submitted-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: opacity 0.2s;
}

.action-btn:hover {
  opacity: 0.85;
}

.action-btn.primary {
  background: #409eff;
  color: #fff;
}

.action-btn.secondary {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #d9d9d9;
}

.action-btn.success {
  background: #52c41a;
  color: #fff;
}
</style>
