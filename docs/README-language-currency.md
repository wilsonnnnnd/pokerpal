# 语言与货币配置维护指南

本文档用中文说明应用中语言与货币如何修改、持久化与运行时行为，方便后续维护与扩展。

---

## 概览
- 主要入口：
  - 语言：`src/components/settings/SoftwareSettings.tsx`（SelectField）→ `SettingsProvider.setLanguage`
  - 货币：`src/components/settings/SoftwareSettings.tsx`（SelectField）→ `SettingsProvider.setCurrency`
- 配置与常量集中放在：`src/constants/appConfig.ts`（包含 `LANGUAGES`, `CURRENCIES`, `DEFAULT_*`）
- 持久化键：`SETTINGS_KEY`（通过 `src/services/storageService` 的 `getLocal/setLocal`）
- i18n：使用轻量 `src/i18n/simpleT.ts`，由 `SettingsProvider` 在初始化与切换语言时调用 `setSimpleTLocale` 来即时生效。

---

## 语言 (Language)

### 支持列表（当前）
- `zh` — 中文（nameKey: `language_name_zh`）
- `en` — English（nameKey: `language_name_en`）

常量位置：`src/constants/appConfig.ts` 中的 `LANGUAGES`。

### 更改时的流程（运行时）
1. 用户在 `SoftwareSettings` 的 `SelectField` 中选择语言 code（例如 `en`）。
2. `SoftwareSettings` 调用 `SettingsProvider.setLanguage(code)`。
3. `SettingsProvider.setLanguage`：
   - 立即更新内部 state（`language`），使 React 组件重新渲染。
   - 调用 `setSimpleTLocale(code)`，使 `simpleT` 模块级默认 locale 切换，当前页面翻译即时生效。
   - 读取本地 `SETTINGS_KEY`（若存在），将 `language` 与已有设置合并并写回 `SETTINGS_KEY`（异步）。
   - 可选地更新全局同步对象 `(global as any).__pokerpal_settings = merged`，供非 React 代码快速读取。

### 注意点 / 维护提示
- 语言切换为即时生效，不再需要额外的“保存”按钮。
- `simpleT` 在找不到翻译条目时会返回 key 本身，UI 需要提供友好回退（如显示 code 的大写或默认文案）。

### 添加新语言步骤
1. 在 `src/constants/appConfig.ts` 的 `LANGUAGES` 中加入新项（包含 `code` 与 `nameKey`）。
2. 在 `src/i18n/simpleT.ts` 中为新 `nameKey` 与其他需要翻译的条目添加对应翻译（中英文）。
3. 无需改动 `SettingsProvider`，但建议在模拟器里测试：切换语言并重启应用确认持久化生效。

---

## 货币 (Currency)

### 支持列表（当前）
- `AUD` — 澳元（nameKey: `currency_name_aud`，符号 `$`）
- `CNY` — 人民币（nameKey: `currency_name_cny`，符号 `¥`）

常量位置：`src/constants/appConfig.ts` 中的 `CURRENCIES` 与 `DEFAULT_*`（如 `DEFAULT_FROM_CURRENCY`, `DEFAULT_TO_CURRENCY`）。

### 更改时的流程（运行时）
1. 用户在 `SoftwareSettings` 的 `SelectField` 中选择货币 code（例如 `CNY`）。
2. `SoftwareSettings` 调用 `SettingsProvider.setCurrency(code)`。
3. `SettingsProvider.setCurrency`：
   - 立即更新内部 state（`currency`），使 React 组件重新渲染。
   - 将合并后的设置写回本地存储 `SETTINGS_KEY`（异步），并更新 `(global as any).__pokerpal_settings`。
4. 显示逻辑：
   - 格式化使用 `SettingsProvider.formatCurrency(v, code)`（内部优先使用 `Intl.NumberFormat`，发生异常时回退到内部 `symbolMap`）。
   - 组件也可直接使用 `getCurrencySymbol` 或从 `CURRENCIES` 中查符号/名称显示。
