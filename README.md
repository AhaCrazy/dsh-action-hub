# dsh-action-hub 已迁移

本仓库是 Action Hub 的旧 DSH 插件仓库，已停止独立维护。

Action Hub 现在是一个面向多个 harness 的仓库，DSH 适配器位于：

https://github.com/AhaCrazy/action-hub/tree/main/packages/dsh

## 安装

从 DSH 插件市场安装新的 Action Hub 条目，或使用：

```powershell
dsh plugin --profile web add 'github:AhaCrazy/action-hub#path:/packages/dsh'
```

## 说明

- 本仓库不再发布新版本；
- 源码、问题反馈和发布流程请转到 `AhaCrazy/action-hub`；
- 保留本仓库仅用于历史归档。

---

# dsh-action-hub (moved)

This repository is the legacy DSH-only plugin for Action Hub and is no longer maintained independently.

Action Hub now lives at:

https://github.com/AhaCrazy/action-hub/tree/main/packages/dsh

```powershell
dsh plugin --profile web add 'github:AhaCrazy/action-hub#path:/packages/dsh'
```