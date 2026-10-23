# Action Hub

**DSH 的标准 Agent Skill 库：同一份 `SKILL.md`，可以当模型可调用的 Skill，也可以只当你能调用的 Command。**

本文把 **Skill** 和 **Command** 统称为 **Action**。可用范围只影响 Action 在哪个项目中可见、可调用，不写进 `SKILL.md`。

[English](README.en.md) · [更新日志](CHANGELOG.md) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![version](https://img.shields.io/badge/version-8.3.0-green.svg)](CHANGELOG.md)
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
- Skill：插入技能正文；Agent 仍可按需自行调用，但 Action Hub 管理的条目不会出现在 `/` 菜单；
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

导入后默认是 **Command**。需要在 Action 列表右键菜单中切换为 **Skill**，模型才能自行调用；切换前会提示上下文成本。

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

## 分组与项目范围

- Action 可以属于多个分组（例如 Common、AgilityDog、漫剧）；
- 分组对话框可以直接勾选该分组包含的 Action，不必逐个编辑 Action；
- 分组可以包含其他分组（如 Art 包含 Figma），自动继承子分组全部 Action；环引用按合并后的整个集合生效；
- 项目在“项目范围”里勾选分组，并可单独追加个别 Action；
- 新 Action 默认不属于任何分组，需要手动加入；可在分组右键菜单中把任意分组设为新工作区默认分组；
- 未配置的新项目默认只使用已设置的“新工作区默认分组”；未设置时没有任何分组可用；
- 面板会识别当前项目，当前不可用的 Action 会标灰并拒绝插入；
- 会话 cwd 在项目子目录时，按最近的已登记项目根匹配；
- 范围判断由 provider、Command 注入点和面板共用；
- 未知项目或损坏状态按已设置的新工作区默认分组处理；未设置时仅内置 Action 可用。

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
