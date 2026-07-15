import type { Model } from '@opencode-ai/sdk/client';

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

export type ExtenedModelInfoType = Model & {
  variants?: Record<
    string,
    {
      reasoningEffort?: string;
    }
  >;
  family?: string;
  cost: ExtendedCostInfo;
};

type CostInfo = {
  input: number;
  output: number;
  cache: {
    read: number;
    write: number;
  };
};

export type ExtendedCostInfo = Model['cost'] &
  Partial<{
    tiers: ({
      tier: {
        type: 'context';
        size: number;
      };
    } & CostInfo)[];
  }>;

export type ProvidorInfo = {
  name: string;
  models: VSCodeModelsInfo[];
};

export type VSCodeModelGroupType = {
  name: string;
  vendor: string;
  apiKey: string;
  models: VSCodeModelsInfo[];
};
