# opencode-copilot-chat

## Intro

This project provides a guide and settings JSON to add opencode's models to your Copilot Chat.

## Requirement

- Visual Studio Code Version: **1.122.0** or above (tested version)

## Quick Start

👉 [Follow the step-by-step guide](/GUIDE.md)

📄 [Browse Models List](/models/) (Get auto-generated configurations for all model types here)
📄 [Model Settings JSON (All-in-one)](/models/all.json)

📄 [Model Settings JSON (With Provider Info)](/model-settings.json)

## VSCode Configuration

- [chat.exploreAgent.defaultModel](vscode://settings/chat.exploreAgent.defaultModel): Select the default language model to use for the Explore subagent from the available providers.

- [chat.utilityModel](vscode://settings/chat.utilityModel): Override the language model used by built-in utility flows. Leave empty to use the default model.

- [chat.utilitySmallModel](vscode://settings/chat.utilitySmallModel): Override the language model used by built-in small/fast utility flows. A fast and inexpensive model is recommended. Leave empty to use the default model.

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
