'use client';
import { useState, useEffect } from 'react';
import { FitnessApi } from '@/modules/fitness/api/fitness.api';
import { AuthApi } from '@/modules/auth/api/auth.api';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { marked } from 'marked';
import { Activity, User, Scale, Ruler, AlertTriangle } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function FitnessPage() {
  const { user } = useAuth('CONSUMER');
  const [input, setInput] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [nutrition, setNutrition] = useState<any>(null);
  const [analysis, setAnalysis] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [exercise, setExercise] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setImage(e.target.files[0]);
  };

  const startAnalysis = async () => {
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
    // 1. Profile Data
    const profileMatch = text.match(/\[PROFILE_DATA\](.*?)\[\/PROFILE_DATA\]/);
    if (profileMatch) {
      setProfile(JSON.parse(profileMatch[1]));
    }

    // 2. Nutrition
    const nutritionMatch = text.match(/\[NUTRITION_START\]([\s\S]*?)\[NUTRITION_END\]/);
    if (nutritionMatch) {
      const lines = nutritionMatch[1].trim().split('\n');
      const nutObj: any = {};
      lines.forEach(l => {
        const [k, v] = l.split(':');
        if (k && v) nutObj[k.trim().toLowerCase()] = parseInt(v.trim());
      });
      setNutrition(nutObj);
    }

    // 3. Analysis
    const analysisMatch = text.match(/\[ANALYSIS_START\]([\s\S]*?)(\[ANALYSIS_END\]|$)/);
    if (analysisMatch) setAnalysis(analysisMatch[1].trim());

    // 4. Recommendation
    const recommendMatch = text.match(/\[RECOMMEND_START\]([\s\S]*?)(\[RECOMMEND_END\]|$)/);
    if (recommendMatch) setRecommendation(recommendMatch[1].trim());

    // 5. Exercise
    const exerciseMatch = text.match(/\[EXERCISE_START\]([\s\S]*?)(\[EXERCISE_END\]|$)/);
    if (exerciseMatch) setExercise(exerciseMatch[1].trim());
  };

  const chartData = nutrition ? {
    labels: ['Protein', 'Carbs', 'Fat'],
    datasets: [{
      data: [nutrition.protein || 0, nutrition.carbs || 0, nutrition.fat || 0],
      backgroundColor: ['#4caf50', '#2196f3', '#ff9800'],
    }]
  } : null;

  return (
    <div className="min-h-screen bg-green-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-green-800 border-b-2 border-green-200 pb-2">Fitness Analyst AI</h1>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100">
          <textarea
            className="w-full p-4 border-2 border-green-100 rounded-lg focus:ring-green-500 focus:border-green-500 outline-none transition-all"
            placeholder="Describe your meal (e.g., I had 2 eggs and a toast for breakfast)..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="mt-4 flex flex-col md:flex-row gap-4">
            <input type="file" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
            <button
              onClick={startAnalysis}
              disabled={loading}
              className="bg-green-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-green-700 disabled:bg-green-300 transition-colors"
            >
              {loading ? 'Analyzing...' : 'Analyze Meal'}
            </button>
          </div>
        </div>

        {profile && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Weight', value: `${profile.weight}kg`, icon: Scale },
              { label: 'Height', value: `${profile.height}cm`, icon: Ruler },
              { label: 'Age', value: profile.age, icon: User },
              { label: 'BMI', value: profile.bmi, icon: Activity },
              { label: 'Status', value: profile.status, icon: AlertTriangle, color: 'text-orange-600' }
            ].map((m, i) => (
              <div key={i} className="bg-white p-4 rounded-lg shadow-sm border-b-4 border-green-600 text-center">
                <m.icon className="mx-auto mb-2 text-green-600" size={20} />
                <span className="text-xs text-gray-500 uppercase font-bold">{m.label}</span>
                <strong className={`block text-xl ${m.color || 'text-green-800'}`}>{m.value}</strong>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {nutrition && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100">
              <h3 className="font-bold text-lg text-green-800 mb-4 border-l-4 border-green-600 pl-3">Macro Breakdown</h3>
              <div className="h-64 flex items-center justify-center">
                {chartData && <Pie data={chartData} />}
              </div>
              <div className="mt-4 text-center">
                <span className="text-4xl font-bold text-green-600">{nutrition.calories}</span>
                <p className="text-gray-500 font-bold">Total Calories (kcal)</p>
              </div>
            </div>
          )}

          {recommendation && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
              <h3 className="font-bold text-lg text-blue-800 mb-4 border-l-4 border-blue-600 pl-3">Recommended Menu</h3>
              <div className="prose prose-blue max-w-none" dangerouslySetInnerHTML={{ __html: marked(recommendation) }} />
            </div>
          )}

          {exercise && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100 md:col-span-2">
              <h3 className="font-bold text-lg text-green-800 mb-4 border-l-4 border-green-600 pl-3">Exercise Plan</h3>
              <div className="prose prose-green max-w-none" dangerouslySetInnerHTML={{ __html: marked(exercise) }} />
            </div>
          )}

          {analysis && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100 md:col-span-2">
              <h3 className="font-bold text-lg text-orange-800 mb-4 border-l-4 border-orange-600 pl-3">AI Deep Analysis</h3>
              <div className="prose prose-orange max-w-none" dangerouslySetInnerHTML={{ __html: marked(analysis) }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
