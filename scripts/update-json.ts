import { createOpencode } from '@opencode-ai/sdk';
import type {
  VSCodeModelsInfo,
  ExtenedModelInfoType as ExtendedModelInfoType,
  ProvidorInfo,
} from './type';
import { file } from 'bun';
import { exists, mkdir } from 'fs/promises';
import { join } from 'path';

const openCodeSessionKey = process.env.OPENCODE_API_KEY;

if (!openCodeSessionKey) {
  console.error('OPENCODE_API_KEY environment variable is not set');
  process.exit(1);
}

const openCode = await createOpencode();

openCode.client.auth.set({
  path: {
    id: 'opencode',
  },
  body: {
    type: 'api',
    key: openCodeSessionKey,
  },
});

const providors = await openCode.client.config.providers();

if (providors.error) {
  console.error(providors.error);
}

const npmPackageToApiTypeMap: Record<string, VSCodeModelsInfo['apiType']> = {
  '@ai-sdk/openai-compatible': 'chat-completions',
  '@ai-sdk/anthropic': 'messages',
};

process.on('exit', () => {
  openCode.server.close();
});

if (!providors.data || !providors.data.providers) {
  console.error('No providers found');
  process.exit(1);
}

// Used to fetch the Zen Free models from OpenCode API
// For some reason, it not working as expected, so we are hardcoding the Zen Free models for now
//
// const zenFreeModelsId: string[] = await fetch(
//   'https://opencode.ai/zen/v1/models',
// )
//   .then((res) => {
//     if (!res.ok) {
//       throw new Error(`Failed to fetch Zen Free models: ${res.statusText}`);
//     }
//     return res.json();
//   })
//   .catch((err) => {
//     console.error(err);
//     return [];
//   })
//   .then((resData) => {
//     const resModelsId =
//       (
//         resData as {
//           object: string;
//           data: Array<{
//             id: string;
//             object: string;
//             created: number;
//             owned_by: string;
//           }>;
//         }
//       ).data || [];
//     const bigPickleModelIndex = resModelsId.findIndex((model) =>
//       model.id.includes('big-pickle'),
//     );
//     const freeModelsIds = resModelsId
//       .slice(bigPickleModelIndex)
//       .map((model) => model.id);
//     return freeModelsIds;
//   });

const zenFreeModelsId: string[] = ['big-pickle'];

const numToPrice = (num: number): string => {
  return `${num}$`;
};

const numToUnits = (num: number): string => {
  return `${(num / 1000).toFixed(0)}k`;
};

const generateTooltip = (model: ExtendedModelInfoType): string => {
  const basePriceTag = `Price Per 1M token -- Input ${numToPrice(model.cost?.input ?? 0)}, Output ${numToPrice(model.cost?.output ?? 0)}, Cache ${numToPrice(model.cost?.cache.read ?? 0)}${model.cost?.cache.write ? `, Cache ${numToPrice(model.cost?.cache.write ?? 0)}` : ''}`;
  let overContextPriceTag = '';
  if (model.cost?.experimentalOver200K) {
    const overBasePriceTier = model.cost.tiers![0]!;
    overContextPriceTag = ` | Price Over ${numToUnits(overBasePriceTier.tier.size)} tokens -- Input ${numToPrice(overBasePriceTier.input)}, Output ${numToPrice(overBasePriceTier.output)}, Cache ${numToPrice(overBasePriceTier.cache.read ?? 0)}${overBasePriceTier.cache.write ? `, Cache ${numToPrice(overBasePriceTier.cache.write ?? 0)}` : ''}`;
  }
  return `${basePriceTag}${overContextPriceTag}`;
};

const providorModelInfo: ProvidorInfo[] = providors.data.providers
  .map((provider) => {
    if (!provider.models) {
      console.error(`No models found for provider ${provider.name}`);
      return null;
    }
    const models = Object.entries(provider.models).map(
      ([modelId, model]: [string, ExtendedModelInfoType]) => {
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
          ...(model.family && model.family.includes('kimi')
            ? {
                modelOptions: {
                  top_p: null,
                },
              }
            : {}),
          ...(model.variants && Object.keys(model.variants).length > 0
            ? {
                supportsReasoningEffort: Object.keys(model.variants),
              }
            : {}),
          tooltip: generateTooltip(model),
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

const modelSettingsFileContent = JSON.stringify(newFileJsonFormat, null, 2);

await file('./model-settings.json').write(
  modelSettingsFileContent.substring(1, modelSettingsFileContent.length - 1),
);

const modelDir = './models';

if (!(await exists(modelDir))) {
  await mkdir(modelDir);
}

for (const provider of providorModelInfo) {
  const fileContent = JSON.stringify(
    {
      models: provider.models,
    },
    null,
    2,
  );
  await file(
    join(modelDir, `${provider.name.toLowerCase().replace(/ /g, '-')}.json`),
  ).write(fileContent.substring(1, fileContent.length - 1));
}

if (providorModelInfo.map((provider) => provider.models).flat().length > 0) {
  const fileContent = JSON.stringify(
    {
      models: providorModelInfo.map((provider) => provider.models).flat(),
    },
    null,
    2,
  );
  await file(join(modelDir, 'all.json')).write(
    fileContent.substring(1, fileContent.length - 1),
  );
}

if (zenFreeModelsId.length > 0) {
  const providorZen = (providorModelInfo
    .filter((provider) => provider.name.includes('Zen'))
    .flat() || [])[0];
  if (!providorZen) {
    console.error('Zen provider not found, skipping Zen Free models update');
  } else {
    const zenModels = providorZen.models;
    const zenFreeModelInfo: VSCodeModelsInfo[] = zenModels.filter(
      (model) =>
        zenFreeModelsId.includes(model.id) || model.id.includes('free'),
    );
    const fileContent = JSON.stringify(
      {
        models: zenFreeModelInfo,
      },
      null,
      2,
    );
    await file(join(modelDir, 'zen-free.json')).write(
      fileContent.substring(1, fileContent.length - 1),
    );
  }
} else {
  console.warn('No Zen Free models found, skipping Zen Free models update');
}

process.exit(0);
