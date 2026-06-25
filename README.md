# Momo Tools — Adobe Illustrator 扩展

面向使用者的安装与说明仓库。

| | |
|---|---|
| **安装包** | [Releases](https://github.com/tomideas/momo-illustrator/releases) 下载 `momo-tools-*-cep.zip` |
| **使用指南** | https://tomideas.github.io/momo-illustrator/ |
| **版本** | v2.108 · Illustrator 17.0 – 99.9 |

---

## 功能概览

| 分组 | 功能 |
|------|------|
| 画板 | 复制 / 重新排列 / 更名 |
| 颜色 | 颜色标签、颜色检查、颜色库（CMYK / JSON 导入导出） |
| 文字 | 样式检查、溢出检查、尾端空白检查 |
| 工具 | 网格系统、批量页码、Momo 笔记 |

详细操作见 [在线使用指南](https://tomideas.github.io/momo-illustrator/)。

---

## 安装

### 1. 下载

打开 [Releases](https://github.com/tomideas/momo-illustrator/releases)，下载最新 **`momo-tools-x.xx.zxp`**（ZXP 安装）或 **`momo-tools-x.xx-cep.zip`**（手动安装），二选一即可。

### 2. 复制到 CEP 扩展目录

| 系统 | 最终路径（文件夹名须为 `com.tomideas.illustratortools`） |
|------|------|
| **macOS** | `~/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/` |
| **Windows** | `%APPDATA%\Adobe\CEP\extensions\com.tomideas.illustratortools\` |

**若目录不存在，需自行逐级创建**（首次安装 CEP 扩展时很常见；Adobe 不会自动建好 `CEP/extensions`）：

| 系统 | 需要存在的父级目录 |
|------|-------------------|
| **macOS** | `~/Library/Application Support/Adobe/CEP/extensions/` |
| **Windows** | `%APPDATA%\Adobe\CEP\extensions\` |

**macOS** — 终端一键创建并打开：

```bash
mkdir -p ~/Library/Application\ Support/Adobe/CEP/extensions
open ~/Library/Application\ Support/Adobe/CEP/extensions
```

然后将解压得到的 **`com.tomideas.illustratortools`** 整个文件夹拖入 `extensions` 内（不要只复制里面的文件）。

**Windows** — 在资源管理器地址栏依次操作：

1. 输入 `%APPDATA%` 回车，进入 `Roaming` 文件夹  
2. 若没有 `Adobe` 文件夹则新建  
3. 在 `Adobe` 下新建 `CEP`，再在 `CEP` 下新建 `extensions`  
4. 将 **`com.tomideas.illustratortools`** 文件夹放入 `extensions`

或在「命令提示符」执行：

```cmd
mkdir "%APPDATA%\Adobe\CEP\extensions"
explorer "%APPDATA%\Adobe\CEP\extensions"
```

**快捷打开**（目录已存在时）：  
**macOS**：`open ~/Library/Application\ Support/Adobe/CEP/extensions/`  
**Windows**：资源管理器输入 `%APPDATA%\Adobe\CEP\extensions`

### 3. 启用未签名扩展（首次必做）

**macOS**（Illustrator 完全退出后执行）：

```bash
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
```

**Windows**（命令提示符）：

```cmd
reg add HKCU\Software\Adobe\CSXS.11 /v PlayerDebugMode /t REG_STRING /d 1 /f
reg add HKCU\Software\Adobe\CSXS.12 /v PlayerDebugMode /t REG_STRING /d 1 /f
```

### 4. 打开面板

1. 完全退出并重启 Illustrator  
2. **macOS**：`窗口` → `扩展功能` → `Momo Tools`  
3. **Windows**：`Window` → `Extensions` → `Momo Tools`

### 卸载

删除 CEP 目录下的 `com.tomideas.illustratortools` 文件夹，重启 Illustrator。

---

## 仓库内容说明

本 GitHub 仓库**仅发布使用者需要的内容**：

```
momo-illustrator/
├── README.md              ← 本文件（安装）
├── CHANGELOG.md           ← 版本记录
├── site/                  ← 使用指南（GitHub Pages）
├── extension/             ← 扩展源码（用于打 Release zip）
└── scripts/               ← 维护者打安装包脚本
```

以下内容**仅保留在本地工作区**，不会上传：`@Reference/`、内部开发笔记、`instructions.md`、诊断探针脚本等。

---

## 颜色库数据

颜色库保存在本机：

`~/Library/Application Support/MomoTools/color_library.json`（macOS）  
或 CEP 面板 `localStorage` 备用。

可通过面板「•••」菜单导入 / 导出 JSON 备份。

---

## 常见问题

**菜单里找不到 Momo Tools**  
→ 确认已开启 PlayerDebugMode，且文件夹名称为 `com.tomideas.illustratortools`。

**颜色重启后消失**  
→ 检查对上述目录是否有写权限；面板会自动回退到 localStorage。

**更多说明**  
→ [使用指南](https://tomideas.github.io/momo-illustrator/)

---

- **开发者**: Momo (tomideas)  
- **许可**: 见仓库发布说明
