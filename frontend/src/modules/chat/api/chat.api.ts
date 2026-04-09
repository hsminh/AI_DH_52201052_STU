import { AbstractApiClient } from '@/shared/api/base.api';
import { ChatRequest } from '../types';

export class ChatApi extends AbstractApiClient {
  /**
   * Gửi tin nhắn và nhận phản hồi stream.
   */
  static async sendMessage(data: ChatRequest, onChunk: (text: string) => void) {
    let fullText = '';
    return this.stream('/chatbot/chat/', data, (chunk) => {
      fullText += chunk;
      onChunk(fullText);
    });
  }

  static async clearChat() {
    return this.request('/chatbot/clear/', {
      method: 'POST',
      headers: await this.getHeaders(),
    });
  }
}
