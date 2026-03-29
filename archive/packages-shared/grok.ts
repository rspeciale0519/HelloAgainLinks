// ============================================================
// Grok API Client (xAI)
// ============================================================

export interface GrokConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface GrokMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GrokChatResponse {
  id: string;
  choices: {
    message: GrokMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class GrokClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: GrokConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.x.ai/v1';
  }

  async chat(messages: GrokMessage[], model = 'grok-3'): Promise<GrokChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model, messages }),
    });

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async categorizeBookmark(content: string): Promise<string[]> {
    const res = await this.chat([
      {
        role: 'system',
        content:
          'You are a bookmark categorization engine. Given a tweet/post, return a JSON array of 1-5 topic tags. Return ONLY the JSON array, no other text.',
      },
      { role: 'user', content },
    ]);
    try {
      return JSON.parse(res.choices[0].message.content);
    } catch {
      return [];
    }
  }

  async generateBlendAnalysis(
    userATopics: string[],
    userBTopics: string[]
  ): Promise<{ score: number; shared: string[]; analysis: string }> {
    const res = await this.chat([
      {
        role: 'system',
        content:
          'You analyze bookmark compatibility between two users. Return JSON with: score (0-100), shared (array of shared topic strings), analysis (2-3 sentence description). Return ONLY JSON.',
      },
      {
        role: 'user',
        content: `User A topics: ${JSON.stringify(userATopics)}\nUser B topics: ${JSON.stringify(userBTopics)}`,
      },
    ]);
    try {
      return JSON.parse(res.choices[0].message.content);
    } catch {
      return { score: 0, shared: [], analysis: 'Unable to generate analysis.' };
    }
  }
}
