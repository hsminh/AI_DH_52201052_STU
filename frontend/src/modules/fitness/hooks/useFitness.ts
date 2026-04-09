import { useState } from 'react';
import { FitnessApi } from '../api/fitness.api';
import { NutritionSummary, ProfilePayload } from '../types';

export const useFitness = () => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [nutrition, setNutrition] = useState<NutritionSummary | null>(null);
  const [analysis, setAnalysis] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [exercise, setExercise] = useState('');

  const analyzeMeal = async (input: string, image: File | null) => {
    setLoading(true);
    setAnalysis('');
    setRecommendation('');
    setExercise('');
    setNutrition(null);

    const formData = new FormData();
    formData.append('user_input', input);
    if (image) formData.append('image', image);

    await FitnessApi.analyzeMeal(formData, (fullText) => {
      processStream(fullText);
    });
    setLoading(false);
  };

  const processStream = (text: string) => {
    const profileMatch = text.match(/\[PROFILE_DATA\](.*?)\[\/PROFILE_DATA\]/);
    if (profileMatch) {
      setProfile(JSON.parse(profileMatch[1]));
    }

    const nutritionMatch = text.match(/\[NUTRITION_START\]([\s\S]*?)\[NUTRITION_END\]/);
    if (nutritionMatch) {
      const lines = nutritionMatch[1].trim().split('\n');
      const nutObj: any = {};
      lines.forEach(l => {
        const [k, v] = l.split(':');
        if (k && v) nutObj[k.trim().toLowerCase()] = parseInt(v.trim());
      });
      setNutrition(nutObj as NutritionSummary);
    }

    const analysisMatch = text.match(/\[ANALYSIS_START\]([\s\S]*?)(\[ANALYSIS_END\]|$)/);
    if (analysisMatch) setAnalysis(analysisMatch[1].trim());

    const recommendMatch = text.match(/\[RECOMMEND_START\]([\s\S]*?)(\[RECOMMEND_END\]|$)/);
    if (recommendMatch) setRecommendation(recommendMatch[1].trim());

    const exerciseMatch = text.match(/\[EXERCISE_START\]([\s\S]*?)(\[EXERCISE_END\]|$)/);
    if (exerciseMatch) setExercise(exerciseMatch[1].trim());
  };

  return { loading, profile, nutrition, analysis, recommendation, exercise, analyzeMeal };
};
