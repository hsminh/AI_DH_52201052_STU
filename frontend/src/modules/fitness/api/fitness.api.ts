import { AbstractApiClient } from '@/shared/api/base.api';

export class FitnessApi extends AbstractApiClient {
  /**
   * Phân tích bữa ăn và trả về stream.
   * Logic stream được đóng gói hoàn toàn trong tầng API.
   */
  static async analyzeText(data: { user_input: string }, onChunk: (text: string) => void) {
    let fullText = '';
    return this.stream('/fitness/analyze-text/', data, (chunk) => {
      fullText += chunk;
      onChunk(fullText);
    });
  }

  static async analyzeImage(data: FormData, onChunk: (text: string) => void) {
    let fullText = '';
    return this.stream('/fitness/analyze-image/', data, (chunk) => {
      fullText += chunk;
      onChunk(fullText);
    });
  }

  static async getCookingRecipe(data: { food_name: string }, onChunk: (text: string) => void) {
    let fullText = '';
    return this.stream('/fitness/cooking-recipe/', data, (chunk) => {
      fullText += chunk;
      onChunk(fullText);
    });
  }
}
