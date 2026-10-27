# Action Hub

**DSH 的标准 Agent Skill 库：同一份 `SKILL.md`，可以当模型可调用的 Skill，也可以只当你能调用的 Command。**

本文把 **Skill** 和 **Command** 统称为 **Action**。可用范围只影响 Action 在哪个项目中可见、可调用，不写进 `SKILL.md`。

[English](README.en.md) · [更新日志](CHANGELOG.md) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![version](https://img.shields.io/badge/version-8.8.0-green.svg)](CHANGELOG.md)
[![dsh](https://img.shields.io/badge/dsh-0.2.x-4f46e5.svg)](package.json)

## 核心理念

- **文件即标准**：每个条目就是一个标准目录 `SKILL.md` + 资源文件，不生成 `action.json`，不往 frontmatter 里塞插件私有字段。
- **模式在本地**：`Command` / `Skill` 是同一文件的两种本机使用方式，切换不改文件、不复制正文。
- **Command 零上下文**：默认不注册给模型，只在 Action 面板里由你主动调用。
- **Skill 可被模型调用**：只有你显式切换后才会进入模型目录；切换会显示上下文成本。
- **项目范围**：每个条目可以只允许在指定项目使用；范围存本地，不随分享包走。
- **全局分组**：任意分组可标记为所有工作区通用，新工作区无需配置即可继承。
- **开箱即用**：新安装默认带一个全局 `Common` 分组，其中已预置 `skill-import-assistant`。
- **项目级屏蔽**：项目可以屏蔽继承来的分组或 Action，而不影响其他工作区。
- **导入零转换**：网上下载的 SKILL.md 目录/ZIP 原样导入，导出也是原样标准目录。

## 使用

### 面板

`Alt + A`（macOS `⌥ + A`）或输入框工具行按钮打开：

- 中文名、描述、标签、正文均可搜索；
- 搜索默认按子串匹配；输入框右侧 `.*` 按钮或 `Alt+R` 可切换为正则表达式搜索；
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

导入预览中，每个新增 Action 可以选择 **导入为新 Command** 或 **导入为新 Skill**；默认是 Command。选择 Skill 后模型可直接调用，切换前会提示上下文成本。已有本地副本仍可选择更新或跳过。

## 数据

```text
~/.dsh/dsh-action-hub/
  library/<skill-name>/
    SKILL.md       # 唯一事实源，标准格式
    ...资源
  state.json       # 本机状态：mode / scope / category / pin / usage / 全局分组 / 项目屏蔽
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
- 任意分组可标记为“全局”：该分组及其子分组的 Action 对所有工作区生效，无需逐个配置，新增工作区也会直接可用；
- 项目可以屏蔽继承来的分组或 Action（灰叉），不必取消全局；直接勾选的分组/Action 优先于屏蔽；
- 未配置的新项目默认只使用已设置的“新工作区默认分组”；未设置时没有任何分组可用；
- 面板会识别当前项目，当前不可用的 Action 会标灰并拒绝插入；
- 会话 cwd 在项目子目录时，按最近的已登记项目根匹配；
- 范围判断由 provider、Command 注入点和面板共用；
- 未知项目或损坏状态按已设置的新工作区默认分组处理；未设置时仅内置 Action 可用。

### 全局分组

在 **Action 分组** 中右键任意分组，选择 **设为所有工作区通用**。分组名旁会出现 **全局** 徽标。

首次安装（没有旧 `state.json`）时，插件会默认创建一个名为 **Common** 的全局分组，并把内置 Action `skill-import-assistant` 放进去。因此新用户装好插件后，新工作区无需配置就能看到它。已有 `state.json` 的用户不会被自动改写。

- 该分组及其子分组里的所有 Action 自动对所有工作区可用；
- 新建工作区、未配置工作区都会直接继承，不需要逐个配置；
- 全局分组可以随时右键 **取消所有工作区通用**；
- 项目仍然可以追加自己的分组和 Action，全局分组是“保底可用”，不是排他范围。

### 项目级屏蔽

打开 **项目可用范围** 后，分组和 Action 有三种状态：

| 状态 | 含义 | 点击后 |
| --- | --- | --- |
| 蓝勾 | 当前项目直接选中 | 取消直接选中 |
| 灰勾 | 通过全局/父分组继承可用 | 变成灰叉，在当前项目屏蔽 |
| 灰叉 | 当前项目主动屏蔽 | 恢复继承 |

规则：

- 屏蔽分组会连同其子分组一起屏蔽；
- 屏蔽 Action 只影响该 Action；
- 直接选择优先于屏蔽：在全局分组被屏蔽后，仍可单独勾选其中某个子分组或 Action 来重新启用；
- 要屏蔽一个已经蓝勾的分组，先取消直接选中，再把它从灰勾切成灰叉；
- 内置 Action 是基线权限，默认始终可用；如要排除某个内置 Action，请在 Action 列表里直接把它切成灰叉。分组级屏蔽不改变内置 Action 的基线权限。

优先级从高到低：

1. 项目直接选中的 Action；
2. 项目直接选中的分组及其子分组；
3. 全局分组或父分组继承来的权限；
4. 项目级屏蔽。

示例：把 `Common` 设为全局后，在 `P2` 中屏蔽 `Common`，P2 不再显示 Common 的 Action；其他工作区不受影响。若只想在 P2 恢复其中一条 Action，直接在 P2 的 Action 列表里勾选该条即可。

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
