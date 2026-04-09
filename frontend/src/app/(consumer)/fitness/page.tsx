'use client';
import { useState, useRef, useEffect } from 'react';
import { FitnessApi } from '@/modules/fitness/api/fitness.api';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { marked } from 'marked';
import { Activity, User, Scale, Ruler, AlertTriangle, Camera, X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function FitnessPage() {
  const { user } = useAuth('CONSUMER');
  const [input, setInput] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [nutrition, setNutrition] = useState<any>(null);
  const [analysis, setAnalysis] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [exercise, setExercise] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const startCamera = async () => {
    setCameraLoading(true);
    setCameraError(null);
    
    const constraints = [
      // Try rear camera first
      { video: { facingMode: 'environment' }, audio: false },
      // Try any camera
      { video: true, audio: false },
      // Try with basic constraints
      { video: { width: 640, height: 480 }, audio: false }
    ];

    for (const constraint of constraints) {
      try {
        console.log('Trying camera constraint:', constraint);
        const stream = await navigator.mediaDevices.getUserMedia(constraint);
        
        setCameraStream(stream);
        setShowCamera(true);
        setCameraLoading(false);
        
        // Wait for video element to be ready
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            
            // Force play the video
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.error('Video play error:', error);
                // Try to play again
                videoRef.current?.play().catch(e => console.error('Second play attempt failed:', e));
              });
            }
          }
        }, 200);
        
        return; // Success, exit the loop
      } catch (error) {
        console.warn('Camera constraint failed:', constraint, error);
        continue; // Try next constraint
      }
    }
    
    // All constraints failed
    console.error('All camera attempts failed');
    setCameraLoading(false);
    setCameraError('Camera access failed. Please check permissions or use file upload.');
    setShowCamera(false);
    
    // Fallback to file input after a delay
    setTimeout(() => {
      document.getElementById('camera-input')?.click();
    }, 1000);
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      console.log('Capturing photo from video...');
      console.log('Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
      
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            console.log('Image blob created, size:', blob.size);
            const file = new File([blob], `camera-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
            console.log('File created:', file.name, 'size:', file.size, 'type:', file.type);
            
            setImage(file);
            const reader = new FileReader();
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string;
              console.log('Preview generated, length:', dataUrl.length);
              setImagePreview(dataUrl);
            };
            reader.readAsDataURL(file);
            stopCamera();
          } else {
            console.error('Failed to create blob from canvas');
          }
        }, 'image/jpeg', 0.95);
      } else {
        console.error('Failed to get canvas context');
      }
    } else {
      console.error('Video ref is null');
    }
  };

  useEffect(() => {
    // Cleanup camera stream on unmount
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const startAnalysis = async () => {
    setLoading(true);
    setAnalysis('');
    setRecommendation('');
    setExercise('');
    setNutrition(null);

    console.log('Starting analysis...');
    console.log('Input text:', input);
    console.log('Image file:', image ? image.name : 'No image');
    console.log('Image file size:', image?.size);
    console.log('Image file type:', image?.type);

    const formData = new FormData();
    formData.append('user_input', input);
    
    if (image) {
      console.log('Adding image to FormData...');
      formData.append('image', image);
      
      // Log FormData contents (for debugging)
      for (let [key, value] of formData.entries()) {
        console.log('FormData entry:', key, value instanceof File ? `File: ${value.name}, Size: ${value.size}` : value);
      }
    } else {
      console.log('No image to add to FormData');
    }

    try {
      await FitnessApi.analyzeMeal(formData, (fullText) => {
        processStream(fullText);
      });
      console.log('Analysis completed successfully');
    } catch (error) {
      console.error('Analysis failed:', error);
    }
    setLoading(false);
  };

const processStream = (text: string) => {
  console.log('Raw response:', text);

  // 1. Extract PROFILE
  const profileMatch = text.match(/\[PROFILE_DATA\]([\s\S]*?)\[\/PROFILE_DATA\]/);
  if (profileMatch) {
    try {
      const parsedProfile = JSON.parse(profileMatch[1]);
      setProfile(parsedProfile);
    } catch (e) {
      console.error('Profile parse error:', e);
    }
  }

  // 2. Extract JSON sạch (IMPORTANT FIX)
  const jsonMatch = text.match(/```json([\s\S]*?)```/);

  if (!jsonMatch) {
    console.warn('No JSON block found');
    return;
  }

  try {
    const jsonData = JSON.parse(jsonMatch[1]);
    console.log('Parsed JSON:', jsonData);

    updateUI(jsonData);
    setLoading(false);

  } catch (err) {
    console.error('JSON parse error:', err);
  }
};

  // Helper function to update UI progressively
const updateUI = (data: any) => {
  // ===== NUTRITION =====
  if (data.consumed) {
    let totalCalories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    Object.values(data.consumed).forEach((meal: any) => {
      totalCalories += meal.calories || 0;
      protein += meal.protein || 0;
      carbs += meal.carbs || 0;
      fat += meal.fat || 0;
    });

    setNutrition({
      calories: totalCalories,
      protein,
      carbs,
      fat
    });
  }

  // ===== ANALYSIS TEXT =====
  let analysisText = `
**Chế độ:** ${data.mode}
**Mục tiêu:** ${data.daily_target} kcal
**Trạng thái:** ${data.status}
**Tóm tắt:** ${data.summary}
`;

  if (data.consumed) {
    const mealMap: any = {
      breakfast: 'Sáng',
      lunch: 'Trưa',
      snack: 'Phụ',
      dinner: 'Tối'
    };

    Object.entries(data.consumed).forEach(([key, meal]: any) => {
      analysisText += `

**${mealMap[key]}:** ${meal.calories} kcal  
(P:${meal.protein}g - C:${meal.carbs}g - F:${meal.fat}g)

_${meal.suggestion || ''}_`;
    });
  }

  setAnalysis(analysisText);

  // ===== RECOMMENDATION =====
  const recs: string[] = [];
  Object.entries(data.consumed || {}).forEach(([key, meal]: any) => {
    if (meal.calories === 0 && meal.suggestion) {
      recs.push(`**${key}:** ${meal.suggestion}`);
    }
  });

  setRecommendation(recs.join('\n\n'));

  // ===== EXERCISE =====
  if (data.activity_recommendation) {
    const act = data.activity_recommendation;

    setExercise(`
**Loại:** ${act.type}  
**Cường độ:** ${act.intensity}

**Bài tập:**  
${act.content?.join('\n')}

**Coach:**  
${act.coach_advice}
`);
  }
};
  // Helper function to parse and update incrementally
  const parseAndUpdateIncrementally = (text: string) => {
    // Look for specific patterns and update as they appear
    const patterns = [
      { key: 'mode', pattern: /"mode":\s*"([^"]+)"/ },
      { key: 'daily_target', pattern: /"daily_target":\s*(\d+)/ },
      { key: 'calories_burned', pattern: /"calories_burned":\s*(\d+)/ },
      { key: 'net_calories', pattern: /"net_calories":\s*(\d+)/ },
      { key: 'status', pattern: /"status":\s*"([^"]+)"/ },
      { key: 'summary', pattern: /"summary":\s*"([^"]+)"/ }
    ];
    
    patterns.forEach(({ key, pattern }) => {
      const match = text.match(pattern);
      if (match) {
        const value = match[1];
        const partialData = { [key]: value };
        updateUI(partialData);
      }
    });
  };

  const chartData = nutrition ? {
    labels: ['Protein', 'Carbs', 'Fat'],
    datasets: [{
      data: [nutrition.protein || 0, nutrition.carbs || 0, nutrition.fat || 0],
      backgroundColor: ['#4caf50', '#2196f3', '#ff9800'],
    }]
  } : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-green-800 border-b-2 border-green-200 pb-2">Fitness Analyst AI</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="text-green-600" size={24} />
              Meal Analysis
            </CardTitle>
            <CardDescription>
              Describe your meal or take/upload a photo for AI-powered nutrition analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Describe your meal (e.g., I had 2 eggs and a toast for breakfast)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={3}
            />
            
            {/* Image Upload Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="file"
                    id="file-upload"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="w-full"
                  >
                    <Upload size={16} className="mr-2" />
                    Upload Image
                  </Button>
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    id="camera-input"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startCamera}
                    className="w-full sm:w-auto"
                  >
                    <Camera size={16} className="mr-2" />
                    Take Photo
                  </Button>
                </div>
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div className="relative">
                  <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                    <img 
                      src={imagePreview} 
                      alt="Food preview" 
                      className="w-full h-48 object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={removeImage}
                    className="absolute top-2 right-2"
                  >
                    <X size={16} />
                  </Button>
                  <div className="mt-2 text-sm text-gray-600">
                    {image?.name}
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={startAnalysis}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {loading ? 'Analyzing...' : 'Analyze Meal'}
            </Button>
          </CardContent>
        </Card>

        {profile && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Weight', value: `${profile.weight}kg`, icon: Scale },
                  { label: 'Height', value: `${profile.height}cm`, icon: Ruler },
                  { label: 'Age', value: profile.age, icon: User },
                  { label: 'BMI', value: profile.bmi, icon: Activity },
                  { label: 'Status', value: profile.status, icon: AlertTriangle, color: 'text-orange-600' }
                ].map((m, i) => (
                  <div key={i} className="text-center p-4 border border-gray-200 rounded-lg">
                    <m.icon className="mx-auto mb-2 text-green-600" size={20} />
                    <span className="text-xs text-gray-500 uppercase font-bold">{m.label}</span>
                    <strong className={`block text-xl ${m.color || 'text-green-800'}`}>{m.value}</strong>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {nutrition && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-800">Macro Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  {chartData && <Pie data={chartData} />}
                </div>
                <div className="mt-4 text-center">
                  <span className="text-4xl font-bold text-green-600">{nutrition.calories}</span>
                  <p className="text-gray-500 font-bold">Total Calories (kcal)</p>
                </div>
              </CardContent>
            </Card>
          )}

          {recommendation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-800">Recommended Menu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-blue max-w-none" dangerouslySetInnerHTML={{ __html: marked(recommendation) }} />
              </CardContent>
            </Card>
          )}

          {exercise && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-green-800">Exercise Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-green max-w-none" dangerouslySetInnerHTML={{ __html: marked(exercise) }} />
              </CardContent>
            </Card>
          )}

          {analysis && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-orange-800">AI Deep Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-orange max-w-none" dangerouslySetInnerHTML={{ __html: marked(analysis) }} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Camera Preview Modal */}
        {showCamera && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl mx-4">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Camera size={20} />
                    Camera Preview
                  </span>
                  <Button variant="ghost" size="sm" onClick={stopCamera}>
                    <X size={16} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
                  {cameraLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                      <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                        <p>Initializing camera...</p>
                      </div>
                    </div>
                  )}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-auto"
                    style={{ display: cameraLoading ? 'none' : 'block' }}
                    onLoadedMetadata={() => {
                      console.log('Video metadata loaded');
                    }}
                    onError={(e) => {
                      console.error('Video error:', e);
                    }}
                    onPlay={() => {
                      console.log('Video playing');
                    }}
                  />
                </div>
                <div className="flex gap-3">
                  <Button onClick={capturePhoto} disabled={cameraLoading} className="flex-1">
                    <Camera size={16} className="mr-2" />
                    Capture Photo
                  </Button>
                  <Button variant="outline" onClick={stopCamera} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Camera Loading Modal */}
        {cameraLoading && !showCamera && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardContent className="p-6 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-lg font-semibold">Initializing Camera</p>
                <p className="text-sm text-gray-600 mt-2">Please allow camera access when prompted</p>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Camera Error Modal */}
        {cameraError && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardContent className="p-6 text-center">
                <Camera size={48} className="mx-auto mb-4 text-red-500" />
                <p className="text-lg font-semibold">Camera Error</p>
                <p className="text-sm text-gray-600 mt-2">{cameraError}</p>
                <Button onClick={() => setCameraError(null)} className="mt-4">
                  OK
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
