/**
 * 硅基流动 (SiliconFlow) AI 客户端服务
 * API地址: https://api.siliconflow.cn
 * OpenAI兼容接口
 */

import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

export interface SiliconFlowMessage {
  role: 'system' | 'user' | 'assistant';
  content:
    | string
    | Array<{
        type: 'text' | 'image_url';
        text?: string;
        image_url?: { url: string; detail?: 'low' | 'high' | 'auto' };
      }>;
}

export interface SiliconFlowRequest {
  model: string;
  messages: SiliconFlowMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  thinking?: {
    type: 'enabled';
    budget_tokens?: number;
  };
}

export interface SiliconFlowResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  reasoning?: {
    content: string;
  };
}

/**
 * 硅基流动支持的模型列表
 */
export const SILICONFLOW_MODELS = {
  // 通用对话模型
  DEEPSEEK_V2_5: 'deepseek-ai/DeepSeek-V2.5',
  DEEPSEEK_R1: 'deepseek-ai/DeepSeek-R1',
  DEEPSEEK_R1_DISTILL_QWAN_32B: 'deepseek-ai/DeepSeek-R1-Distill-Qwan-32B',
  QWEN_QWEN2_5_72B: 'Qwen/Qwen2.5-72B-Instruct',
  QWEN_QWEN2_5_32B: 'Qwen/Qwen2.5-32B-Instruct',
  QWEN_QWEN2_5_7B: 'Qwen/Qwen2.5-7B-Instruct',
  GLM_4_9B: 'THUDM/glm-4-9b-chat',
  GLM_4: 'THUDM/glm-4-alltools',

  // 视觉模型
  QWEN_VL_MAX: 'Qwen/Qwen2-VL-72B-Instruct',
  QWEN_VL_FLASH: 'Qwen/Qwen2-VL-7B-Instruct',
  GLM_4V: 'THUDM/glm-4v-9b',

  // 开源免费模型
  QWEN_QWEN2_5_7B_INSTRUCT_Free: 'Qwen/Qwen2.5-7B-Instruct',
  DEEPSEEK_R1_FREE: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
} as const;

export type SiliconFlowModelType = (typeof SILICONFLOW_MODELS)[keyof typeof SILICONFLOW_MODELS];

@Injectable()
export class SiliconflowService {
  private readonly logger = new Logger(SiliconflowService.name);
  private client: AxiosInstance;
  private apiKey: string;

  // 默认模型配置
  private defaultTextModel: string = 'Qwen/Qwen2.5-7B-Instruct';
  private defaultVisionModel: string = 'Qwen/Qwen2-VL-7B-Instruct';
  private defaultTemperature = 0.7;
  private defaultMaxTokens = 2000;

  constructor(private configService: ConfigService) {
    // 从环境变量获取API密钥
    this.apiKey = this.configService.get<string>('SILICONFLOW_API_KEY') || '';

    if (!this.apiKey) {
      this.logger.warn('⚠️  SiliconFlow API密钥未配置，请设置 SILICONFLOW_API_KEY 环境变量');
    }

    // 创建HTTP客户端
    this.client = axios.create({
      baseURL: 'https://api.siliconflow.cn/v1',
      timeout: 60000, // 60秒超时
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // 添加响应拦截器
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error('SiliconFlow API请求失败:', error.response?.data || error.message);
        throw error;
      }
    );
  }

  /**
   * 设置API密钥（如果需要动态设置）
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.client.defaults.headers['Authorization'] = `Bearer ${apiKey}`;
  }

  /**
   * 设置默认模型
   */
  setDefaultModel(textModel?: string, visionModel?: string): void {
    if (textModel) this.defaultTextModel = textModel;
    if (visionModel) this.defaultVisionModel = visionModel;
  }

