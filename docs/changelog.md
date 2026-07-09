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