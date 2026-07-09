# Interview Pocket 架构说明

## 1. 架构定位

Interview Pocket 是一个**本地桌面应用**，不依赖后端服务、云账号或远程数据库。

所有数据存储在用户本地机器上，应用启动后即可离线使用。这种设计适合个人面试复习工具的定位：简单、可控、无网络依赖。

## 2. 分层结构

```
┌─────────────────────────────────────────────────────────┐
│                    Renderer Layer                        │
│              Vue 3 + TypeScript + CSS                    │
│         题库列表、复习页、统计页、导入页                  │
└───────────────────────┬─────────────────────────────────┘
                        │ window.api
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    Preload Layer                         │
│            contextBridge + ipcRenderer                   │
│         安全暴露 API，隔离 Renderer 和 Main              │
└───────────────────────┬─────────────────────────────────┘
                        │ ipcRenderer.invoke / send
                        ▼
┌─────────────────────────────────────────────────────────┐
│                      IPC Layer                           │
│              ipcMain.handle / on                         │
│         消息路由，调用 Main 层业务逻辑                    │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                     Main Layer                           │
│     Electron Main Process + Node.js APIs                 │
│  文件选择、Markdown 读取、解析、数据库操作、统计计算     │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                     Data Layer                           │
│              sql.js (纯 JS SQLite)                       │
│         interview-pocket.db (本地文件)                   │
└─────────────────────────────────────────────────────────┘
```

**为什么这样分层：**

- **Renderer** 只负责 UI 渲染和用户交互，不直接访问 Node.js API。
- **Preload** 通过 `contextBridge` 暴露有限的 API，遵循 Electron 安全模型，防止 Renderer 直接访问 `ipcRenderer`。
- **IPC** 作为消息路由层，将 Renderer 的请求转发给 Main 层的业务逻辑。
- **Main** 集中处理文件 I/O、数据库操作、业务计算。
- **Data** 使用 sql.js 纯 JS 实现，无需编译原生模块，数据持久化为本地 `.db` 文件。

## 3. 核心数据流

### 3.1 导入流程

```
用户选择 Markdown 文件
        │
        ▼
Electron dialog.showOpenDialog()
        │
        ▼
Main 进程读取文件内容 (fs.readFileSync)
        │
        ▼
Markdown Parser 解析题目
  - 按 ## 分割题目
  - 提取 follow_ups、warnings
  - 跳过重复题目 (title + source_file 唯一)
        │
        ▼
写入 questions 表 + review_progress 表
        │
        ▼
返回导入报告
  - importedCount (新增数)
  - skippedCount (跳过数)
  - totalParsed (解析总数)
        │
        ▼
Renderer 展示导入报告
```

### 3.2 复习流程

```
进入复习页 (普通复习 / 错题复习 / 突击模式)
        │
        ▼
Main 查询题目
  - 普通复习: getDueQuestions (next_review_date <= 今天)
  - 错题复习: getWrongQuestions (wrong_count > 0)
  - 突击模式: getCramQuestions (随机，不写 review_records)
        │
        ▼
Renderer 展示题目卡片
  - 显示 title 字段 (纯文本，不用 v-html)
  - 答案默认隐藏，用户点击查看
        │
        ▼
用户自评打分 (1-5 分)
        │
        ▼
submitReview 写入数据
  - INSERT review_records (评分 + 时间)
  - UPDATE review_progress
    - review_count + 1
    - wrong_count + (score <= 2 ? 1 : 0)
    - 重算 mastery_score
    - 计算 next_review_date
        │
        ▼
返回下一道题或结束
        │
        ▼
Renderer 展示本轮统计
  - 已复习数、正确数、平均掌握度
```

### 3.3 题库管理流程

```
题库来源管理页
        │
        ▼
getQuestionSources()
  - SELECT source_file, COUNT(*) as question_count
  - GROUP BY source_file
        │
        ▼
展示来源列表 (来源名 + 题目数)
        │
        ▼
用户点击删除来源 → 二次确认弹窗
        │
        ▼
deleteQuestionSource(source_file)
  - 查出该来源所有 question_id
  - DELETE review_records WHERE question_id IN (...)
  - DELETE review_progress WHERE question_id IN (...)
  - DELETE questions WHERE source_file = ?
  - 返回删除报告
        │
        ▼
刷新来源列表
```

### 3.4 搜索 + 筛选流程

```
用户输入关键词 / 选择来源 / 选择复习状态
        │
        ▼
searchQuestions({ keyword, sourceFile, reviewStatus })
        │
        ▼
Main 层根据 sourceFile 和 reviewStatus 构造动态 WHERE
  - sourceFile: = 匹配 source_file
  - reviewStatus: 基于 review_progress 字段判断
        │
        ▼
LEFT JOIN review_progress 获取候选题
  - COALESCE(rp.field, 0) 防御空值
        │
        ▼
keyword 不在 SQL 中做 LIKE，而是在内存中处理
  - normalizeKeyword 标准化关键词
  - calculateScore 计算命中分数
        │
        ▼
按 score、matchRatio、id 排序
        │
        ▼
最多返回前 100 条搜索结果
```

## 4. IPC 设计说明

所有 Renderer → Main 的通信通过 IPC 进行，遵循 Electron 安全规范。

