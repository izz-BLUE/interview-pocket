<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

const primaryNav = [
  { to: '/', label: '首页', icon: 'home' },
  { to: '/questions', label: '题库', icon: 'library' },
  { to: '/import', label: '导入', icon: 'import' }
]

const reviewNav = [
  { to: '/review', label: '今日复习', icon: 'review' },
  { to: '/wrong-review', label: '错题复习', icon: 'wrong' },
  { to: '/cram', label: '突击模式', icon: 'bolt' }
]
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">IP</div>
        <div class="brand-copy">
          <strong>Interview Pocket</strong>
          <span>面试复习工作台</span>
        </div>
      </div>

      <nav class="nav-menu" aria-label="主导航">
        <div class="nav-group">
          <span class="nav-label">工作台</span>
          <RouterLink v-for="item in primaryNav" :key="item.to" :to="item.to" class="nav-item">
            <svg v-if="item.icon === 'home'" viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>
            <svg v-else-if="item.icon === 'library'" viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 5.5v16M8 7h8M8 11h8" /></svg>
            <svg v-else viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M5 15v5h14v-5" /></svg>
            <span>{{ item.label }}</span>
          </RouterLink>
        </div>

        <div class="nav-group">
          <span class="nav-label">复习模式</span>
          <RouterLink v-for="item in reviewNav" :key="item.to" :to="item.to" class="nav-item">
            <svg v-if="item.icon === 'review'" viewBox="0 0 24 24"><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h6M8 16h4" /></svg>
            <svg v-else-if="item.icon === 'wrong'" viewBox="0 0 24 24"><path d="M12 3 3.5 19h17z" /><path d="M12 9v4m0 3v.1" /></svg>
            <svg v-else viewBox="0 0 24 24"><path d="m13 2-8 12h7l-1 8 8-12h-7z" /></svg>
            <span>{{ item.label }}</span>
          </RouterLink>
        </div>
      </nav>

      <div class="sidebar-footer">
        <span class="status-dot"></span>
        <div>
          <strong>本地模式</strong>
          <span>数据仅保存在本机</span>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <div class="content-frame">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
  background:
    radial-gradient(circle at 82% 0%, rgba(79, 70, 229, 0.08), transparent 28%),
    var(--color-background);
}

.sidebar {
  position: relative;
  z-index: 2;
  display: flex;
  flex: 0 0 244px;
  flex-direction: column;
  height: 100vh;
  padding: 22px 16px 18px;
  color: #d8ddef;
  background: linear-gradient(180deg, #151b2d 0%, #111728 100%);
  box-shadow: 8px 0 32px rgba(15, 23, 42, 0.08);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 8px 24px;
}

.brand-mark {
  display: grid;
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  place-items: center;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.04em;
  background: linear-gradient(135deg, #818cf8, #4f46e5);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 13px;
  box-shadow: 0 8px 22px rgba(79, 70, 229, 0.35);
}

.brand-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.brand-copy strong {
  overflow: hidden;
  color: #fff;
  font-size: 15px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.brand-copy span {
  color: #8f99b3;
  font-size: 11px;
}

.nav-menu {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 26px;
  overflow-y: auto;
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.nav-label {
  padding: 0 12px 7px;
  color: #68738f;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 43px;
  padding: 0 12px;
  color: #aeb7ce;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  border: 1px solid transparent;
  border-radius: 11px;
  transition: color 160ms ease, background 160ms ease, transform 160ms ease;
}

.nav-item svg {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.nav-item:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
  transform: translateX(2px);
}

.nav-item.router-link-exact-active,
.nav-item.router-link-active {
  color: #fff;
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.28), rgba(99, 102, 241, 0.12));
  border-color: rgba(129, 140, 248, 0.2);
}

.nav-item.router-link-active::before {
  position: absolute;
  left: -5px;
  width: 3px;
  height: 20px;
  content: "";
  background: #818cf8;
  border-radius: 99px;
}

.sidebar-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
  padding: 13px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
}

.sidebar-footer > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-footer strong {
  color: #dce2f2;
  font-size: 12px;
}

.sidebar-footer span:not(.status-dot) {
  color: #7f89a2;
  font-size: 10px;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #34d399;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.1);
}

.main-content {
  flex: 1;
  height: 100vh;
  overflow-y: auto;
}

.content-frame {
  width: min(1180px, 100%);
  min-height: 100%;
  margin: 0 auto;
  padding: 36px 42px 56px;
}

@media (max-width: 980px) {
  .sidebar {
    flex-basis: 82px;
    align-items: center;
    padding-inline: 12px;
  }

  .brand-copy,
  .nav-label,
  .nav-item span,
  .sidebar-footer div {
    display: none;
  }

  .brand {
    padding-inline: 0;
  }

  .nav-menu,
  .nav-group {
    width: 100%;
  }

  .nav-item {
    justify-content: center;
    padding: 0;
  }

  .sidebar-footer {
    justify-content: center;
    padding: 14px;
  }

  .content-frame {
    padding: 30px 28px 48px;
  }
}
</style>
