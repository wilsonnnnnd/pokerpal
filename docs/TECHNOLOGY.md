# PokerPal — 技术栈与项目概览

本文档把当前仓库中使用到的主要技术、关键库、项目目录结构与常见运行命令做成简明索引，方便开发者快速了解代码基线与追踪实现位置。内容基于仓库的 `package.json`、`App.tsx`、`tsconfig.json` 与源码目录。

---

## 一、总体概览

- 平台：Expo（托管 / managed workflow）
- 框架：React Native
- 语言：TypeScript
- UI 与导航：React Navigation（Native Stack）
- 状态管理：zustand（带持久化）
- 后端与认证：Firebase（Firestore + Auth）
- 本地持久化：SQLite（expo-sqlite）与 AsyncStorage（@react-native-async-storage/async-storage）

---

## 二、关键依赖（来自 package.json）

- expo — 管理工具与运行时（版本见 `package.json`）
- react, react-native — 基础库
- @react-navigation/native, @react-navigation/native-stack — 导航
- firebase — Firestore / Auth
- zustand — 轻量状态管理
- @react-native-async-storage/async-storage — 本地 key-value 持久化
- expo-sqlite — 本地 SQLite 支持（用于 actions / 本地历史）
- react-native-reanimated, react-native-gesture-handler — 动画与手势
- @expo/vector-icons, expo-linear-gradient — UI 装饰与图标
- react-native-qrcode-svg, react-native-svg — 二维码与 SVG
- react-native-toast-message — 全局提示
- axios — HTTP 客户端
- uuid — 本地 id 生成
- yup — 表单校验

（完整依赖请参见根目录 `package.json`）

---

## 三、项目结构（高层）

- `App.tsx`：应用入口，导航、Provider 与本地 DB 初始化（见 `App.tsx`）。
- `src/screens/`：应用页面（GamePlay、GameHistory、QuickRecord 等）。
- `src/components/`：可复用 UI 组件（Header、Input、PrimaryButton 等）。
- `src/services/`：本地/远端服务封装（`localDb.ts`, `localGameService.ts`, `storageService.ts`, `authService`）。
- `src/firebase/`：Firestore 写入/读取逻辑（`saveGame.ts`, `gameWriters.ts`, `fetchUser.ts` 等）。
- `src/stores/`：全局状态（`useGameStore.ts`, `usePlayerStore.ts` 等，基于 zustand）。
- `src/hooks/`：自定义 Hooks（`usePermission.ts`, `useGameStats.ts` 等）。
- `src/i18n/`：国际化（`simpleT.ts`）。
- `docs/`：项目文档（包括本文件、GAME_UPLOAD_FLOW.md 等）。

---

## 四、关键实现点与文件索引（快速定位）

- 导航与路由：`App.tsx`（RootStackParamList、Stack.Navigator）
- 本地快照与历史：`src/services/localGameService.ts`, `src/services/localDb.ts`
- 云端保存/上传：`src/firebase/saveGame.ts`, `src/firebase/gameWriters.ts`
- 权限判定（host / player）：`src/hooks/usePermission.ts`（基于 auth 与远端角色检查）
- 全局状态：`src/stores/useGameStore.ts`, `src/stores/usePlayerStore.ts`
- i18n：`src/i18n/simpleT.ts`
- 主要 UI 组件示例：`src/components/Header.tsx`, `src/components/common/PrimaryButton.tsx`, `src/components/common/InputField.tsx`

---

## 五、开发与运行（本地）

在 Windows/PowerShell 下的典型命令：

```powershell
npm install
npm start       # 启动 Expo Metro
npm run android # 在已配置的 Android 环境中运行
npm run ios     # 在 macOS 上运行 iOS（若可用）
```

注意：项目使用 Expo；如需在真机或模拟器上运行，请安装并配置 Expo CLI 与原生开发依赖。

---

## 六、代码风格与工程约定

- TypeScript 严格模式：`tsconfig.json` 使用 `strict: true`。
- 路径别名：`@/*` 映射到 `./src/*`（参见 `tsconfig.json`）。
- 持久化策略：部分 zustand store 使用 `persist`（仅选择小型原始字段持久化，避免序列化函数）。
- 本地与云端区分：无论是否为 host，客户端会写入本地 snapshot；只有 `usePermission().isHost === true` 时才由客户端发起对 `/games/*` 的云端写入（详见 `saveGame` 调用点）。

---

## 七、建议的后续工作（可选）

1. 把本文件加入仓库的 README 或 `docs/`（已生成）。
2. 生成一份 `firestore.rules` 草案并在 Firebase emulator 中测试，确保服务端强制约束 host-only 写入权限。代码内虽有客户端判断，但必须靠规则保证安全。
3. 提取 `package.json` 中的依赖与用途映射到单独表格，便于安全与合规审计。

---

如果你希望我把此文件与 `firestore.rules` 草案或依赖映射一并提交，请告诉我接下来的优先项。