| IPC 通道 | 方向 | 用途 |
|---------|------|------|
| `importMarkdownFile` | Renderer → Main | 导入 Markdown 文件 |
| `listQuestions` | Renderer → Main | 分页查询题目列表 |
| `searchQuestions` | Renderer → Main | 关键词 + 筛选搜索 |
| `getQuestionById` | Renderer → Main | 获取单题详情 |
| `submitReview` | Renderer → Main | 提交复习评分 |
| `getStats` | Renderer → Main | 获取首页统计数据 |
| `getDueQuestions` | Renderer → Main | 获取今日待复习题目 |
| `getQuestionSources` | Renderer → Main | 获取题库来源列表 |
| `getCramQuestions` | Renderer → Main | 获取突击模式题目 |
| `getWrongQuestions` | Renderer → Main | 获取错题列表 |
| `resetWrongCount` | Renderer → Main | 重置单题错题计数 |
| `getQuestionReviewInfo` | Renderer → Main | 获取单题复习记录 |
| `deleteQuestionSource` | Renderer → Main | 按来源删除整份题库 |

**设计原则：**

- 所有 IPC 调用返回统一的 `{ success: boolean, data?, error? }` 格式。
- Renderer 通过 `window.api` 调用，不直接访问 `ipcRenderer`。
- Main 层集中处理错误，通过 `safeError` 记录日志。
- 危险操作（如删除来源）在 Main 层做参数校验。

## 5. 为什么选择 sql.js

| 考虑因素 | 说明 |
|---------|------|
| **无需原生编译** | sql.js 是纯 JS 实现，不需要 node-gyp 或 prebuild，避免 Electron 打包时的原生模块兼容问题 |
| **单文件存储** | 数据库导出为单个 `.db` 文件，便于备份和迁移 |
| **SQL 能力完整** | 支持标准 SQL 语法，可以做 JOIN、GROUP BY、子查询、动态 WHERE |
| **适合小中型数据** | 当前 155 道题，500 条加载上限，sql.js 完全胜任 |
| **Electron 友好** | 不需要额外安装数据库服务，和 Electron 主进程集成简单 |
| **离线可用** | 不依赖网络，本地即可完成所有操作 |

**sql.js 的局限（已知）：**

- 不支持 WAL 模式，写入时需要完整导出数据库文件。
- 大数据量下性能不如原生 SQLite binding。
- 当前项目规模下，这些局限不影响使用。

## 6. 当前权衡

| 决策 | 原因 | 后续可优化方向 |
|------|------|--------------|
| **不做复杂分页** | 本地题库规模可控 (500 条上限)，简单分页足够 | 如果题库增长到数千道，可引入虚拟列表 |
| **不做云端账号** | 个人工具，降低复杂度，避免维护成本 | 如果需要多端同步，可考虑可选云存储 |
| **不做 AI 接入** | 先保证复习闭环，避免过度设计 | 后续可扩展 AI 题目分析、智能推荐 |
| **不做 Markdown 富文本渲染** | 降低 XSS 风险，使用纯文本展示更安全 | 可引入安全的 Markdown 渲染库 |
| **不做单题编辑/删除** | 当前通过重新导入覆盖，优先级较低 | 后续可增加单题管理功能 |
| **不做自动化测试** | 个人项目，手动验证成本可控 | 后续可补充 IPC 层单元测试 |
| **复习算法简单** | 当前 SM-2 变体够用，避免过度工程 | 后续可引入更成熟的间隔重复算法 |

## 7. 技术栈总结

```
┌─────────────────────────────────────────────────┐
│                  前端渲染层                       │
│     Vue 3 + TypeScript + Composition API        │
├─────────────────────────────────────────────────┤
│                  桌面框架                        │
│         Electron + electron-vite                 │
├─────────────────────────────────────────────────┤
│                  数据存储                        │
│      sql.js (纯 JS SQLite) + 文件持久化          │
├─────────────────────────────────────────────────┤
│                  构建工具                        │
│    electron-vite + Vite + esbuild                │
├─────────────────────────────────────────────────┤
│                  解析能力                        │
│       自研 Markdown 半结构化解析器               │
└─────────────────────────────────────────────────┘
```

## 8. 数据模型概览

### questions 表

存储从 Markdown 解析出的题目。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER (PK) | 自增主键 |
| title | TEXT | 题目标题 |
| category | TEXT | 题目分类 |
| source_heading_path | TEXT | 来源标题路径 |
| standard_answer | TEXT | 标准答案 |
| short_answer | TEXT | 简短答案 |
| deep_answer | TEXT | 深入答案 |
| memory_point | TEXT | 记忆要点 |
| follow_ups | TEXT | 追问列表 (JSON) |
| warnings | TEXT | 注意事项 (JSON) |
| raw_markdown | TEXT | 原始 Markdown |
| source_file | TEXT | 来源文件名 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### review_progress 表

每题一条，记录复习进度。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER (PK) | 自增主键 |
| question_id | INTEGER (FK) | 关联题目 (UNIQUE) |
| review_count | INTEGER | 复习次数 |
| last_review_date | TEXT | 最近复习时间 |
| next_review_date | TEXT | 下次复习时间 |
| ease_factor | REAL | 难度因子 |
| interval_days | INTEGER | 间隔天数 |
| wrong_count | INTEGER | 错题次数 |
| mastery_score | INTEGER | 掌握度 (0-100) |

### review_records 表

每次复习一条，记录详细历史。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER (PK) | 自增主键 |
| question_id | INTEGER (FK) | 关联题目 |
| score | INTEGER | 评分 (1-5) |
| review_date | DATETIME | 复习时间 |

**表关系：**

```
questions 1 ──── N review_records
questions 1 ──── 1 review_progress
```

删除题库来源时，需要按 `review_records → review_progress → questions` 的顺序删除，避免孤儿数据。
