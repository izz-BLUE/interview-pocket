<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'

const router = useRouter()
const stats = ref({
  total: 0,
  todayReviewed: 0,
  todayDue: 0,
  reviewedTotal: 0,
  unreviewedTotal: 0,
  wrongQuestionCount: 0,
  lowMasteryCount: 0,
  avgMasteryReviewed: 0
})
const loading = ref(true)
const reviewProgress = computed(() => {
  if (stats.value.total === 0) return 0
  return Math.round((stats.value.reviewedTotal / stats.value.total) * 100)
})

onMounted(async () => {
  try {
    const result = await api.getStats()
    if (result.success && result.data) {
      stats.value = result.data as any
    }
  } catch (error) {
    console.error('Failed to load stats:', error)
  } finally {
    loading.value = false
  }
})

function goToReview() {
  router.push('/review')
}

function goToImport() {
  router.push('/import')
}
</script>

<template>
  <div class="home-container">
    <section class="hero-panel">
      <div class="hero-copy">
        <span class="eyebrow">INTERVIEW WORKSPACE</span>
        <h1>今天也离理想 Offer 更近一步</h1>
        <p>用清晰的节奏复习重点、回看错题，把每一次练习都沉淀成掌握度。</p>
      </div>
      <button class="hero-action" @click="goToReview">
        <span>开始今日复习</span>
        <span class="arrow">→</span>
      </button>
    </section>

    <div v-if="loading" class="loading-card">
      <span class="loading-spinner"></span>
      <span>正在整理你的复习进度...</span>
    </div>

    <template v-else>
      <section class="overview-section">
        <div class="section-heading">
          <div>
            <span class="section-kicker">今日概览</span>
            <h2>复习仪表盘</h2>
          </div>
          <span class="date-badge">数据实时保存在本地</span>
        </div>

        <div class="primary-grid">
          <article class="metric-card indigo">
            <div class="metric-top"><span class="metric-icon">⌁</span><span>题库规模</span></div>
            <strong>{{ stats.total }}</strong>
            <p>已收录的面试题目</p>
          </article>

          <article class="metric-card amber">
            <div class="metric-top"><span class="metric-icon">◷</span><span>待办任务</span></div>
            <strong>{{ stats.todayDue }}</strong>
            <p>今日待复习题目</p>
          </article>

          <article class="metric-card emerald">
            <div class="metric-top"><span class="metric-icon">✓</span><span>今日进度</span></div>
            <strong>{{ stats.todayReviewed }}</strong>
            <p>今天已经完成复习</p>
          </article>
        </div>

        <div class="insight-grid">
          <article class="progress-card">
            <div class="progress-header">
              <div>
                <span>整体复习进度</span>
                <strong>{{ reviewProgress }}%</strong>
              </div>
              <span>{{ stats.reviewedTotal }} / {{ stats.total }} 题</span>
            </div>
            <div class="progress-track"><div class="progress-fill" :style="{ width: reviewProgress + '%' }"></div></div>
            <div class="progress-meta">
              <span><i class="dot success"></i>已复习 {{ stats.reviewedTotal }}</span>
              <span><i class="dot neutral"></i>未复习 {{ stats.unreviewedTotal }}</span>
            </div>
          </article>

          <article class="mastery-card">
            <div class="mastery-score">
              <span>平均掌握度</span>
              <strong>{{ stats.avgMasteryReviewed }}<small>%</small></strong>
            </div>
            <div class="mastery-details">
              <span :class="{ alert: stats.wrongQuestionCount > 0 }">错题 <b>{{ stats.wrongQuestionCount }}</b></span>
              <span :class="{ alert: stats.lowMasteryCount > 0 }">低掌握 <b>{{ stats.lowMasteryCount }}</b></span>
            </div>
          </article>
        </div>
      </section>
    </template>

    <section class="quick-actions">
      <div class="section-heading compact">
        <div><span class="section-kicker">快速开始</span><h2>选择复习方式</h2></div>
      </div>
      <div class="action-grid">
        <button class="action-card primary" @click="goToReview">
          <span class="action-icon">▤</span>
          <span class="action-copy"><strong>今日复习</strong><small>按照间隔计划逐题巩固</small></span>
          <span class="action-arrow">→</span>
        </button>
        <button class="action-card" @click="router.push('/wrong-review')">
          <span class="action-icon danger">!</span>
          <span class="action-copy"><strong>错题复习</strong><small>集中突破尚未掌握的题目</small></span>
          <span class="action-arrow">→</span>
        </button>
        <button class="action-card" @click="router.push('/cram')">
          <span class="action-icon warning">ϟ</span>
          <span class="action-copy"><strong>突击模式</strong><small>面试前快速浏览核心题目</small></span>
          <span class="action-arrow">→</span>
        </button>
        <button class="action-card" @click="goToImport">
          <span class="action-icon success">↓</span>
          <span class="action-copy"><strong>导入题库</strong><small>从 Markdown 扩充复习内容</small></span>
          <span class="action-arrow">→</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  gap: 34px;
}

