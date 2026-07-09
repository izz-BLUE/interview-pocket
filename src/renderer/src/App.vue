<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app-container">
    <aside class="sidebar">
      <div class="logo">
        <h1>Interview Pocket</h1>
      </div>
      <nav class="nav-menu">
        <RouterLink to="/" class="nav-item">
          <span class="nav-icon">🏠</span>
          <span class="nav-text">首页</span>
        </RouterLink>
        <RouterLink to="/import" class="nav-item">
          <span class="nav-icon">📥</span>
          <span class="nav-text">导入</span>
        </RouterLink>
        <RouterLink to="/questions" class="nav-item">
          <span class="nav-icon">📝</span>
          <span class="nav-text">题库</span>
        </RouterLink>
      </nav>
    </aside>
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  background-color: #f5f5f5;
}

.sidebar {
  width: 200px;
  background-color: #fff;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.logo {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.logo h1 {
  font-size: 18px;
  color: #333;
  margin: 0;
}

.nav-menu {
  padding: 20px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: #666;
  text-decoration: none;
  transition: all 0.2s;
}

.nav-item:hover {
  background-color: #f5f5f5;
  color: #333;
}

.nav-item.router-link-active {
  background-color: #e3f2fd;
  color: #1976d2;
}

.nav-icon {
  margin-right: 10px;
  font-size: 18px;
}

.nav-text {
  font-size: 14px;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
</style>
