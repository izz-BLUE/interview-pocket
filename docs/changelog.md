# Changelog

## v0.1.6-review-mvp

### Added
- 初始化 Electron + Vue3 + TypeScript Windows 桌面端项目架构。
- 支持本地 Markdown 面试文档导入。
- 支持将面试手册解析为结构化题目。
- 支持题库列表展示和关键词搜索。
- 支持搜索相关性排序、命中位置和命中片段展示。
- 支持题目详情、标准答案、记忆锚点、追问点展示。
- 支持今日待复习、今日已复习、总题数统计。
- 支持卡片式复习、自评打分和连续下一题流程。
- 支持基于评分计算下次复习时间。

### Fixed
- 修复 Markdown 中 text code block 答案丢失问题。
- 修复题目标题解析成功但标准答案为空的问题。
- 修复重复导入导致题目重复插入的问题。
- 修复搜索结果按插入顺序返回导致相关性差的问题。
- 修复多关键词搜索中单词弱命中排序过高的问题。
- 修复 Electron 主进程 EPIPE 日志错误导致崩溃的问题。
- 修复非题目章节被误解析为题目的问题。
- 修复今日待复习和今日已复习统计逻辑异常。
- 修复复习页点击“下一题”返回题库列表的问题。

### Known Limitations
- 暂不支持题目编辑。
- 暂不支持标签管理。
- 暂不支持文件夹批量导入。
- 暂未打包 Windows exe。
- 暂未实现完整 SM-2 间隔重复算法。
- 暂未实现系统托盘和全局快捷键。

## v0.1.7-data-cleanup

### Fixed
- 统一复习记录时间写入格式，提交评分时显式写入 review_date。
- 为 review_progress 增加 wrong_count 和 mastery_score 字段。
- 增加本地数据库迁移逻辑，兼容已有数据库自动补字段。
- 修复复习进度字段与后续错题/掌握度统计能力不一致的问题。

### Notes
- 本版本不新增 UI 功能，仅作为 V0.1.6 后的数据一致性清理版本。

## v0.2.1-wrong-review

### Added
- 新增错题复习入口。
- 新增错题复习页面。
- 新增 getWrongQuestions IPC，用于查询 wrong_count > 0 的题目。
- 新增 resetWrongCount IPC，用于将题目标记为已掌握并清零 wrong_count。
- 支持错题按 wrong_count 降序复习。
- 支持错题复习连续下一题。
- 支持本轮错题复习完成状态。

### Fixed
- 修复错题复习 IPC 错误返回不规范的问题。
- 移除错题页答案展示中的 v-html，改为普通文本展示。
- 移除 resetWrongCount 中多余的 saveDatabase 调用。

### Notes
- 本版本不涉及 AI 接入、云同步、EXE 打包、系统托盘或全局快捷键。

## v0.2.2-cram-mode

### Added
- 新增面试前突击模式入口。
- 新增题库来源选择能力。
- 新增 getQuestionSources IPC，用于获取题库来源列表。
- 新增 getCramQuestions IPC，用于获取突击模式题目。
- 支持突击模式快速浏览题目。
- 支持显示答案。
- 支持临时标记“不确定”。
- 支持完成后只复习不确定题。
- 支持突击完成统计展示。

### Fixed
- 增强 getCramQuestions 的 limit 参数保护。
- 增强 CramModePage 中 JSON 字段解析的安全性。

### Notes
- 突击模式为纯浏览模式，不写入 review_records。
- 突击模式不更新 review_progress。
- 突击模式不会影响今日待复习、今日已复习、wrong_count 或 mastery_score。

## v0.2.3-source-filter

### Added
- 题库列表页新增来源筛选下拉。
- 支持按 source_file 查看题目。
- 搜索题目时支持按当前来源过滤。
- 题库页新增当前来源和结果数量提示。

### Changed
- listQuestions 支持 sourceFile 参数。
- searchQuestions 支持 sourceFile 参数，并在主进程数据层过滤来源。

### Notes
- 本版本不影响普通复习、错题复习和突击模式。
- 本版本不新增数据库表。

## v0.2.4-import-report

### Added
- 增强 Markdown 导入后的导入报告。
- 导入报告新增来源文件、解析题目数、新增题目数、重复跳过数和更新题目数展示。
- 导入报告新增答案解析统计，包括标准答案、简短回答、深入回答、记忆锚点、追问点和注意/禁忌数量。
- 导入报告新增疑似缺答案题目列表。
- 导入报告新增重复跳过题目列表。
- 支持从导入报告一键跳转到题库页，并自动筛选当前来源题目。
- 支持继续导入。

### Changed
- importMarkdownFile 返回结构新增 report 对象，同时保留 count 和 duplicatedCount 兼容字段。
- QuestionList 支持通过 query.sourceFile 自动设置来源筛选。

### Notes
- 本版本不新增数据库表。
- 本版本不实现题目更新逻辑。
- 本版本不影响普通复习、错题复习和突击模式。

## v0.2.5-basic-stats

### Added
- 首页新增复习状态统计。
- 新增已复习题数、未复习题数、错题数、低掌握题数和平均掌握度统计。
- 题库列表新增掌握度、复习次数、错题次数展示。
- 新增 getQuestionReviewInfo IPC，用于查询单题复习进度和历史记录。
- ReviewPage 新增单题复习记录展示。
- 普通复习队列完成页新增本轮复习统计。

### Changed
- listQuestions 返回复习状态字段。
- searchQuestions 返回复习状态字段。

### Notes
- 本版本不新增数据库表。
- 本版本不影响错题复习、突击模式和导入报告。

## v0.2.6-stability-polish

### Fixed
- 增强 getCramQuestions 的 limit 参数保护，限制查询数量范围。
- 统一复习页、错题页和突击页的 JSON 字段解析逻辑。
- 避免 JSON.parse 返回非数组时造成渲染异常。
- 检查并确认页面未使用 v-html 渲染答案内容。

### Changed
- 对 preload API 与类型声明做一致性检查。
- 对版本变更记录做一致性整理。

### Notes
- 本版本不新增功能。
- 本版本不新增数据库表。
- 本版本不涉及 Windows 打包、安装包、自动更新或发布流程。
- 项目后续定位为个人 GitHub 项目和本地自用工具。

## v0.2.7-large-bank-list

### Changed
- 题库列表默认加载上限从 100 提升到 500，适配 155 道以上题库规模。
- listQuestions 默认 limit 提升到 500，并增加参数数值保护。
- getWrongQuestions 查询上限从 100 提升到 500。
- getDueQuestions 查询上限从 50 提升到 500。
- 题库搜索结果保留前 100 条限制，并在页面提示用户。

### Notes
- 本版本不做分页、不做加载更多、不做虚拟列表。
- 本版本面向个人本地自用场景，优先保证中小规模题库完整展示。
- 本版本不新增数据库表。
- 本版本不影响导入、普通复习、错题复习和突击模式的业务逻辑。

## v0.2.8-source-delete

### Added
- 新增按题库来源删除整份题库的能力。
- 新增 deleteQuestionSource IPC。
- ImportPage 新增题库来源管理区域。
- 支持展示题库来源和题目数量。
- 支持删除前二次确认。
- 支持删除后展示删除报告。

### Changed
- 删除题库来源时同步删除 questions、review_progress 和 review_records 相关数据。

### Notes
- 本版本只支持按 source_file 删除整份题库。
- 本版本不支持单题删除、批量勾选删除、回收站或撤销删除。
- 本版本不新增数据库表。
- 删除操作为物理删除，请谨慎使用。