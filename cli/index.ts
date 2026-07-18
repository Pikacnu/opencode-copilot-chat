import path from 'path';
import { file } from 'bun';
import os from 'os';
import parseArgs from 'util';
import {
  getVSCodeConfigPath,
  githubJsonFileBase,
  SourceType,
  sourceTypeMapping,
  installSchedule,
  uninstallSchedule,
  type configType,
  type VSCodeCustomModelConfig,
  type VSCodeModelsInfo,
  type CustomModelSourceResponse,
} from './utils';

const { values } = parseArgs.parseArgs({
  options: {
    help: {
      type: 'boolean',
      short: 'h',
    },
    config: {
      type: 'string',
      short: 'c',
    },
    source: {
      type: 'string',
      short: 's',
    },
    provider: {
      type: 'string',
      short: 'p',
    },
    sync: {
      type: 'boolean',
    },
    save: {
      type: 'boolean',
    },
    install: {
      type: 'boolean',
    },
    uninstall: {
      type: 'boolean',
    },
    schedule: {
      type: 'string',
      default: 'daily',
    },
    overwrite_base_url: {
      type: 'string',
    },
    overwrite_models_source_list_key: {
      type: 'string',
    },
  },
});

const cliConfigPath = path.join(os.homedir(), '.opencode-auto-update-cli.json');
let config: configType;

if (await file(cliConfigPath).exists()) {
  config = await file(cliConfigPath).json();
} else {
  config = {
    target: getVSCodeConfigPath(),
    provider: 'opencode',
    source: SourceType.All,
  };
}

if (values.overwrite_base_url) {
  config.overwrite = {
    ...config.overwrite,
    base_url: values.overwrite_base_url as string,
  };
}

if (values.overwrite_models_source_list_key) {
  config.overwrite = {
    ...config.overwrite,
    models_source_list_key: values.overwrite_models_source_list_key as string,
  };
}

if (values.source) {
  if (Object.keys(sourceTypeMapping).some((v) => v === values.source)) {
    config.source = values.source as SourceType;
  } else {
    console.error(
      `Invalid source: ${values.source}. Use: all | zen-free | go | zen`,
    );
    process.exit(1);
  }
}

if (values.provider) {
  config.provider = values.provider as string;
}

if (values.help) {
  console.log(`
Usage: opencode-auto-update-cli [options]

Options:
  -h, --help              Show this help message
  -c, --config <path>     CLI config file path (default: ${cliConfigPath})
  -s, --source <type>     Model source: all | zen-free | go | zen (default: ${sourceTypeMapping[config.source]})
  -p, --provider <name>   Target provider name in VS Code config (default: ${config.provider})
  --sync                  Run the sync — update VS Code chatLanguageModels.json
  --save                  Save current options to CLI config file
  --install               Register as scheduled task / cron job
  --uninstall             Remove scheduled task / cron job
  --schedule <when>       Schedule interval: hourly | daily | weekly (default: daily)
`);
  process.exit(0);
}

if (values.install) {
  const compiled = !import.meta.file.endsWith('.ts');
  const schedule = (values.schedule as string) || 'daily';

  if (compiled) {
    await installSchedule(process.execPath, '--sync', schedule);
  } else {
    const scriptPath = path.resolve(import.meta.dir, import.meta.file);
    await installSchedule(
      process.execPath,
      `run "${scriptPath}" --sync`,
      schedule,
    );
  }
  process.exit(0);
}

if (values.uninstall) {
  await uninstallSchedule();
  process.exit(0);
}

if (values.save) {
  await file(cliConfigPath).write(JSON.stringify(config, null, 2));
  console.log(`Config saved to ${cliConfigPath}`);
}

if (values.sync) {
  console.log(
    `Syncing VS Code chatLanguageModels.json with source: ${sourceTypeMapping[config.source]} and provider: ${config.provider}`,
  );
  try {
    let useOverWriteModelsSourceList =
      !!config.overwrite?.models_source_list_key;
    let modelsSourceList: string[] = [];

    const vsCodeConfig = (await file(
      config.target,
    ).json()) as VSCodeCustomModelConfig;

    const targetProvidor = vsCodeConfig.find(
      (vsc) => vsc.name === config.provider,
    );

    if (!targetProvidor) {
      console.error(`Provider not found: ${config.provider}`);
      process.exit(1);
    }

    if (targetProvidor?.vendor !== 'customendpoint') {
      console.error(`Invalid provider vendor: ${targetProvidor?.vendor}`);
      process.exit(1);
    }

    const sourceJson = `{${await (
      await fetch(
        `${githubJsonFileBase}${
          useOverWriteModelsSourceList
            ? sourceTypeMapping[SourceType.All]
            : sourceTypeMapping[config.source]
        }`,
      )
    ).text()}}`;

    const models: VSCodeModelsInfo[] = JSON.parse(sourceJson).models;

    if (useOverWriteModelsSourceList) {
      modelsSourceList = (
        (await (
          await fetch(
            `${config.overwrite?.base_url?.replace(/\/$/, '')}/v1/models`,
            {
              headers: {
                Authorization: `Bearer ${config.overwrite?.models_source_list_key}`,
              },
            },
          )
        ).json()) as CustomModelSourceResponse
      ).data.map((model) => model.id);
    }

    const filteredModels = useOverWriteModelsSourceList
      ? models.filter((model) => modelsSourceList.includes(model.id))
      : models;

    const processedModels = [
      ...vsCodeConfig.filter((vsc) => vsc.name !== config.provider),
      {
        ...targetProvidor,
        models: config.overwrite?.base_url
          ? filteredModels.map((m) => ({
              ...m,
              url: `${config.overwrite?.base_url}`,
            }))
          : filteredModels,
      },
    ];

    await file(config.target).write(JSON.stringify(processedModels, null, 2));
    console.log(
      `Successfully synced VS Code chatLanguageModels.json with source: ${sourceTypeMapping[config.source]} and provider: ${config.provider}`,
    );
  } catch (e) {
    console.error(`Error occurred while syncing: ${e}`);
    process.exit(1);
  }
}

process.exit(0);
