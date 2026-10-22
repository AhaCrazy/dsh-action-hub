# 上架记录

目标商店：[awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)（dshmarket / DSH Discover 的同一份目录）。

## 条目

收录只需要在目标仓库新增一个 YAML 文件：`data/plugins/AhaCrazy__dsh-action-hub.yml`，
内容已准备在 [`store/awesome-dsh-plugin.yml`](store/awesome-dsh-plugin.yml)。

```yaml
url: https://github.com/AhaCrazy/dsh-action-hub
name: AhaCrazy/dsh-action-hub
category: workflow
description:
  en: 'Spotlight-style Action shelf for reusable prompts and flows: searchable palette, categories, pinning, Skill import, zero context cost.'
  zh: 'Spotlight 式 Action 收藏夹：可搜索面板、分类与置顶、从 Skill 导入，不占上下文。'
```

## 已满足的要求（来自 contributing.md）

- `package.json` 声明了 `dsh.bundle`（`./cordis.patch.yml` 存在，一行 insert）。
- 仓库是真实可用的代码，README 中英文，MIT。
- 仓库 topic 含 `dsh-plugin`。
- 有作者自选截图：`screenshots.json` + `assets/screenshots/`（4 张）。
- 有 `CHANGELOG.md`，版本 `1.0.0`。
- 无构建脚本、无安装脚本，`dsh plugin add github:...` 可直接安装。
- 不依赖任何未声明的 `@deepseek-ai/*` 运行时包（Host/Client 都只用宿主能力与 Node 内置模块）。

## 待办

- **仓库年龄**：目标仓库要求 GitHub 仓库创建满 1 天。本仓库创建于 2026-10-22 10:24（UTC+8），
  因此 PR 需在 **2026-10-23 10:24 之后** 提交，否则 CI 会拒绝。
- 提交 PR 时只新增一个文件，不要改生成的 README：

  ```text
  data/plugins/AhaCrazy__dsh-action-hub.yml
  ```

- PR 标题建议：`Add dsh-action-hub — Spotlight-style Action shelf for reusable prompts`。

## 可选后续

- 发布到 npm（需要 `npm login`），市场会显示下载量；当前走 GitHub source 安装，不影响收录。
- 收录合并后，在 DSH 插件市场搜索 `Action Hub` 即可一键安装。
