import os from 'os';
import path from 'path';
import { $ } from 'bun';

const TASK_NAME = 'OpenCodeAutoUpdate';

function cronExpression(schedule: string): string {
  switch (schedule) {
    case 'hourly':
      return '0 * * * *';
    case 'daily':
      return '0 2 * * *'; // 2 AM daily
    case 'weekly':
      return '0 2 * * 0'; // 2 AM Sunday
    default:
      return schedule; // raw cron expression
  }
}

export async function installSchedule(
  executable: string,
  args: string,
  schedule: string,
) {
  const platform = os.platform();
  const cron = cronExpression(schedule);

  if (platform === 'win32') {
    const xml = `
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>2026-01-01T02:00:00</StartBoundary>
      <Repetition>
        <Interval>PT1H</Interval>
        <StopAtDurationEnd>false</StopAtDurationEnd>
      </Repetition>
      <ScheduleByDay>
        <DaysInterval>1</DaysInterval>
      </ScheduleByDay>
    </CalendarTrigger>
  </Triggers>
  <Actions Context="Author">
    <Exec>
      <Command>${executable.replace(/\\/g, '\\\\')}</Command>
      <Arguments>${args}</Arguments>
      <WorkingDirectory>${path.dirname(executable).replace(/\\/g, '\\\\')}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>`.trim();

    const tmpXml = path.join(os.tmpdir(), 'opencode-task.xml');
    await Bun.write(tmpXml, xml);
    await $`schtasks /Create /TN ${TASK_NAME} /XML "${tmpXml}" /F`.quiet();
    console.log(
      `✅ Windows Scheduled Task "${TASK_NAME}" installed (${schedule})`,
    );
  } else {
    const cronLine = `${cron} "${executable}" ${args}`;
    const marker = `# ${TASK_NAME}`;
    const { stdout } = await $`crontab -l 2>/dev/null`.quiet();
    const existing = stdout
      .toString()
      .split('\n')
      .filter((l) => !l.includes(TASK_NAME) && l.trim() !== '');
    existing.push(marker, cronLine, '');
    const newCrontab = existing.join('\n') + '\n';

    const tmpFile = path.join(os.tmpdir(), 'opencode-crontab');
    await Bun.write(tmpFile, newCrontab);
    await $`crontab "${tmpFile}"`.quiet();
    console.log(`✅ Cron job installed (${schedule}): ${cron}`);
    console.log(`   Command: "${executable}" ${args}`);
  }
}

export async function uninstallSchedule() {
  const platform = os.platform();

  if (platform === 'win32') {
    await $`schtasks /Delete /TN ${TASK_NAME} /F`.quiet();
    console.log(`🗑️  Windows Scheduled Task "${TASK_NAME}" removed`);
  } else {
    const { stdout } = await $`crontab -l 2>/dev/null`.quiet();
    const existing = stdout
      .toString()
      .split('\n')
      .filter((l) => !l.includes(TASK_NAME) && l.trim() !== '');
    const newCrontab = existing.length > 0 ? existing.join('\n') + '\n' : '';

    if (newCrontab === '') {
      await $`crontab -r`.quiet();
    } else {
      const tmpFile = path.join(os.tmpdir(), 'opencode-crontab');
      await Bun.write(tmpFile, newCrontab);
      await $`crontab "${tmpFile}"`.quiet();
    }
    console.log(`🗑️  Cron job "${TASK_NAME}" removed`);
  }
}

export function getVSCodeConfigPath(): string {
  let modelsJsonPath: string;
  const platform = os.platform();

  switch (platform) {
    case 'darwin': {
      modelsJsonPath = path.join(
        os.homedir(),
        'Library',
        'Application Support',
        'Code',
        'User',
        'chatLanguageModels.json',
      );
      break;
    }
    case 'win32': {
      modelsJsonPath = path.join(
        process.env.APPDATA!,
        'Code',
        'User',
        'chatLanguageModels.json',
      );
      break;
    }
    case 'linux': {
      modelsJsonPath = path.join(
        process.env.HOME!,
        '.config',
        'Code',
        'User',
        'chatLanguageModels.json',
      );
      break;
    }
    default: {
      console.error(`Unsupported platform: ${process.platform}`);
      process.exit(1);
    }
  }
  return modelsJsonPath;
}

export enum SourceType {
  All = 'all',
  ZenFree = 'zen-free',
  Go = 'go',
  Zen = 'zen',
}

export const sourceTypeMapping = {
  [SourceType.All]: 'all.json',
  [SourceType.ZenFree]: 'zen_free.json',
  [SourceType.Go]: 'opencode-go.json',
  [SourceType.Zen]: 'opencode-zen.json',
};

export const githubJsonFileBase =
  'https://raw.githubusercontent.com/Pikacnu/opencode-copilot-chat/refs/heads/main/models/';

export type configType = {
  target: string;
  provider: string;
  source: SourceType;
  overwrite?: {
    base_url?: string;
    models_source_list_key?: string;
  };
};

export type VSCodeModelsInfo = {
  id: string;
  name: string;
  url: string;
  apiType: 'chat-completions' | 'completions' | 'messages';
  toolCalling: boolean;
  maxInputTokens: number;
  maxOutputTokens: number;
  streaming?: boolean;
  editTools?: boolean;
  vision?: boolean;
  thinking?: boolean;
  supportsReasoningEffort?: string[];
  requestHeaders?: Record<string, string>;
  reasoningEffortFormat?: string;
  tooltip: string;
  modelOptions?: {
    temperature?: number;
    top_p?: number;
  };
};

export type VSCodeCustomModelConfig = {
  name: string;
  vendor: string;
  apiKey: string;
  models: VSCodeModelsInfo[];
}[];

export type CustomModelSourceResponse = {
  object: 'list';
  data: {
    id: string;
    type: 'model';
    display_name: string;
    created_at: string;
  }[];
};
