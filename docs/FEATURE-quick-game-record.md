# 功能开发文档：快速记录游戏（Quick Game Record）

版本说明：基于当前代码库（Expo + React Native + Firebase + local sqlite + zustand）的实现建议与开发细节。

## 概述

目标（更新）：仅记录当前已登录的玩家（当前用户）的结算/游戏信息。

说明：本功能范围为单用户快速记录 —— 不包含其他玩家条目或多人结算输入。设计目标是让单个玩家（无论是 host 或普通 player）能以最少的交互步骤记录自己的本局结算并保存到本地；当用户具有云端写权限（如 host）时，可选择同步到 Firestore。

适用场景（精简）：
- 登录玩家（包括 host）：记录自己的 buy-in、settleCashDiff、盲注和备注，并可选择同步云端（仅当有写权限）。
- 访客/匿名：可保存到本地，但云端同步选项不可用，界面会提示登录以启用同步功能。

---

## 契约（Contract）

输入：
- 必填：players: [{ uid?, name, seat?, buyin?, settleCashDiff }], timestamp, smallBlind, bigBlind, finalized? (boolean)
- 可选：notes, location/id

输出：
- 成功：返回本地保存的 gameLocalId；若同步成功，返回 remoteId 与时间戳。
- 失败：返回 error code 与友好提示（网络/permission/db）。

权限：
- 本地保存：任何用户（含访客）。
- 写入云端：仅当 usePermission().isHost === true 或用户有相应写权限时。
- finalize：仅 host 可执行。

权限（更新说明）：
- 本地保存：任何用户（含访客）。
- 写入云端：
  - Host：可写入全局 game 文档（`/games/{gameId}`）并执行完整的 game writer 流（player counters、graph、hostGameRecord 等）。
  - Player（已登录的普通玩家）：允许将自己的游戏结果写入到自己的用户历史路径（`/users/{uid}/games/{gameId}`），并更新自身的统计（buyin/totalProfit/averageROI 等）。这不会创建或修改全局 game doc 或 hostGameRecord。前端应在尝试云端写入前再次校验权限（或依赖 Firestore Security Rules 来强制约束）。
- finalize：仅 host 有权限对全局 game 标记为 finalized（若需要此语义，player 很可能只写入个人历史记录）。

---

## 用户界面与交互（UI/UX）

入口：
- 在 `HomeScreen` 的快速操作区新增“快速记录”按钮（图标：闪电或记录）。
- 也可在 `GamePlay` 的浮层或播放栏加入相同入口。

QuickRecordCard（组件名建议：`QuickRecordCard`）
- 最简模式：列出玩家行（从本地 player store 预填），每行快速输入结算金额（±），选择盲注（1/2, 2/4 等），保存。
- 高级模式（可展开）：填写 buy-in、notes、是否 finalize、是否同步云端（仅当 isHost 可选）。
- 成功保存后：展示 Toast，提供“查看详情（跳转 GameDetail）”按钮。

UX 要点：
- 最小输入：预填玩家名与历史数据；使用 +/- 快捷按钮修改金额。
- 离线支持：网络不可用或无权限时，优先保存本地并标记 pendingUpload。
- 权限提示：非 host 点击“同步到云端”时，弹窗提示并引导登录或联系 host。

---

## 数据模型（本地 sqlite 与 in-memory）

复用 localDb 已有表结构（games, game_players, actions, players）。建议新增/复用字段：

- games 表新增/使用字段：
  - id (uuid)
  - createdAt
  - finalized (boolean)
  - finalizedAt?
  - smallBlind, bigBlind
  - notes
  - syncStatus ('synced'|'pending'|'failed')
  - remoteId? (若云端已写入)

- game_players 表：
  - id, gameId, uid?, name, seat?, buyin?, settleCashDiff, settleROI?

内存 store：
- 可复用 `useGameStore` 或新增 `useQuickRecordStore` 保存临时交互数据（rows、meta），保存时调用 localDb API。

云端模型：
- 复用 `saveGame.ts` / `gameWriters.ts`（若存在）写入 Firestore。若没有适配接口，新增 `saveQuickGameToFirebase(game)` 放在 `src/firebase/`。

---

## 实现组件与服务

建议新增/修改文件：

1. 组件
- `src/components/QuickRecord/QuickRecordCard.tsx`
  - Props: visible, onClose, onSaved
  - 使用 `usePermission()` 判定 `isHost` 与 `authUser`，UI 根据权限启用“同步到云端”选项。
  - 保存流程：调用 quickRecordService.saveLocalGame -> 若选择同步且有权限 -> quickRecordService.saveGameToCloud。

2. Hook
- `src/hooks/useQuickRecord.ts`
  - 提供 API：startRecord(), setPlayerSettlement(idx, value), saveLocal(), saveAndSync(), isSaving, error
  - 管理表单状态和本地/云端保存逻辑。

