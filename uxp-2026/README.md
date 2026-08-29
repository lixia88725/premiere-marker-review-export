# Marker Review Export — Premiere 2026 UXP

面向 Premiere 26.3 或更高版本的 UXP 插件。读取当前 sequence markers，导出本地 `review.html`、截图、视频 poster 和短 MP4 预览，并可通过 OpenAI-compatible HTTPS API 润色批注。

## 要求

- Premiere 26.3+
- Adobe Media Encoder 26.3+（仅 Duration Marker 的 MP4 预览需要）
- UXP Developer Tool 2.2+
- Node.js 20+
- macOS 或 Windows

本版本不使用 CEP、ExtendScript、Node 子进程或 FFmpeg。

## 构建与测试

从仓库根目录运行：

```sh
npm install
npm run typecheck
npm test
npm run build
```

可加载的插件位于 `uxp-2026/dist/`。

## 开发加载

1. 在 Creative Cloud Desktop 的“所有应用程序”中安装 **UXP Developer Tools**。
2. 打开 Premiere，进入 `Settings > Plugins`，启用 Developer Mode，然后重启 Premiere。
3. 打开 UXP Developer Tool，选择 `Add Plugin`。
4. 选择 `uxp-2026/dist/manifest.json`。
5. 点击 `Load`。
6. 在 Premiere 中打开 `Window > UXP Plugins > Marker Review Export`。

代码变化后先运行 `npm run build`，再在 UXP Developer Tool 中点击 Reload。

## 打包 `.ccx`

1. 运行 `npm run build` 并确认 `dist/manifest.json` 的版本号正确。
2. 在 UXP Developer Tool 中添加 `dist/manifest.json`。
3. 打开该插件右侧的 `…` 菜单，选择 `Package`。
4. 将生成的 `.ccx` 保存到 `uxp-2026/release/`。
5. 在未加载开发版本的环境中双击 `.ccx`，通过 Creative Cloud Desktop 安装并复测。

## AI 与隐私

- 只发送 Marker 名称、批注和索引，不上传视频或音频。
- Base URL 必须使用 HTTPS。
- Manifest 允许任意网络域名，以继续支持 OpenAI-compatible 服务。
- API Key 存入 UXP SecureStorage；普通设置中不会保存明文 Key。
- AI 失败不会阻断导出，报告会保留原批注。

## Windows 26.3 验收清单

- 从同一 `.ccx` 成功安装并在 `Window > UXP Plugins` 中显示。
- 输出目录选择、持久授权及包含空格/中文的 Windows 路径正常。
- 点 Marker 导出截图；Duration Marker 通过 AME 导出 MP4 和 poster。
- 导出后 Sequence 原 In/Out 被恢复。
- 报告使用相对 `assets/` 路径并可在 Edge/Chrome 本地打开。
- SecureStorage、AI HTTPS 请求、预览编辑、JSON 备份与 GUID 冲突保护正常。

English documentation: [`README.en.md`](README.en.md)
