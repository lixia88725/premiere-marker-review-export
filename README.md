# Premiere Marker Review Export

一个面向 **macOS + Adobe Premiere Pro 2022** 的 CEP 面板插件，用来把当前时间线里的 sequence markers 导出成一份清晰的审片反馈报告。

导出结果是 `review.html` + `assets/` 文件夹。点 marker 会导出截图；带 duration 的 marker 会导出短 MP4 预览和首帧 poster；marker 批注还可以在导出前通过 OpenAI-compatible API 做 AI 润色。

English README: [README.en.md](README.en.md)

## 功能

- 读取当前 active sequence 上的全部 sequence markers。
- 点 marker 导出为 `marker-001.jpg` 截图。
- 带 duration 的 marker 导出为 `marker-001.mp4` 视频预览。
- 视频 marker 额外生成 `marker-001-poster.jpg`，HTML 打开时显示首帧画面。
- 生成纸张风格的本地 HTML 表格报告。
- 自动创建版本化导出文件夹，例如 `Project_Review_YYYYMMDD_V1`。
- 如果所有 marker 名称为空，自动隐藏 Marker 列。
- 没有 Adobe Media Encoder 2022 时，支持通过 FFmpeg 和 master video fallback 导出媒体。
- 可选 AI Polish：导出前润色 marker 批注，只影响本次报告，不回写 Premiere 项目。

## 系统要求

- macOS
- Adobe Premiere Pro 2022
- 推荐安装 Adobe Media Encoder 2022
- 如果没有 AME 2022，需要 FFmpeg 和一条完整导出的 master video

这个插件只面向 Premiere Pro 2022 / CEP。它不是 UXP 插件，也没有针对 Premiere Pro 2023 或更新版本做兼容测试。

## 安装

把插件目录复制到当前用户的 CEP extensions 目录：

```bash
mkdir -p "$HOME/Library/Application Support/Adobe/CEP/extensions"
cp -R /path/to/com.xiali.premiere.reviewexport "$HOME/Library/Application Support/Adobe/CEP/extensions/"
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
```

然后重启 Premiere Pro 2022，在菜单里打开：

`Window > Extensions > Marker Review Export`

如果是小团队内部分发，可以把运行时插件目录和一个 `Install.command` 脚本打包。脚本只需要把插件复制到上面的 CEP extensions 目录，并开启 `PlayerDebugMode`。

## 使用方法

1. 打开 Premiere Pro 2022 项目和时间线。
2. 在当前 sequence 上打好 markers，并写好批注。
3. 打开 `Marker Review Export` 面板。
4. 选择 `Output folder`。这里选择的是父目录。
5. 如果没有 AME 2022，可选择 `Fallback master video`。
6. 如需润色批注，可勾选 `AI Polish comments` 并填写 API 设置。
7. 点击 `Export Report`。

插件会在你选择的父目录下创建一个版本化子文件夹，例如：

```text
LHSN_Review_20260602_V1/review.html
LHSN_Review_20260602_V1/assets/
```

分享报告时，请保持 `review.html` 和 `assets/` 在同一个文件夹里，因为 HTML 使用相对路径引用图片和视频。

## 后续步骤

> **飞书用户**：如果接收方使用飞书，可以通过 [Lark HTML Review Import](https://github.com/lixia88725/lark-html-review-import) 把导出的 HTML 报告一键导入飞书文档，自动修复截图和视频嵌入。

## AI Polish 批注润色

AI Polish 只修改导出的 HTML 报告里的批注文本，不会修改 Premiere marker 原文。

插件支持 OpenAI-compatible Chat Completions API。使用 DeepSeek 时可以填写：

```text
Base URL: https://api.deepseek.com
Model: deepseek-v4-flash 或 deepseek-v4-pro
```

插件会自动补全 OpenAI-compatible 的 `/chat/completions` 路径；如果你填写完整的
`https://api.deepseek.com/chat/completions` 也可以。

推荐轻量 Prompt：

```text
请润色这些剪辑反馈：修正语音输入造成的错别字、明显误识别、错误断句和不自然表达。在不改变原意、不新增剪辑意见的前提下，把语气调整得更专业、友善、具体，让剪辑师读起来容易接受，也能清楚知道需要修改什么。保持简洁，不要过度改写。
```

注意：API Key 会保存在 CEP 面板本机 `localStorage` 中，使用方便，但不是钥匙串级别的安全存储。不要把个人 API Key 提交到仓库或打包分享给别人。

## FFmpeg fallback

如果本机没有 Adobe Media Encoder 2022，插件可以从一条完整 master video 中用 FFmpeg 导出 marker 媒体。

常见 FFmpeg 路径：

- `/opt/homebrew/bin/ffmpeg`
- `/usr/local/bin/ffmpeg`
- `/usr/bin/ffmpeg`

fallback 导出的 duration marker MP4 是小体积反馈预览：540px 宽、H.264、`crf 28`、`veryfast`、低码率 AAC 音频。

## 开发

运行测试：

```bash
npm test
npm run check:manifest
```

`src/` 目录是可测试的 ESM 源码；`js/` 目录是 CEP 面板在 `index.html` 中直接加载的运行时代码。

## 限制

- 只支持 macOS。
- 只针对 Premiere Pro 2022。
- 是未签名的本地 CEP 扩展。
- 没有发布到 Adobe Marketplace。
- 没有制作签名 ZXP 或 notarized pkg 安装包。
- 导出的 HTML 不是单文件报告，它依赖同目录下的 `assets/` 文件夹。
