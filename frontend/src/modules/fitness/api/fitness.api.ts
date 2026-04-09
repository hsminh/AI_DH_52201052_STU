import { AbstractApiClient } from '@/shared/api/base.api';

export class FitnessApi extends AbstractApiClient {
  /**
   * Phân tích bữa ăn và trả về stream.
   * Logic stream được đóng gói hoàn toàn trong tầng API.
   */
  static async analyzeMeal(data: FormData, onChunk: (text: string) => void) {
    let fullText = '';
    return this.stream('/fitness/analyze/', data, (chunk) => {
      fullText += chunk;
      onChunk(fullText);
    });
  }
}