  /**
   * 发送文本对话请求
   */
  async chat(request: {
    messages: SiliconFlowMessage[];
    model?: SiliconFlowModelType;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
    enable_thinking?: boolean;
    thinking_budget_tokens?: number;
  }): Promise<{
    success: boolean;
    content?: string;
    reasoning?: string;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    error?: string;
  }> {
    try {
      const model = request.model || this.defaultTextModel;
      const temperature = request.temperature ?? this.defaultTemperature;
      const max_tokens = request.max_tokens || this.defaultMaxTokens;

      const payload: SiliconFlowRequest = {
        model,
        messages: request.messages,
        temperature,
        max_tokens,
        stream: request.stream ?? false,
      };

      // 添加思考能力（DeepSeek R1等模型支持）
      if (request.enable_thinking) {
        payload.thinking = {
          type: 'enabled',
          budget_tokens: request.thinking_budget_tokens || 4000,
        };
      }

      this.logger.log(`🤖 调用硅基流动 API: ${model}`);

      const response = await this.client.post<SiliconFlowResponse>('/chat/completions', payload);

      const result = response.data;
      const choice = result.choices[0];

      return {
        success: true,
        content: choice.message.content,
        reasoning: result.reasoning?.content,
        usage: result.usage,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || '未知错误';
      this.logger.error(`❌ 硅基流动API调用失败: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 发送视觉对话请求（支持图片理解）
   */
  async visionChat(request: {
    messages: Array<{
      role: 'user' | 'assistant' | 'system';
      content: Array<{
        type: 'text' | 'image_url';
        text?: string;
        image_url?: { url: string; detail?: 'low' | 'high' | 'auto' };
      }>;
    }>;
    model?: SiliconFlowModelType;
    temperature?: number;
    max_tokens?: number;
  }): Promise<{
    success: boolean;
    content?: string;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    error?: string;
  }> {
    try {
      const model = request.model || this.defaultVisionModel;
      const temperature = request.temperature ?? this.defaultTemperature;
      const max_tokens = request.max_tokens || 2000;

      const payload = {
        model,
        messages: request.messages,
        temperature,
        max_tokens,
      };

      this.logger.log(`🖼️ 调用硅基流动视觉模型: ${model}`);

      const response = await this.client.post<SiliconFlowResponse>('/chat/completions', payload);

      const result = response.data;
      const choice = result.choices[0];

      return {
        success: true,
        content: choice.message.content,
        usage: result.usage,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || '未知错误';
      this.logger.error(`❌ 硅基流动视觉API调用失败: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 简单文本生成（封装chat方法）
   */
  async generateText(
    prompt: string,
    options?: {
      model?: SiliconFlowModelType;
      temperature?: number;
      max_tokens?: number;
      systemPrompt?: string;
    }
  ): Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }> {
    const messages: SiliconFlowMessage[] = [];

    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const result = await this.chat({
      messages,
      model: options?.model,
      temperature: options?.temperature,
      max_tokens: options?.max_tokens,
    });

    return {
      success: result.success,
      content: result.content,
      error: result.error,
    };
  }

  /**
   * 获取可用模型列表
   */
  getAvailableModels(): Array<{ id: string; name: string; type: 'text' | 'vision' | 'thinking' }> {
    return [
      // 通用对话模型
      { id: SILICONFLOW_MODELS.DEEPSEEK_V2_5, name: 'DeepSeek-V2.5', type: 'text' },
      { id: SILICONFLOW_MODELS.QWEN_QWEN2_5_72B, name: 'Qwen2.5-72B', type: 'text' },
      { id: SILICONFLOW_MODELS.QWEN_QWEN2_5_32B, name: 'Qwen2.5-32B', type: 'text' },
      { id: SILICONFLOW_MODELS.QWEN_QWEN2_5_7B, name: 'Qwen2.5-7B', type: 'text' },
      { id: SILICONFLOW_MODELS.GLM_4_9B, name: 'GLM-4-9B', type: 'text' },

      // 思考模型
      { id: SILICONFLOW_MODELS.DEEPSEEK_R1, name: 'DeepSeek-R1 (思考)', type: 'thinking' },
      {
        id: SILICONFLOW_MODELS.DEEPSEEK_R1_DISTILL_QWAN_32B,
        name: 'DeepSeek-R1-Distill-Qwan-32B',
        type: 'thinking',
      },

      // 视觉模型
      { id: SILICONFLOW_MODELS.QWEN_VL_MAX, name: 'Qwen2-VL-72B (视觉)', type: 'vision' },
      { id: SILICONFLOW_MODELS.QWEN_VL_FLASH, name: 'Qwen2-VL-7B (视觉)', type: 'vision' },
      { id: SILICONFLOW_MODELS.GLM_4V, name: 'GLM-4V-9B (视觉)', type: 'vision' },
    ];
  }
}
