import { AbstractApiClient } from '@/shared/api/base.api';

export class FitnessApi extends AbstractApiClient {
  /**
   * Phân tích bữa ăn và trả về stream.
   * Logic stream được đóng gói hoàn toàn trong tầng API.
   */
  static async analyzeMeal(data: FormData, onChunk: (text: string) => void) {
    console.log('FitnessApi.analyzeMeal called with FormData');
    
    // Log FormData contents
    for (let [key, value] of data.entries()) {
      console.log('FormData entry in API:', key, value instanceof File ? `File: ${value.name}, Size: ${value.size}, Type: ${value.type}` : value);
    }
    
    let fullText = '';
    return this.stream('/fitness/analyze/', data, (chunk) => {
      fullText += chunk;
      onChunk(fullText);
    });
  }
}