3. 服务
- `src/services/quickRecordService.ts`
  - 方法：saveLocalGame(game): Promise<localId>
             saveGameToCloud(game): Promise<remoteId>
             migratePendingUploads(): Promise<void>
  - 封装 localDb 事务写入以及 cloud writer 的 retry/backoff 策略。

4. localDb 迁移/Schema
- `src/services/localDb.ts`
  - 在 initSchema 或 migrate 阶段检测并添加 `syncStatus` 与 `remoteId` 字段（若不存在）。SQLite 对 ALTER 有限制，必要时采用临时表复制策略。

5. 集成点
- `src/screens/HomeScreen.tsx`: 在快速操作区添加打开 `QuickRecordCard` 的入口（参考已存在按钮布局）。
- `usePermission` effect（已存在）
  - 当 `isHost` 变为 true 或网络恢复时，触发 `quickRecordService.migratePendingUploads()` 尝试上报 pending 的本地记录。

---

## 权限与安全

- 前端：仅作为 UX 层面约束，实际写入权限需依赖 Firestore Security Rules 或后端验证。
- 写入云端前建议再次在服务端/云端进行权限校验（或重用 `userHasRole(uid,'host')`）以防前端状态过期。

---

## 错误处理与重试策略

- 本地写入失败：立即提示用户失败原因并阻止云端写入。
- 云端写入失败：标记 `games.syncStatus='failed'` 并把纪录放到 retry queue（指数退避）。
- 离线场景：保存本地并设置 `syncStatus='pending'`，当网络恢复或 `usePermission.isHost` 为 true 时自动尝试上传。

---

## 测试场景（建议）

单元测试：
- `useQuickRecord.saveLocal()` 能正确调用 localDb 的事务并返回 localId（使用 mock）。
- `saveAndSync()` 在 isHost=true 时调用 cloud writer，失败时正确设置 syncStatus='pending'。

集成/手工测试：
- 场景 A（host 在线）: 快速记录 -> 云端同步 -> Firestore 有新 document，local syncStatus='synced'。
- 场景 B（host 离线）: 快速记录 -> 本地 pending -> 恢复网络后自动上传成功。
- 场景 C（player 非 host）: 快速记录仅本地保存，不会上传云端。
- 场景 D（访客）: 快速记录仅本地保存，并正确提示登录以同步云端。

回归测试点：
- 不破坏现有 `GamePlay` 的 finalize/保存流。
- `localDb.clearDatabase()` 在新字段下仍能清理表。
- `usePermission` 状态切换不会导致重复上传（受 `fetchUserProfile` 去重以及 pending upload guard 保护）。

---

## 任务分解与估时（建议）

1. 数据库 schema 与迁移（1-2h）
   - 在 `localDb.initSchema` 中添加 `syncStatus`/`remoteId` 字段或使用表重建复制策略。

2. quickRecordService + hook（3-6h）
   - `src/services/quickRecordService.ts`、`src/hooks/useQuickRecord.ts`。
   - 封装保存、上传、retry、pending 扫描逻辑。

3. QuickRecordCard 组件（4-8h）
   - UI/表单交互、player 列表、快速 +/- 控件、SaveLocal/Save+Sync。

4. 云端集成（2-4h）
   - 复用或新增 `src/firebase/saveQuickGame.ts`，遵循现有 `gameWriters` 风格。

5. Pending 上传与后台任务触发（2-3h）
   - 在 `usePermission` isHost / online change 时触发迁移。

6. 测试与修复（2-4h）

总计估时（PoC）：约 12-25 小时，取决于 UI 细节与云端写入复杂度。

---

## 可选增强（后续迭代）

- QR/拍照快速录入：支持拍照识别或扫码来生成 records。
- 智能建议：基于历史自动预填 settle 数值。
- 导出/分享：CSV 导出、邮件或上传至第三方分析。

---

## 交付物（我可为你生成）

- `docs/FEATURE-quick-game-record.md`（本文件）
- 组件骨架：`src/components/QuickRecord/QuickRecordCard.tsx`
- Hook：`src/hooks/useQuickRecord.ts`
- 服务：`src/services/quickRecordService.ts`
- 本地 DB 迁移 patch（`src/services/localDb.ts`）
- 测试骨架（单元+集成）

---

如果你同意，我可以继续：
- 选项 A：生成并提交上述组件/Hook/服务的代码骨架到仓库（我会创建文件并运行 `npx tsc --noEmit` 进行类型检查）；
- 选项 B：先把文档保存在仓库（已完成）；
- 选项 C：帮你在 `HomeScreen` 上放置最小入口（一个按钮打开 QuickRecordCard 的占位 modal）。

请告诉我接下来要实现的优先项。