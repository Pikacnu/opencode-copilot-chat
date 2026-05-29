import { createOpencode } from '@opencode-ai/sdk';
import type {
  VSCodeModelsInfo,
  ExtenedModelInfoType,
  ProvidorInfo,
} from './type';
import { file } from 'bun';

const openCode = await createOpencode();

const providors = await openCode.client.config.providers();

if (providors.error) {
  console.error(providors.error);
}

const npmPackageToApiTypeMap: Record<string, VSCodeModelsInfo['apiType']> = {
  '@ai-sdk/openai-compatible': 'chat-completions',
  '@ai-sdk/anthropic': 'messages',
};

if (!providors.data || !providors.data.providers) {
  console.error('No providers found');
  process.exit(1);
}

const providorModelInfo: ProvidorInfo[] = providors.data.providers
  .map((provider) => {
    if (!provider.models) {
      console.error(`No models found for provider ${provider.name}`);
      return null;
    }
    const models = Object.entries(provider.models).map(
      ([modelId, model]: [string, ExtenedModelInfoType]) => {
        return {
          id: modelId,
          name: model.name,
          url: model.api.url,
          apiType: npmPackageToApiTypeMap[model.api.npm] || 'chat-completions',
          toolCalling: model.capabilities.toolcall,
          vision: model.capabilities.input.image,
          thinking: model.capabilities.reasoning,
          maxInputTokens: model.limit.context,
          maxOutputTokens: model.limit.output,
          ...(model.variants
            ? {
                supportsReasoningEffort: Object.keys(model.variants),
              }
            : {}),
        } as VSCodeModelsInfo;
      },
    );
    return {
      name: provider.name,
      models,
    } as ProvidorInfo;
  })
  .filter((provider) => !!provider);

const newFileJsonFormat = providorModelInfo.map((provider) => {
  return {
    name: provider.name,
    vendor: 'customendpoint',
    apiKey: 'replace_with_your_api_key',
    models: provider.models,
  };
});

const newFileContent = JSON.stringify(newFileJsonFormat, null, 2);

await file('./model-settings.json').write(newFileContent);

process.exit(0);
