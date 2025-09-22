# PokerPal UI / UX 设计规范（轻量版）

本文件汇总项目中使用的设计 token（颜色、间距、圆角、阴影、卡片与按钮样式），并给出使用建议与常见组件参考。目的是统一视觉与交互，减少随意 CSS 与重复样式。

> 位置：项目样式与色板定义位于 `src/constants/color.palette.ts` 与 `src/assets/styles.tsx`。

## 1. 颜色（Palette）
- 背景色
  - background: #FFFFF0 (页面主背景)
  - lightBackground: #FFFFFF (浅色卡片/面板背景)
- 交互主色
  - primary: #d46613 (主要操作按钮)
  - highLighter: #F0845D (强调色)
- 文本
  - title: #333 (主标题)
  - text: #666666 (主体文字)
  - lightText: #FFFFFF (浅色文本)
  - mutedText: #999999 (次级文本)
  - valueText: #2c3e50 (数值/重要信息)
- 状态色
  - success: #ACBD86
  - info: #A4C8E1
  - confirm: #ACBD86
  - cancel: #FFA06F
  - error: #F44336
  - warning: #FFA000
- 辅助/灰阶
  - lightGray: #F7F7F7
  - mediumGray: #E0E0E0
  - darkGray: #424242
  - weakGray: #BDBDBD
  - strongGray: #757575
- 阴影
  - shadowLight: rgba(0, 0, 0, 0.06)
  - shadowDark: rgba(0, 0, 0, 0.2)

使用建议：优先使用 `Palette` 导出的 token，避免在组件中直接写死颜色值。

## 2. 间距（Gaps / Spacing）
- 常用间距：8 / 12 / 16 / 24 / 32
- 容器内边距（card / panel）通常使用 12-24，表单字段使用 12，页面主要容器使用 24。
- 水平按钮间距与卡片内控件间距：使用 8 或 12 保持一致性。

示例：
- 卡片内 padding: 12–16
- 页面 content padding: 24（已在 `HomePagestyles.contentContainer` 使用）

## 3. 圆角（Radius）
- 常用 radius：8 / 12 / 16
- 用户卡（userCard）、actionsCard 采用 16
- 按钮、输入框、内部小卡片使用 12
- Avatar 圆角：avatar 为完全圆形（宽高相等，radius = width/2），例如 48 → radius 24

## 4. 阴影与层级
- 卡片与浮层使用轻微阴影：shadowColor: `shadowLight`, shadowOffset: {0, 4}, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5
- Modal / overlay 使用 `overlayDark` 或 `overlayLight`，有需要时遮罩不应遮挡关键提示信息

## 5. 字体与字号
- 标题：24（主标题）、18（卡片/列表项标题）、16（正文）
- 按钮：14–16，权重 600–800
- 辅助文本：12

## 6. 按钮样式
- Primary 按钮（主要操作）
  - 背景：`primary` 或 `success`（视场景），文字：`lightText`
  - 圆角：12
  - 内边距：垂直 12–16
- Secondary / outline 按钮
  - 背景：transparent，边框 `borderColor`
  - 文字颜色：`text` 或 `info`

在组件层面优先使用 `PrimaryButton`，不要重复实现按钮样式。

## 7. 卡片（Card）
- 统一卡片样式 `card`（见 `styles.card`）
  - padding: 30（或 12/16 对于小卡片）
  - borderRadius: 16
  - 背景：`card` 或 `lightBackground`
  - 阴影：shadowLight + elevation

## 8. 图标与语义
- 使用 `@expo/vector-icons` 中的 `MaterialCommunityIcons`，图标名需来源于此库。
- 图标大小与语义：列表 icon 16–20，主要页面 icon 48，avatar 内 icon 20

## 9. 色彩与可访问性建议
- 对比度：确保文字与背景对比满足可读性（尤其是 `mutedText` 与浅背景）
- 交互颜色（success/error）用于强调，不建议用作大面积背景色

## 10. 设计 token 目录（建议）
- Palette（已有）
- Spacing（建议建立常量）
- Radius（建议建立常量）
- Elevation / Shadow（建议建立常量）

## 11. 迁移与一致性策略
- 新组件应复用 `src/assets/styles.tsx` 中的 style 片段或 `Palette`。
- 禁止在组件中直接写硬编码颜色 / 圆角 / 间距，所有 token 需来自 constants。
- 当需要新的 token（例如更细粒度的 spacing），在 `src/constants` 下新增文件并更新 `docs/UI-UX.md`。

## 12. 示例片段（快速复制）
卡片：
```tsx
<View style={{ padding: 16, borderRadius: 16, backgroundColor: Palette.lightBackground, shadowColor: Palette.shadowLight, elevation: 5 }}>
  {/* content */}
</View>
```

按钮 primary：
```tsx
<PrimaryButton title="主要操作" variant="filled" />
```

## 13. 后续建议
- 将 `docs/UI-UX.md` 里列出的 token 以 TypeScript 常量形式导出并在样式文件中引用。
- 为常用组件（Button、Card、Input、InfoRow）写 Storybook 或至少提供示例屏（方便设计对齐）。
- 在 PR 模板里添加“UI token 使用检查”步骤，确保新增样式复用 token。

---

如果你希望我把这些设计 token 导出为一个可复用的 `design-tokens.ts`（或 `.json`）并替换样式中硬编码的值，我可以继续做这项迁移（会修改 `src/constants` 与若干样式文件）。
