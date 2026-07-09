<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'

const router = useRouter()
const stats = ref({
  total: 0,
  todayReviewed: 0,
  todayDue: 0
})
const loading = ref(true)

onMounted(async () => {
  try {
    const result = await api.getStats()
    if (result.success && result.data) {
      stats.value = result.data
    }
  } catch (error) {
    console.error('Failed to load stats:', error)
  } finally {
    loading.value = false
  }
})

function goToReview() {
  router.push('/questions')
}

function goToImport() {
  router.push('/import')
}
</script>

<template>
  <div class="home-container">
    <h2>首页</h2>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">总题数</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">{{ stats.todayDue }}</div>
        <div class="stat-label">今日待复习</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">{{ stats.todayReviewed }}</div>
        <div class="stat-label">今日已复习</div>
      </div>
    </div>

    <div class="quick-actions">
      <h3>快速操作</h3>
      <div class="action-buttons">
        <button class="action-btn primary" @click="goToReview">
          📚 开始复习
        </button>
        <button class="action-btn secondary" @click="goToImport">
          📥 导入题目
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  max-width: 800px;
}

h2 {
  margin-bottom: 24px;
  color: #333;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 36px;
  font-weight: bold;
  color: #1976d2;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.quick-actions h3 {
  margin-bottom: 16px;
  color: #333;
}

.action-buttons {
  display: flex;
  gap: 16px;
}

.action-btn {
  padding: 16px 32px;
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
</style>
