# 变更记录：自最近一次提交以来的修改（中文）

## 概述

- 目的：统一权限/用户订阅逻辑、避免为访客/匿名用户进行不必要的远端请求、解决并发拉取 profile 的重复请求、抽取访客占位组件、以及提供安全、可控的本地数据库清理方法。
- 主要改动方向：
  - 在网络层做 fetch 去重（in-flight dedupe）。
  - 将认证 + profile + 角色判断合并到 `usePermission` Hook。
  - 让顶层 `App` 使用 `usePermission`，避免重复订阅。
  - 抽出 `GuestPlaceholder` 供访客场景复用并作为 `RequireHost` 的 deny fallback。
  - 增加 `localDb.clearDatabase()` 并在 Settings 中使用，移除对 AsyncStorage 的模糊删除。
  - 更新相关屏幕/组件以使用新的权限钩子，减少直接订阅 `onAuthStateChanged` 的位置。

---

## 受影响的文件（按类别与作用）

### 1) Firebase / profile 去重与缓存
- 文件：`src/firebase/getUserProfile.ts`
- 改动摘要：
  - 添加 in-flight 请求去重：同一 uid 的并发拉取会共享同一个 Promise，避免重复网络请求。
  - 添加简单缓存（例如 TTL 5 分钟）以减少短时内重复拉取。
  - 暴露 `fetchUserProfile`, `userHasRole`, `clearUserProfileCache`（若实现）。
- 为什么改：多个组件并发在认证状态变化时拉 profile，导致重复流量和 race 条件；把去重放在网络 API 层最安全、影响面最小。
- 验证建议：在开发环境打印 fetch 触发次数，登录时快速触发多处 profile 请求确认只有一次远端请求（或共享 Promise）发生。

### 2) 中心化权限 Hook
- 文件：`src/hooks/usePermission.ts`
- 改动摘要：
  - Hook 现在订阅 `onAuthStateChanged`，负责：
    - 设置基础 authUser（uid, email, displayName, photoURL, isAnonymous）。
    - 调用 `fetchUserProfile(uid)` 并把 Firestore profile 映射为项目 `UserProfile`（包括将 `nickname` 映射到 `displayName` 以兼容类型）。
    - 调用 `userHasRole(uid, 'host')` 并把结果存入 `isHost`。
    - 管理 `loading` 状态（首次加载 profile/role 时为 true）。
  - 返回值：`{ uid, authUser, profile, loading, isHost }`。
- 为什么改：避免各处重复订阅 auth 和重复拉 profile；让 UI 统一从一个 source-of-truth 读取权限信息。
- 验证建议：检验 hook 在不同 auth 流（匿名、普通用户、host）下的返回值和 loading 行为。

### 3) 顶层 App 改动：依赖 Hook，避免为访客发起 host-only 请求
- 文件：`App.tsx`
- 改动摘要：
  - 引入 `usePermission`，移除 App 内部对 `onAuthStateChanged` 的显式订阅（由 hook 处理）。
  - 使用 hook 的 `permLoading`（或 loading）来在 bootstrap 阶段展示 loading 指示器。
  - 保留 `restoreUser`、bootstrapping（settings/locale/localDB init）逻辑不变。
  - 保留对 `onAuthStateChanged` 是否存在的检测以决定在无 auth 子系统的环境下直接导航到 Login（此处仍保留导入检测逻辑）。
  - 注释/占位：可以在 App 中添加一个 effect，当 `authUser && !authUser.isAnonymous && isHost` 时执行 host-only 拉取（例如汇率或管理员数据）。
- 为什么改：统一权限来源，避免多处重复 role 检查；保证对访客/匿名用户不做 host-only 网络调用。
- 验证建议：
  - 登录为匿名用户：确认 App 未发起 host-only 请求（网络面板/日志）。
  - 登录为普通非-host：确认跳过 host-only 拉取。
  - 登录为 host：确认触发 host-only 拉取（如果你在 App 中添加了此 effect）。

