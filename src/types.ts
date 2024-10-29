// types.ts
export enum ModelProviders {
    LOCAL = 'Local',
    GOOGLE = 'Google',
    OPENAI = 'OpenAI',
    ANTHROPIC = 'Anthropic',
    HUGGINGFACE = 'HuggingFace',
    CUSTOM = 'Custom' // For Azure, AWS, etc.
}

export interface MemoryProfile {
    id: string;
    name: string;
    content: string;
    path: string;
    timestamp: Date;
}

export interface HistoryItem {
    id?: string;
    timestamp: Date;
    model: string;
    prompt: string;
    memory?: string;
    maxTokens: number;
    temperature: number;
    response: any;
    requestTime: number;
    url: string;
}

export interface ChromeMessage extends Partial<ApiRequest> {
    type: string;
    data?: any;
    searchTerm?: string;
    id?: string;
    max_tokens?: number; // Use camelCase for consistency
    [key: string]: any;
}

export interface APIResponse {
    success: boolean;
    data?: any;
    error?: string;
    cached?: boolean;
    finished?: boolean; // Add the finished property
    requestTime?: number;  // Make this optional as it is only used for request API
    avgTime?: number;
    models?: string[];
    profiles?: MemoryProfile[];
}

export interface ApiRequest {
    type: string;
    timestamp?: Date;
    model: string;
    prompt?: string;
    memory?: string | null;
    maxTokens?: number;
    temperature?: number;
    url: string;
    messages: { role: string; content: string }[];
    response?: any;
}

export type TreeData = {
    [key: string]: {
      children?: TreeData;
      profiles?: MemoryProfile[];
    };
  };