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
};

export type ExtenedModelInfoType = Model & {
  variants?: Record<
    string,
    {
      reasoningEffort?: string;
    }
  >;
};

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
