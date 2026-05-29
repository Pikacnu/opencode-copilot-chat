# opencode-copilot-chat

## Intro

This project provides a guide and settings JSON to add opencode's models to your Copilot Chat.

## Requirement

- Visual Studio Code Version: **1.122.0** or above (tested version)

## Quick Start

👉 [Follow the step-by-step guide](/GUIDE.md)

📄 [Model Settings JSON](/model-settings.json)

## Automated Updates

The `model-settings.json` file is regularly and automatically updated via GitHub Actions to fetch the latest models from OpenCode.

You can also run the update script locally using [Bun](https://bun.sh/):

```bash
bun install
bun install opencode-ai
bun run scripts/update-json.ts
```

## Reference

- [VS Code Language Model Configuration Reference](https://code.visualstudio.com/docs/copilot/customization/language-models#_model-configuration-reference) — Official documentation for model configuration in VS Code Copilot Chat.
