# PokerPal 🃏

一个现代化的扑克筹码管理应用，基于 React Native + Expo 开发，支持实时游戏跟踪、玩家统计和历史记录管理。

## 项目摘要（简短）

PokerPal 是一款面向线下/线上扑克活动的筹码与结算管理工具。应用使用 Expo + React Native 开发，数据在本地通过 SQLite 和 AsyncStorage 持久化，同时可选地同步到 Firebase（Firestore / Auth），以支持跨设备历史与统计。项目使用 TypeScript、Zustand 做状态管理，并优先保证离线优先与恢复同步的健壮性。

主要设计目标：
- 本地优先：在无网络时仍能完整记录与恢复游戏数据。
- 多存储层：内存（Zustand）、AsyncStorage 缓存、本地 SQLite 备份、以及可选的 Firebase 同步。
- 易用的玩家与结算界面，以及详细的玩家统计（盈利、ROI、曲线等）。

## 关键文件快速导航

下面是开发者第一次接触代码时最值得打开的文件，用于理解入口、状态与持久化：
- `App.tsx` — 应用入口，导航与全局初始化（settings、local DB、auth 恢复）。
- `src/screens/GamePlayScreen.tsx` — 游戏进行/结算主流程（保存历史、本地 sqlite 写入、Firebase 写入与 finalize 流）。
- `src/stores/useGameStore.ts` — 游戏状态管理与持久化策略（partialize/migrations）。
- `src/firebase/config.ts` — Firebase 初始化与 React Native persistence 的兼容处理。
- `src/services/localGameService.ts` — 本地游戏读写与与 SQLite 的交互逻辑。
## ✨ 功能特点


## 🏗️ 技术架构

### 核心技术栈
- **前端**: React Native + Expo SDK
- **状态管理**: Zustand + AsyncStorage 持久化
- **本地数据库**: SQLite (expo-sqlite)
- **云端服务**: Firebase (Firestore + Auth)
- **语言**: TypeScript
- **构建工具**: Expo CLI

### 数据流架构
```
用户操作 → Zustand Store → 本地 SQLite → Firebase 同步
                ↓
            AsyncStorage 缓存
```

## 🚀 快速开始

### 环境要求
- Node.js 16+
- Expo CLI
- Android Studio (Android 开发) 或 Xcode (iOS 开发)

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/wilsonnnnnd/pokerpal.git
cd pokerpal
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
创建 `.env` 文件并配置 Firebase 密钥：
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

4. **启动开发服务器**
```bash
npm start
```

5. **运行应用**
```bash
# Android
npm run android

# iOS
npm run ios
```

## 📁 项目结构

```
src/
├── assets/          # 静态资源 (图片、音效)
├── components/      # 可复用组件
├── constants/       # 常量定义 (颜色、梯度、命名)
├── firebase/        # Firebase 服务层
├── hooks/           # 自定义 React Hooks
├── middleware/      # Zustand 中间件
├── screens/         # 页面组件
├── services/        # 业务服务层
├── stores/          # Zustand 状态管理
├── types/           # TypeScript 类型定义
└── utils/           # 工具函数
```

### 关键文件说明

- `App.tsx` - 应用入口，配置导航和初始化
- `src/stores/useGameStore.ts` - 游戏状态管理
- `src/stores/usePlayerStore.ts` - 玩家数据管理
- `src/firebase/config.ts` - Firebase 配置和初始化
- `src/services/localDb.ts` - SQLite 数据库服务
- `src/utils/formatSnapshot.ts` - 数据格式化工具

## 🎮 使用指南

### 创建新游戏
1. 在首页点击"新游戏"
2. 设置盲注和筹码比例
3. 添加玩家并设置买入金额
4. 开始游戏跟踪

### 游戏管理
- **添加买入**: 玩家追加筹码时记录
- **玩家状态**: 标记玩家离开/返回
- **实时计算**: 自动计算盈亏和 ROI
- **游戏结算**: 设置最终筹码并完成游戏

### 数据查看
- **游戏历史**: 查看所有已完成游戏
- **玩家排名**: 基于总盈利和 ROI 排序
- **详细统计**: 单个游戏和玩家的详细数据

## 🔧 开发指南

### 数据格式化标准
项目使用统一的数值格式化标准：
- **现金金额**: 保留 2 位小数 `Number(amount.toFixed(2))`
- **ROI 比率**: 保留 6 位小数 `Number(roi.toFixed(6))`
- **筹码数量**: 整数 `Math.round(chips)`

### 状态管理模式
```typescript
// 读取状态
const game = useGameStore(state => state.gameId);

// 更新状态
const setGame = useGameStore(state => state.setGame);
setGame({ gameId: 'new-game-id', ... });
```

### 数据持久化层次
1. **内存状态** (Zustand) - 实时操作
2. **本地缓存** (AsyncStorage) - 快速恢复
3. **本地数据库** (SQLite) - 离线备份
4. **云端同步** (Firebase) - 跨设备同步

### 错误处理和重试
项目实现了多层错误处理：
- 网络操作使用指数退避重试
- 本地数据库操作有内存回退机制
- Firebase 操作失败时保存到本地队列

## 🧪 测试

```bash
# TypeScript 类型检查
npx tsc --noEmit

# 运行测试 (如果有)
npm test
```

## 📱 构建发布

### Android
```bash
# 开发构建
expo build:android

# 生产构建
eas build --platform android
```

### iOS
```bash
# 开发构建
expo build:ios

# 生产构建
eas build --platform ios
```

### 代码风格
- 使用 TypeScript 严格模式
- 遵循 ESLint 配置
- 组件使用函数式组件 + Hooks
- 状态管理优先使用 Zustand

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [React Native](https://reactnative.dev/) - 跨平台移动开发框架
- [Expo](https://expo.dev/) - React Native 开发平台
- [Firebase](https://firebase.google.com/) - 后端即服务平台
- [Zustand](https://github.com/pmndrs/zustand) - 轻量级状态管理库


**PokerPal** - 让扑克游戏管理更简单 🎯