.hero-panel {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  overflow: hidden;
  padding: 34px 36px;
  color: #fff;
  background: linear-gradient(118deg, #4338ca 0%, #5b55e7 58%, #7c6cf2 100%);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}

.hero-panel::after {
  position: absolute;
  top: -90px;
  right: -45px;
  width: 260px;
  height: 260px;
  content: "";
  border: 45px solid rgba(255, 255, 255, 0.07);
  border-radius: 50%;
}

.hero-copy {
  position: relative;
  z-index: 1;
  max-width: 680px;
}

.eyebrow,
.section-kicker {
  display: block;
  margin-bottom: 8px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.eyebrow { color: #c7d2fe; }
.section-kicker { color: var(--color-primary); }

.hero-copy h1 {
  margin: 0 0 12px;
  font-size: clamp(26px, 3vw, 38px);
  line-height: 1.18;
  letter-spacing: -0.035em;
}

.hero-copy p {
  max-width: 620px;
  margin: 0;
  color: #e0e7ff;
  font-size: 14px;
  line-height: 1.75;
}

.hero-action {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 16px;
  padding: 13px 17px 13px 20px;
  color: #3730a3;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  background: #fff;
  border: 0;
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(30, 27, 75, 0.22);
  transition: transform 160ms ease, box-shadow 160ms ease;
}

.hero-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 34px rgba(30, 27, 75, 0.28);
}

.arrow,
.action-arrow { font-size: 18px; }

.loading-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 180px;
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-primary-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.overview-section,
.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.section-heading h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 22px;
  letter-spacing: -0.02em;
}

.date-badge {
  padding: 7px 11px;
  color: var(--color-text-muted);
  font-size: 11px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 999px;
}

.primary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.metric-card {
  padding: 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.metric-top {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
}

.metric-icon {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 9px;
}

.indigo .metric-icon { color: #4f46e5; background: #eef2ff; }
.amber .metric-icon { color: #d97706; background: #fffbeb; }
.emerald .metric-icon { color: #059669; background: #ecfdf5; }

.metric-card strong {
  display: block;
  margin: 17px 0 3px;
  color: var(--color-text);
  font-size: 30px;
  line-height: 1;
  letter-spacing: -0.04em;
}

.metric-card p {
  margin: 0;
  color: var(--color-text-subtle);
  font-size: 11px;
}

.insight-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(240px, 0.75fr);
  gap: 14px;
}

.progress-card,
.mastery-card {
  padding: 22px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.progress-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 18px;
  color: var(--color-text-subtle);
  font-size: 11px;
}

.progress-header > div { display: flex; align-items: baseline; gap: 12px; }
.progress-header strong { color: var(--color-text); font-size: 24px; }
.progress-track { overflow: hidden; height: 8px; background: #edf0f5; border-radius: 99px; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #4f46e5, #818cf8); border-radius: inherit; transition: width 400ms ease; }
.progress-meta { display: flex; gap: 20px; margin-top: 14px; color: var(--color-text-muted); font-size: 11px; }
.dot { display: inline-block; width: 7px; height: 7px; margin-right: 6px; border-radius: 50%; }
.dot.success { background: #6366f1; }
.dot.neutral { background: #d0d5dd; }

.mastery-card { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.mastery-score { display: flex; flex-direction: column; gap: 8px; color: var(--color-text-muted); font-size: 11px; }
.mastery-score strong { color: var(--color-primary); font-size: 32px; letter-spacing: -0.04em; }
.mastery-score small { font-size: 15px; }
.mastery-details { display: flex; flex-direction: column; gap: 9px; }
.mastery-details span { min-width: 90px; padding: 8px 10px; color: var(--color-text-muted); font-size: 11px; background: var(--color-surface-muted); border-radius: 9px; }
.mastery-details span b { float: right; color: var(--color-text); }
.mastery-details span.alert { color: var(--color-warning); background: var(--color-warning-soft); }

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.action-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 16px;
  text-align: left;
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.action-card:hover { transform: translateY(-2px); border-color: var(--color-primary-border); box-shadow: var(--shadow-md); }
.action-icon { display: grid; width: 38px; height: 38px; place-items: center; color: var(--color-primary); font-weight: 800; background: var(--color-primary-soft); border-radius: 11px; }
.action-icon.danger { color: var(--color-danger); background: var(--color-danger-soft); }
.action-icon.warning { color: var(--color-warning); background: var(--color-warning-soft); }
.action-icon.success { color: var(--color-success); background: var(--color-success-soft); }
.action-copy { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.action-copy strong { color: var(--color-text); font-size: 13px; }
.action-copy small { overflow: hidden; color: var(--color-text-subtle); font-size: 10px; white-space: nowrap; text-overflow: ellipsis; }
.action-arrow { color: var(--color-text-subtle); transition: transform 160ms ease; }
.action-card:hover .action-arrow { color: var(--color-primary); transform: translateX(3px); }

@media (max-width: 900px) {
  .hero-panel { align-items: flex-start; flex-direction: column; }
  .primary-grid { grid-template-columns: repeat(3, minmax(150px, 1fr)); }
  .insight-grid { grid-template-columns: 1fr; }
}
</style>
