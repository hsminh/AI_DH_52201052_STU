export interface FitnessMetrics {
  bmi: number;
  bmr: number;
  tdee: number;
  status: string;
  warning: string;
  target_gain: number;
  target_loss: number;
  body_type?: string;
  health_condition?: string;
}

export interface NutritionSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ProfilePayload {
  weight: number;
  height: number;
  age: number;
  bmi: number;
  status: string;
}