### 4) 访客占位组件
- 文件：`src/components/common/GuestPlaceholder.tsx`（新增）
- 改动摘要：
  - 抽出访客专用占位 UI，供多个 host-only 或 user-only 页面复用。
  - 根据需求移除了“关闭/取消”按钮（遵从之前用户指示）。
  - 在 `RequireHost` 的 denyFallback 场景中使用。
- 为什么改：减少重复 UI，统一体验和文案，并便于 i18n 管理。
- 验证建议：在 PlayerRankingScreen、HealthCheck 等 host-only 页面以访客身份打开，确认展示该占位组件。

### 5) 本地 DB 清理
- 文件：`src/services/localDb.ts`
- 改动摘要：
  - 新增 `clearDatabase()`，优先使用事务执行原生 DELETE，失败时降级到逐表 execSql。
  - 在清理后重置内存缓存 `__pokerpal_store` 并持久化（setLocal）。
- 为什么改：提供单点、安全的本地历史清除方法，避免跨处实现重复或错误。
- 验证建议：在 Settings 执行“清除本地历史”，确认 SQLite 中相关表被清空，并且 UI 中本地历史为空；确认 AsyncStorage 中其他无关键未被误删（用户已要求移除模糊删除）。

### 6) SettingsScreen：使用 centralized DB 清理
- 文件：`src/screens/SettingsScreen.tsx`
- 改动摘要：
  - 用 `localDb.clearDatabase()` 替代之前逐表 DELETE/AsyncStorage 模糊删除逻辑。
  - 事后根据用户要求删除了对 AsyncStorage 模糊删除（以避免误删非 app 数据）。
- 为什么改：减少误删风险并把清理逻辑集中在服务层。
- 验证建议：执行设置里的清空操作并检查本地历史、UI 与 AsyncStorage。

### 7) 将各屏幕/组件迁移到 usePermission
- 文件举例：
  - `src/screens/HomeScreen.tsx`：移除 direct `onAuthStateChanged` 订阅，直接从 `usePermission` 派生 `user` / `profile`。
  - `src/screens/ProfileScreen.tsx`：使用 `usePermission` 的 `authUser` 和 `profile`，按 authUser 非匿名时拉取 game history。
  - `src/components/AddPlayerCard.tsx` & `src/components/gaming/AddPlayerCard.tsx`：不再单独订阅 auth 状态，改用 `usePermission`。
- 改动摘要：
  - 统一从 `usePermission` 读取 auth/profile/isHost，删除多余的订阅和重复 fetch。
- 验证建议：
  - 逐个屏幕以匿名/普通/host 身份打开，确认 UI 行为正确且没有多次网络请求（可在 devtools/network 或在 `fetchUserProfile` 加 debug 日志）。

### 8) GameHistory / i18n 文案调整
- 文件：`src/screens/GameHistoryScreen.tsx`
- 改动摘要：
  - 如果用户没有线上查看权限（非 host），仅显示本地历史并在云端 tab 显示 localized message `simpleT('no_cloud_permission')`。
  - 添加并完善 i18n key，例如 `no_cloud_permission`（中/英文词条已加入）。
- 验证建议：
  - 非 host 用户打开 GameHistory：云端选项被屏蔽或显示“无权限”的本地化消息。

### 9) fetchUserProfile 去重之后的副作用修复
- 说明：
  - 由于 fetch 去重以及 `usePermission` 中对 profile 的映射，修复了若 Firestore 使用 `nickname` 字段导致本地类型不满足 `displayName` 的类型问题（通过映射 `nickname -> displayName`）。
- 验证建议：
  - 检查 profile 显示的昵称在有 `nickname` 的 Firestore 文档中是否正确显示，并且没有 TypeScript 类型错误。

---

