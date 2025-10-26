# idToken 管理策略 — 说明与迁移指南

本文档总结了项目中关于 Firebase idToken 的最新管理策略、实现文件、调用约定以及迁移建议，方便开发者理解并正确使用鉴权凭证。

## 背景与动机

以前项目中存在多处“自动刷新 idToken”行为（例如 `onIdTokenChanged`、App 回到前台或遇到 401 时自动强制刷新），导致：

- 在某些环境下会观察到频繁/重复的 token 刷新（噪声）。
- 并发多个组件同时发起刷新时会造成重复网络请求。
- 一些代码隐式依赖 `lastToken` 导致难以保证拿到的 token 是最新且未过期的。

目标是：
- 改为“按需获取（on-demand）”token，只有在需要时才请求或强制刷新；
- 使用单点共享的缓存 + 并发去重，避免重复刷新；
- 不再把内部缓存 `lastToken` 暴露为公共 API，强制使用安全的调用方式。

---

## 主要改动（文件与职责）

- `src/services/authToken.ts`（新增）
  - 功能：共享的 idToken 管理器。
  - 导出：
    - `getFreshIdToken(opts?: { force?: boolean }): Promise<string | null>`
      - 默认：若已有缓存且未传 `force`，返回缓存；否则请求新 token。
      - 并发去重：多个并发调用共享同一个 in-flight Promise，避免重复刷新。
    - `clearCachedToken()`：清除缓存（在 `onIdTokenChanged` 等场景调用）。
    - `tokenWillExpireWithin(withinSeconds = 300): boolean`：判断缓存 token 是否将于指定秒数内过期（用于请求前的策略判断）。
  - 实现细节：缓存 `cachedToken`，用 `inflight` 保存正在进行的刷新 Promise；解析 JWT payload 使用 `atobSafe`。

- `src/providers/AuthProvider.tsx`（修改）
  - 变更：不再在公共 context 中暴露 `lastToken`；`getFreshIdToken` 委托到 `authToken.getFreshIdToken`。
  - `onIdTokenChanged` 不再自动获取 token，而是 `clearCachedToken()`，使 token 的拉取留给需要它的代码。
  - AppState 回到前台不再自动强制刷新（只记录事件）。

- `src/services/httpService.ts`（修改）
  - `attachAuthHeader`：在请求前，会检查 `tokenWillExpireWithin(300)`（默认 5 分钟阈值），若将近过期则先 `getFreshIdToken({force:true})` 再附加 Authorization 头。
  - `apiGet` / `apiPost`：默认在遇到 401 时会自动：
    1. 调用 `getFreshIdToken({force:true})`（并发去重）
    2. 重新构建头并重试一次请求
    3. 若仍 401，则返回 401 给调用方
  - 支持 `autoRetryOn401?: boolean` 参数以关闭自动重试（默认开启）。

- `src/screens/AuthInspector.tsx`（修改）
  - 不再依赖 `lastToken`；组件挂载时按需调用 `getFreshIdToken()`；手动刷新按钮改为 `getFreshIdToken({force:true})`。

- 其它调用点（如 `SettingsScreen`、`HealthCheckScreen` 等）已迁移为使用 `getFreshIdToken()` 或 `httpService`。

---

## 新的调用约定（示例）

- 在需要鉴权的网络请求前：

```ts
import { getFreshIdToken } from '@/services/authToken';

const token = await getFreshIdToken(); // 默认返回缓存或请求新 token
// 或者
const token = await getFreshIdToken({ force: true }); // 强制刷新
```

- 通过 httpService 发请求（推荐）：

```ts
import { apiGet, apiPost } from '@/services/httpService';

// 默认会在 token 临近过期时主动刷新，并在 401 时尝试强制刷新并重试一次
const data = await apiGet('/protected/resource');

// 若不希望 HTTP 层自动重试 401：
const data = await apiGet('/protected/resource', { autoRetryOn401: false });
```

---

## 为什么选择这种策略

- 按需（on-demand）策略能把刷新控制权交还给业务代码，避免 SDK 回调或前台事件触发的隐式刷新引发噪声。 
- 集中缓存与并发去重能显著减少重复网络请求，尤其在多个组件在同一时间需要 token 的场景下。 
- 通过 `tokenWillExpireWithin` 在请求前判断并在必要时强制刷新，兼顾性能与可用性：大多数请求可以直接使用缓存，而不会在短期内因为过期被拒。

---

## 迁移注意事项

- 不要使用 `lastToken` 或直接调用 `user.getIdToken()`（项目已移除或替换大部分用法）。请统一使用 `getFreshIdToken()` 或 `httpService`。
- 如果你的代码之前假设 provider 的 `lastToken` 总是可用，要改为异步调用 `getFreshIdToken()`。
- 若你希望某个模块在遇到 401 时自动处理（重试），可以依赖 `httpService` 的默认行为，或在调用处手动捕获 401 并调用 `getFreshIdToken({force:true})` 后重试。

---

## 配置与调整建议

- 过期阈值：当前设置为 300 秒（5 分钟），可以调整 `tokenWillExpireWithin(SECONDS)` 的默认值以适配你的需求。较短阈值更节省请求，较长阈值更保险。
- 重试策略：默认 `apiGet`/`apiPost` 会自动在 401 时强制刷新并重试一次；若你希望更保守可改为默认不重试，并在需要的调用处设置 `autoRetryOn401: true`。
- 并发/去重：当前使用简单的 `inflight` Promise 去重；如需更复杂的取消/超时策略可以在 `authToken` 中扩展。

---

## 推荐扩展（可选）

- 在 `authToken` 中添加更完善的并发锁（支持超时、取消）。
- 增加单元测试覆盖：并发刷新、强制刷新、过期判断、onIdTokenChanged 清理缓存等。
- 在文档或代码注释中标注 `lastToken` 已废弃/移除，帮助新加入的开发者遵循新模式。

---

## 运行与验证

- 类型检查：

```bash
npx tsc --noEmit
```

- 手工验证：
  1. 打开 `AuthInspector`，点击“获取 token”按钮，观察 `events`，确认只在需要时刷新；
  2. 在访问受保护接口时触发 401，确认请求自动刷新并重试（或根据 `autoRetryOn401` 设置行为）。

---

如果你希望，我可以：

- 把 `tokenWillExpireWithin` 的阈值改为可配置的常量或环境变量；
- 将 `authToken` 的并发去重升级为带超时/取消的更健壮实现；
- 增加单元测试覆盖新逻辑。

告诉我你想优先做哪一项，我会继续实现并验证。