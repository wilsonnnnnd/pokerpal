# 版本 v1.1.4（2025-11-01） — 简短更新（适用于 App Store "What's New"）

主要改动（一条条列出功能变化）：

- 优化：为用户资料加载实现并发去重与短期缓存，显著减少重复网络请求并加快资料显示。
- 权限改进：集中权限判断，访客或非 host 用户不再触发 host-only 的线上数据请求，节省流量并保护隐私。
- 顾客体验：新增统一访客占位组件 `GuestPlaceholder`，host-only 页面在访客模式下显示更一致的提示与文案。
- 本地数据管理：新增 `localDb.clearDatabase()` 作为单点本地历史清理入口；Settings 使用该接口，移除模糊 AsyncStorage 删除以降低误删风险。
- 屏幕/组件迁移：多个屏幕（Home、Profile、AddPlayerCard 等）改为使用 `usePermission` Hook 获取 auth/profile/isHost，移除了重复订阅与多处 fetch。
- GameHistory：对无云端权限的用户仅显示本地历史，云端选项显示本地化提示（`no_cloud_permission`）。
- 兼容性修复：处理 Firestore profile 中 `nickname` 字段映射为 `displayName` 的情况，避免类型/显示错误。
- 稳定性：修复与 profile 拉取、权限判断相关的 race condition，提高整体稳定性与一致性。

（如需更详细的变更描述，请参见 `docs/CHANGES-since-last-commit.md`）
