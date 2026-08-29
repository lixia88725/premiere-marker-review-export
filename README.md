# Premiere Marker Review Export

把 Premiere 时间线里的 sequence markers 导出为带截图、短视频和批注的本地审片报告。

## 选择版本

| 版本 | Premiere | 扩展平台 | 目录 |
| --- | --- | --- | --- |
| 2026 | Premiere 26.3+ | UXP | [`uxp-2026/`](uxp-2026/) |
| 2022 | Premiere Pro 22.x | CEP | [`cep-2022/`](cep-2022/) |

新安装请使用 2026 UXP 版。2022 CEP 版保留原有功能和安装方式，不再作为新版本的开发基础。

## 开发

```sh
npm install
npm test
npm run build
```

UXP 的开发加载、打包和 Windows 验收步骤见 [`uxp-2026/README.md`](uxp-2026/README.md)。

English documentation: [`README.en.md`](README.en.md)
