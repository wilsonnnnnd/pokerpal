# Auth token 管理与静默续期说明

此文档记录在纯前端（Expo + React Native + Firebase v9）项目中，如何理解、刷新并安全地处理 idToken / identityToken（Google/Apple）。目标：不引入后端的情况下，保证客户端能在常见场景下获取新鲜 token，并为开发人员提供调试工具。

---

## 概念回顾

- idToken / identityToken：由认证提供方颁发的短期 JWT（通常有效期 ~1 小时）。用于代表用户进行受保护的 API 调用（例如 Firebase）。
- refresh token：长期凭据（通常仅可由 OAuth 授权流程在浏览器或后端获取），可交换到新的 idToken。对于 Google，只有在 offline_access 被请求并允许时会返回 refresh token；在移动端环境下，refresh token 会根据平台与 SDK 行为有所不同。
- Firebase SDK：客户端通过 `currentUser.getIdToken(force?: boolean)` 获取/刷新 idToken；SDK 会在可能的情况下尽量管理 token 缓存与刷新。

---

## 本仓库现状概要

- Firebase 初始化 (`src/firebase/config.ts`) 已尝试使用 React Native persistence：`initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })`（代码有多重尝试分支以兼容不同环境）。这意味着 Firebase Auth 会在支持的运行时试图持久化认证状态（用户登录态，非长期保存的 raw tokens）。
- 项目中已实现 `onIdTokenChanged` 与 `onAuthStateChanged` 监听（我们的 `AuthProvider` 使用它们来记录事件并在 token 更新时尝试读取新 token）。
- `AuthInspector`（开发页）提供实时 token payload（iat/exp）展示与“强制刷新”功能，帮助调试 token 生命周期。

---

## 推荐策略（纯前端，无后端）

1. 使用 Firebase SDK 管理 token：
   - `currentUser.getIdToken()`：返回当前（缓存的）idToken。
   - `currentUser.getIdToken(true)`：强制刷新（联系后端授权服务器以获取新 token）。
   - 由 SDK 管理 idToken 的内部刷新和过期判断，仍建议在关键时刻（app 回到前台、用户切号、重要请求前）显式调用 `getIdToken(true)`。

2. 在 App 恢复为 active 时静默刷新：
   - 监听 `AppState`，在 `active` 时对已登录用户调用 `getIdToken(true)`（失败时只是记录并不阻塞 UI）。

3. 不要在客户端长期保留 idToken（例如 AsyncStorage）：
   - idToken 属于短期凭据；长期存储存在泄露风险。只在内存中或通过 Firebase SDK 管理为佳。

4. 在需要调用后端 API 时，将 idToken 放入 Authorization header（`Bearer <idToken>`），并让后端验证（如果你将来加入后端）。目前项目不包含后端验证逻辑，因此客户端仅用于 Firebase SDK / Firestore 访问。

---

## Google 登录注意点

- 如果需要长期刷新能力（refresh token），需要在 Google OAuth flow 中请求 `offline_access`（web/PKCE/服务器流程）。
- 在移动端使用 `@react-native-google-signin/google-signin`：SDK 会在设备上管理凭据，但并不总是会返回长期 refresh token 给 JS 层；若需要 refresh token 并与自家后端对接，请使用后端进行 OAuth 交换。
- 对于仅在客户端并依赖 Firebase 的场景，推荐：使用 Google Sign-In 只作为身份提供（获取 idToken 并传给 Firebase Auth），随后依赖 Firebase 的 `getIdToken()` 刷新机制。

---

## Apple 登录注意点

- Apple Sign-in 提供 `identityToken`（用于 Firebase 登录）和 `authorizationCode`。
- `identityToken` 通常短期有效。`authorizationCode` 可在后端交换长期 token（需要后端）。
- Apple 会只在首次同意时返回 `email` / `fullName`，之后这些字段可能为空。无论如何应以 Firebase 的用户记录为准来持久化展示信息。

---

## 断网与失败处理

- 在调用 `getIdToken()` 或 `getIdToken(true)` 时，若网络不可用或刷新失败，应优雅提示（记录到 `AuthInspector` 的事件日志），但不应阻塞主流程。
- 在恢复网络后允许用户或 App 自动（或通过按钮）重试强制刷新。

---

## 开发者工具与调试建议

- 本仓库包含 `AuthInspector`，可在 Profile 页面中打开以查看当前 token 的 iat/exp、剩余秒数与事件日志。
- 常见观察点：
  - 登录后马上强刷一次以确保 token 新鲜。
  - 切号后观察 `onIdTokenChanged` 事件触发并检查 payload 是否变化。
  - 在 app 从后台回到前台时观察 `AppState.active` 事件和随后的刷新结果。

---

## 未来改进（当引入后端时）

- 推荐在后端用 Firebase Admin SDK 验证 idToken 并建立受控 session（例如 httpOnly cookie），以便实现更安全的长期会话管理。
- 对于需要长期访问 Google API 的场景：在服务器端做 OAuth 授权并安全保管 refresh token。

---

© Dev Notes — PokerPal
