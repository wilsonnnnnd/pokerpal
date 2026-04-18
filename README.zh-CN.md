# PokerPal

PokerPal 是一个用于记录德州扑克局（现场/线上）的筹码与结算管理应用，基于 Expo + React Native 开发（TypeScript）。

English README: [README.md](./README.md)

[![GitHub stars](https://img.shields.io/github/stars/wilsonnnnnd/pokerpal?style=social)](https://github.com/wilsonnnnnd/pokerpal.git)

如果您觉得这个项目有用，请在 GitHub 上给它点个星——这有助于其他人发现这个项目，并支持项目的持续开发。谢谢！

## 功能概览

- 牌局记录：盲注、筹码面额、buy-in、离桌/回归、结算
- 数据统计：Profit、ROI、出场次数等维度的排行与汇总
- 快速记录：Quick Record 用更少步骤记录一局结算
- 邀请加入：生成加入链接/二维码（形如 `https://hdpoker.xyz/join/<gameId>?token=...`）
- 本地优先：离线可用（AsyncStorage + SQLite），可在网络恢复后再同步
- 可选云端：Firebase Auth + Firestore（部分写入逻辑以 host 权限为前置）

## 技术栈

- Expo SDK 54、React Native 0.81、React 19
- TypeScript（`strict: true`）
- 导航：React Navigation（native-stack）
- 状态管理：zustand（persist 到 AsyncStorage）
- 本地存储：expo-sqlite（带内存回退实现）+ AsyncStorage
- 云端：Firebase（Auth / Firestore）
- 其他：axios、react-native-qrcode-svg、react-native-toast-message、yup

## 快速开始

### 环境要求

- Node.js 18+（建议与 Expo SDK 54 的运行要求保持一致）
- npm
- Android Studio（Android）/ Xcode（iOS，需 macOS）

### 安装依赖

```bash
npm install
```

### 环境变量（Firebase 可选）

1) 复制 `.env.example` 为 `.env`
2) 填写 Firebase 配置（Expo 通过 `EXPO_PUBLIC_` 前缀暴露到客户端）：

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID`（可选，代码中支持）

iOS 若启用 Firebase/Google 相关能力：

- 将 `GoogleService-Info.plist` 放到仓库根目录（路径见 [app.json](./app.json)）

### 启动开发环境

```bash
npm start
```

### 运行到设备/模拟器

```bash
npm run android
npm run ios
npm run web
```

## 构建与发布（EAS）

仓库已配置 [eas.json](./eas.json) 的 profiles：`development` / `preview` / `production`。

```bash
# Android 内部包（apk）
eas build --profile development --platform android

# Android 预发布（apk）
eas build --profile preview --platform android

# Android 上架（aab）
eas build --profile production --platform android

# iOS（示例）
eas build --profile production --platform ios
```

提交（示例）：

```bash
eas submit --profile production --platform android
```

## 项目结构

```
src/
├── assets/      静态资源（图片/音效/样式）
├── components/  组件（通用/游戏/设置等）
├── constants/   常量与配置
├── firebase/    Firebase 初始化与读写封装
├── hooks/       自定义 hooks（权限/页面状态/统计等）
├── i18n/        文案与本地化
├── providers/   全局 Provider（Auth/Settings/Popup）
├── screens/     页面
├── services/    本地/网络服务层（localDb、auth、storage 等）
├── stores/      zustand stores
├── types/       类型定义
└── utils/       工具函数
```

## 关键入口

- [App.tsx](./App.tsx)：应用启动、Provider、导航
- [localDb.ts](./src/services/localDb.ts)：SQLite schema 与执行封装（含内存回退）
- [firebase/config.ts](./src/firebase/config.ts)：Firebase 初始化（读取 `EXPO_PUBLIC_*` 环境变量）
- [useGameStore.ts](./src/stores/useGameStore.ts)：牌局关键字段的 store（persist 到 AsyncStorage）

## 数值格式约定

- 金额：保留 2 位小数 `Number(amount.toFixed(2))`
- ROI：保留 6 位小数 `Number(roi.toFixed(6))`
- 筹码：整数 `Math.round(chips)`

## 工程校验

```bash
npx tsc --noEmit
```

## 安全

安全问题请按 [SECURITY.md](./SECURITY.md) 的方式私下报告。