5. 汇率（latestExchange）：
   - `SettingsProvider` 在内存中维护单一 `latestExchange`（结构：{from,to,rate,updated,source}），默认 `to` 为 `DEFAULT_TO_CURRENCY`（当前为 `CNY`）。
   - 初始化或刷新时 provider 通过 `getExchangeRate(from, DEFAULT_TO_CURRENCY)` 获取最新汇率并缓存；TTL 为 24 小时（EXCHANGE_TTL_MS）。

### 设计决策（重要）
- 改变 **仅影响展示**（货币符号与格式），不会回溯修改历史交易数据或之前保存的汇率记录。
- 若需要对历史数据进行重新计算/回溯，必须实现明确的 migration 脚本；当前不自动进行任何历史修改。

### 添加新货币步骤
1. 在 `src/constants/appConfig.ts` 的 `CURRENCIES` 中添加新货币（`code` 与 `nameKey`）。
2. 在 `src/i18n/simpleT.ts` 添加对应 `currency_name_xxx` 的翻译。
3. 若新货币需要与 `DEFAULT_TO_CURRENCY` 以外的目标货币进行汇率管理，需扩展 `SettingsProvider` 的汇率结构（目前 `latestExchange` 只保存单一目标 to）。
4. 测试：切换货币，检查 `formatCurrency` 输出与 `SettleSummaryModal` 的 RMB 显示/编辑行为。

---

## 持久化细节
- 存储键：`SETTINGS_KEY`（通过 `src/services/storageService.getLocal/setLocal`）。
- 存储结构示例：
```json
{
  "language": "zh",
  "currency": "AUD",
  "latestExchange": {"from":"AUD","to":"CNY","rate":4.7,"updated":"...","source":"local"}
}
```
- 全局快捷读：`(global as any).__pokerpal_settings`（仅为快速同步，不替代 React 状态）。

---

## 常见边界与异常处理
- 未选择 language/currency：provider 会使用 `getDefaults()` 提供的值并写回本地。
- 网络请求失败：`updateExchangeRates`/`getExchangeRate` 失败时，provider 会回退使用缓存或 `DEFAULT_EXCHANGE_RATE`。
- Intl 不支持某 currencyCode：`formatCurrency` 捕获异常并回退为 `symbolMap`（如 `{AUD:'$',CNY:'¥'}`）。
- 字符串大小写：比较货币 code 时请统一 `toUpperCase()`，并注意别名（如 `'CN'` 与 `'CNY'`）在代码中有出现。

---

## 开发与维护建议
- PR 要求：在提交时运行 `npx tsc --noEmit` 与 `npm run lint`。
- 替换字面量：在修改货币相关逻辑时，避免硬编码 `'CNY'/'AUD'`，使用 `src/constants/appConfig.ts` 中的常量。
- 测试：添加 `SettingsProvider` 的单元测试，覆盖初始化合并、`setLanguage`/`setCurrency` 的持久化、`updateExchangeRates` 的成功与失败路径。
- 历史数据迁移：若未来要修改历史数据的货币换算，需要先设计 migration 脚本并在存储中写入版本号字段。

---

## 例子（流程示例）

### 切换语言（示例）
- UI 操作：`SoftwareSettings.SelectField.onChange('en')`
- 代码顺序：
  1. `SettingsProvider.setLanguage('en')`
  2. `setLanguageState('en')`（触发 UI 刷新）
  3. `setSimpleTLocale('en')`（simpleT 立即使用新 locale）
  4. 读取/合并 `SETTINGS_KEY` 并 `setLocal(SETTINGS_KEY, merged)`

### 切换货币（示例）
- UI 操作：`SoftwareSettings.SelectField.onChange('CNY')`
- 代码顺序：
  1. `SettingsProvider.setCurrency('CNY')`
  2. `setCurrencyState('CNY')`（触发 UI 刷新）
  3. 写回 `SETTINGS_KEY`（异步）
  4. UI 使用 `formatCurrency(value, 'CNY')` 显示 `¥` 符号（历史数据不变）

---

若需要，我可以：
- 把本文件再转为中文 PDF 或加入仓库首页文档索引；
- 补充 `SettingsProvider` 单元测试模版并创建一个简单测试文件；
- 执行一次仓库的 lint 检查并修复小问题。

文件已保存：`docs/README-language-currency.md`。