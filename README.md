# Action Hub

**DSH 的标准 Agent Skill 库：同一份 `SKILL.md`，可以当模型可调用的 Skill，也可以只当你能调用的 Command。**

[English](README.en.md) · [更新日志](CHANGELOG.md) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![version](https://img.shields.io/badge/version-6.0.0-green.svg)](CHANGELOG.md)
[![dsh](https://img.shields.io/badge/dsh-0.2.x-4f46e5.svg)](package.json)

## 核心理念

- **文件即标准**：每个条目就是一个标准目录 `SKILL.md` + 资源文件，不生成 `action.json`，不往 frontmatter 里塞插件私有字段。
- **模式在本地**：`Command` / `Skill` 是同一文件的两种本机使用方式，切换不改文件、不复制正文。
- **Command 零上下文**：默认不注册给模型，只在 Action 面板里由你主动调用。
- **Skill 可被模型调用**：只有你显式切换后才会进入模型目录；切换会显示上下文成本。
- **项目范围**：每个条目可以只允许在指定项目使用；范围存本地，不随分享包走。
- **导入零转换**：网上下载的 SKILL.md 目录/ZIP 原样导入，导出也是原样标准目录。

## 使用

### 面板

`Alt + A`（macOS `⌥ + A`）或输入框工具行按钮打开：

- 中文名、描述、标签、正文均可搜索；
- 每行显示 `[Command]` / `[Skill]` 与范围；
- Command：无参数插入引用 chip，有参数插入展开后的正文；
- Skill：插入 `/skill-name`，由 DSH 原生加载技能正文；
- `Enter` / `Tab` 插入，`Ctrl/⌘ + Enter` 发送。

### 管理

`Ctrl + Alt + A`（macOS `⌘ + ⌥ + A`）或管理页：

- 新建/编辑标准技能（`name` 必须是 kebab-case）；
- 切换 Command / Skill；
- 配置“所有项目”或勾选指定项目；
- 导入文件夹/ZIP，导出单条或整库。

### 导入任意标准 Skill

导入目录必须包含 `SKILL.md`：

```text
my-skill/
  SKILL.md
  ...资源文件
```

```markdown
---
name: my-skill
description: 一句话说明何时使用
---

正文……
```

导入后默认是 **Command**。需要在编辑器里切换为 **Skill**，模型才能自行调用；切换前会提示上下文成本。

## 数据

```text
~/.dsh/dsh-action-hub/
  library/<skill-name>/
    SKILL.md       # 唯一事实源，标准格式
    ...资源
  state.json       # 本机状态：mode / scope / category / pin / usage
```

- 不创建 `action.json`；
- 升级自 5.x 时，旧 `actions/` 会归档到 `backup-v5-test-*`，新库为空，不做兼容迁移；
- 分享包只包含标准技能目录，不包含 `state.json`，因此模式/范围/分类不会随包分享。

## 项目范围

- 范围只做全局 + 项目级；
- 项目来源是 DSH 已登记工作区，不手输路径；
- 范围在 provider 和 Command 注入点各校验一次；
- 未知项目/scope 损坏时默认不可用（fail-closed）。

## 开发

```bash
npm install
npm test
```

客户端由 `src/client/*.js` 拼接为 `client.js`；Host 入口 `index.js`，标准文档解析在 `skill-doc.js`。

## 限制

- 原生 `/` 菜单按 ASCII name 搜索，中文搜索请用 Action 面板；
- Skill 目录变化会让模型目录整体重发一次；切换前请留意成本提示；
- 当前版本不提供 agent/preset 级范围。