## 已解决的问题（问题/症状 -> 修复）
- 重复的 profile 拉取与并发请求 -> 在 `fetchUserProfile` 做 in-flight 去重。
- 多处订阅 `onAuthStateChanged` 导致的竞态/重复 -> 将订阅集中到 `usePermission`，其他组件改为读取 hook。
- 误删 AsyncStorage 项目（模糊匹配）风险 -> 移除模糊删除，仅使用 `localDb.clearDatabase()`。
- 无法识别 Firestore `nickname` 字段 -> 在 profile 映射中兼容 `nickname` 为 `displayName`。
- 顾客体验不一致（访客占位） -> 抽出 `GuestPlaceholder` 并在 host-only 页面使用。

## 回归与验证步骤（建议）

1. 类型检查
   - 在仓库根目录运行：
```bash
npx tsc --noEmit
```
   - 期待结果：无 TypeScript 错误（可能有 npm config 警告）。

2. 手动流程（设备或模拟器）
   - 场景 A（访客/匿名用户）：
     - 启动 app（或在 DevTools 将 auth 设置为匿名）。
     - 确认：
       - 不会触发 host-only 网络调用（网络面板/日志）。
       - Host-only 页面显示 `GuestPlaceholder`。
       - GameHistory 仅显示本地历史，云端 tab 显示 `no_cloud_permission` 文案。
   - 场景 B（普通已登录用户、非 host）：
     - 登录为非 host 的账户。
     - 确认：
       - App 跳过 host-only 拉取。
       - 权限相关 UI 对非 host 做出正确限制。
   - 场景 C（host 用户）：
     - 登录为 host（在 Firestore 中确保角色为 host）。
     - 确认：
       - `usePermission` 的 `isHost` 为 true。
       - 可触发 host-only 拉取（如果你在 App 中添加了此 effect）并正确展示数据。

3. 本地 DB 清理验证
   - 在 Settings 执行清除本地历史操作。
   - 确认：
     - SQLite 中相关表（games, game_players, actions, players）被清空。
     - `__pokerpal_store` 被重置并 persisted。
     - 其它 AsyncStorage 键未被误删。

## 建议的提交信息与 PR 描述（可直接使用）
- Commit 标题（简短）：
  - feat(permission): centralize auth/profile (usePermission) + fetchUserProfile in-flight dedupe; add GuestPlaceholder; add localDb.clearDatabase
- PR 描述（详细）：
  - 本次更改将认证与权限订阅集中到 `usePermission`，并在网络层为 `fetchUserProfile` 增加 in-flight 去重与短期缓存，避免重复网络调用。抽离 `GuestPlaceholder` 以统一访客体验。增加 `localDb.clearDatabase()` 作为安全、集中化的本地清理入口，并在 Settings 中使用。移除了 AsyncStorage 的模糊删除逻辑以降低误删风险。App 顶层改为使用 `usePermission` 来决定是否执行 host-only 请求。已在类型检查下通过（npx tsc --noEmit）并建议在设备上手动验收三类用户流（匿名/非 host/host）。

## 后续建议 / 可选改进
- 在 `fetchUserProfile` 上增加更可配置的缓存失效与强制刷新 API（例如带 force=true），以支持管理控制台强制刷新资料。
- 在 `usePermission` 中暴露更细粒度的 loading 状态（例如 profileLoading / roleLoading），便于 UI 更精确处理。
- 为 `localDb.clearDatabase()` 增加事务日志或备份文件（以便误删回滚），或在 Settings 操作前提供导出/备份选项。
- 添加轻量的自动化集成测试（使用 Detox 或类似框架）覆盖匿名/普通/host 登录下的关键 UI 流，避免回归。
- 如果希望在 App 中彻底移除对 `onAuthStateChanged` 的引用（例如 for environments without auth），可以把导航 onReady 的判断从检测 `onAuthStateChanged` 转为检测 `usePermission` 的 `loading`/`authUser`，并相应调整引入。

---

如果你希望我把这份文档在 PR 中附上、更精简成 release note（App Store 用），或对文档的风格做企业级格式调整（例如 add changelog headings per semantic-release），我可以继续处理。
