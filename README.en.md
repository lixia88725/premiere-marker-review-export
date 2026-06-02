# Premiere Marker Review Export

A macOS-only CEP panel for **Adobe Premiere Pro 2022** that exports sequence markers into a clean local review report.

The report is written as `review.html` plus an `assets/` folder. Point markers become still images, duration markers become short MP4 previews with poster frames, and marker comments can optionally be polished with an OpenAI-compatible AI API before export.

## Features

- Reads markers from the current active Premiere Pro sequence.
- Exports point markers as `marker-001.jpg` still frames.
- Exports duration markers as `marker-001.mp4` preview clips.
- Generates video poster frames such as `marker-001-poster.jpg`.
- Writes a paper-style HTML feedback table with relative media paths.
- Automatically creates versioned output folders: `Project_Review_YYYYMMDD_V1`.
- Hides the Marker column when marker names are empty.
- Supports FFmpeg fallback when Adobe Media Encoder 2022 is unavailable.
- Optional AI comment polishing through OpenAI-compatible chat completions APIs.

## Requirements

- macOS
- Adobe Premiere Pro 2022
- Recommended: Adobe Media Encoder 2022
- Optional fallback: FFmpeg plus a full exported master video

This package targets Premiere Pro 2022 / CEP only. It is not a UXP plugin and is not tested against Premiere Pro 2023 or newer.

## Install

Copy this folder to the user CEP extensions directory:

```bash
mkdir -p "$HOME/Library/Application Support/Adobe/CEP/extensions"
cp -R /path/to/com.xiali.premiere.reviewexport "$HOME/Library/Application Support/Adobe/CEP/extensions/"
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
```

Then restart Premiere Pro 2022 and open:

`Window > Extensions > Marker Review Export`

For internal sharing, you can package the runtime plugin folder with a small `Install.command` script that copies it to the same CEP extensions directory and enables `PlayerDebugMode`.

## Usage

1. Open a Premiere Pro 2022 project and active sequence.
2. Add sequence markers with comments.
3. Open the `Marker Review Export` panel.
4. Choose an Output folder. This is the parent folder.
5. Optional: choose a Fallback master video if AME 2022 is unavailable.
6. Optional: enable AI Polish comments and fill API settings.
7. Click Export Report.

The actual report is created in a versioned child folder under the selected output folder, for example:

```text
LHSN_Review_20260602_V1/review.html
LHSN_Review_20260602_V1/assets/
```

Keep `review.html` and `assets/` together when sharing the report.

## AI Polish

AI Polish only changes comments in the exported HTML report. It does **not** write polished text back to Premiere markers.

The panel supports OpenAI-compatible Chat Completions APIs. For DeepSeek, use:

```text
Base URL: https://api.deepseek.com/chat/completions
Model: deepseek-v4-flash or deepseek-v4-pro
```

Suggested lightweight prompt:

```text
请润色这些剪辑反馈：修正语音输入造成的错别字、明显误识别、错误断句和不自然表达。在不改变原意、不新增剪辑意见的前提下，把语气调整得更专业、友善、具体，让剪辑师读起来容易接受，也能清楚知道需要修改什么。保持简洁，不要过度改写。
```

API keys are stored locally in the CEP panel's `localStorage`. This is convenient for internal use, but it is not keychain-grade secure storage. Do not commit or share personal API keys.

## FFmpeg fallback

If Adobe Media Encoder 2022 is not installed, the panel can export marker media from a full master video using FFmpeg.

The fallback searches common FFmpeg paths:

- `/opt/homebrew/bin/ffmpeg`
- `/usr/local/bin/ffmpeg`
- `/usr/bin/ffmpeg`

Duration marker clips are exported as small H.264 MP4 previews using 540px width, `crf 28`, `veryfast` preset, and low-bitrate AAC audio.

## Development

Run tests:

```bash
npm test
npm run check:manifest
```

The `src/` modules are testable ESM sources. The `js/` files are browser/CEP runtime scripts loaded by `index.html`.

## Limitations

- macOS only.
- Premiere Pro 2022 only.
- Unsigned local CEP extension.
- No Adobe Marketplace packaging.
- No signed ZXP or notarized pkg installer.
- Generated HTML references local relative media files; it is not a single-file report.
