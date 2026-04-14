'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { FitnessApi } from '@/modules/fitness/api/fitness.api';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useSearchParams, useRouter } from 'next/navigation';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { 
  CookingPot,
  ChefHat,
  Timer,
  Flame,
  Activity, 
  Camera, 
  X, 
  Upload, 
  Loader2, 
  Sparkles, 
  Utensils, 
  Info, 
  CheckCircle2, 
  Lightbulb,
  Clock,
  ArrowRight,
  ChevronRight,
  Target,
  Edit2,
  Save,
  Link as LinkIcon,
  RefreshCw,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle,
  SheetFooter
} from "@/components/ui/sheet";

ChartJS.register(ArcElement, Tooltip, Legend);

import Link from 'next/link';

export default function FitnessPage() {
  const { user } = useAuth('CONSUMER');
  const searchParams = useSearchParams();
  const router = useRouter();
  const [input, setInput] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [fullData, setFullData] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [vectorId, setVectorId] = useState<string | null>(null);
  
  // Correction Sheet states
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [correctionMode, setCorrectionMode] = useState<'text' | 'link' | 'ai'>('text');
  const [correctedFoodName, setCorrectedFoodName] = useState('');
  const [correctedDescription, setCorrectedDescription] = useState('');
  const [correctedLink, setCorrectedLink] = useState('');
  const [isUpdatingCorrection, setIsUpdatingCorrection] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const runTextAnalysis = useCallback(async (text: string) => {
    setInput(text);
    setImage(null);
    setImagePreview(null);
    setLoading(true);
    setFullData(null);
    setIsModalOpen(false);
    try {
      await FitnessApi.analyzeText({ user_input: text }, processStream);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      runTextAnalysis(q);
      router.replace('/fitness');
    }
  }, [searchParams, runTextAnalysis, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch (err) {
      console.error('Camera access failed:', err);
    }
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
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
            setImage(file);
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target?.result as string);
            reader.readAsDataURL(file);
            stopCamera();
          }
        }, 'image/jpeg');
      }
    }
  };

  const startAnalysis = async (customInput?: string, overrideVectorId?: string) => {
    setLoading(true);
    setFullData(null);

    const formData = new FormData();
    formData.append('user_input', customInput || input);
    if (image) formData.append('image', image);
    if (overrideVectorId) formData.append('vector_id', overrideVectorId);

    try {
      if (image) {
        await FitnessApi.analyzeImage(formData, processStream);
      } else {
        await FitnessApi.analyzeText({ user_input: customInput || input }, processStream);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    }
    setLoading(false);
  };

  const processStream = (text: string) => {
    const vectorIdMatch = text.match(/\[VECTOR_ID\]([\s\S]*?)\[\/VECTOR_ID\]/);
    if (vectorIdMatch) {
      setVectorId(vectorIdMatch[1]);
    }

    const profileMatch = text.match(/\[PROFILE_DATA\]([\s\S]*?)\[\/PROFILE_DATA\]/);
    if (profileMatch) {
      try {
        setProfile(JSON.parse(profileMatch[1]));
      } catch (e) {}
    }

    let jsonDataStr = "";
    const jsonMarkdownMatch = text.match(/```json([\s\S]*?)```/);
    
    if (jsonMarkdownMatch) {
      jsonDataStr = jsonMarkdownMatch[1];
    } else {
      const firstBrace = text.indexOf('{', text.indexOf('[/PROFILE_DATA]'));
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonDataStr = text.substring(firstBrace, lastBrace + 1);
      }
    }

    if (jsonDataStr) {
      try {
        const parsed = JSON.parse(jsonDataStr);
        setFullData(parsed);
        if (parsed.identified_food) {
          setIsModalOpen(true);
        }
      } catch (err) {}
    }
  };

  const handleCorrection = async () => {
    if (!correctedFoodName.trim()) {
      alert("Please enter the food name");
      return;
    }

    if (correctionMode === 'ai') {
      setIsSheetOpen(false);
      setIsModalOpen(false);
      startAnalysis(correctedFoodName, vectorId || undefined);
      return;
    }

    if (!vectorId) {
      alert("Vector ID not found for update");
      return;
    }
    
    setIsUpdatingCorrection(true);
    try {
      const formData = new FormData();
      if (image) formData.append('image', image);
      
      let finalDescription = `Food Name: ${correctedFoodName}\n\n`;
      if (correctionMode === 'link') {
        finalDescription += `Reference Link: ${correctedLink}\n\nManual Context: ${correctedDescription}`;
      } else {
        finalDescription += `Detailed Description: ${correctedDescription || (fullData?.summary || "")}`;
      }
      
      formData.append('correct_description', finalDescription);
      formData.append('vector_id', vectorId);

      const response = await FitnessApi.correctImage(formData);
      if (response) {
        setFullData({ ...fullData, identified_food: correctedFoodName, summary: correctedDescription || fullData.summary });
        alert("Information updated successfully!");
        setIsSheetOpen(false);
      }
    } catch (error: any) {
      console.error('Correction failed:', error);
      const errorMsg = error.response?.data?.error || error.message || "Update failed, please try again";
      alert(`Error: ${errorMsg}`);
    } finally {
      setIsUpdatingCorrection(false);
    }
  };

  const getPieData = () => {
    if (!fullData || !fullData.consumed) return null;
    let p = 0, c = 0, f = 0;
    Object.values(fullData.consumed).forEach((meal: any) => {
      p += meal.protein || 0;
      c += meal.carbs || 0;
      f += meal.fat || 0;
    });
    return {
      labels: ['Protein', 'Carbs', 'Fat'],
      datasets: [{
        data: [p, c, f],
        backgroundColor: ['#005596', '#87C6EE', '#A3DAFF'],
        borderWidth: 0,
      }]
    };
  };

  const getTotalCalories = () => {
    if (!fullData || !fullData.consumed) return 0;
    return Object.values(fullData.consumed).reduce((acc: number, meal: any) => acc + (meal.calories || 0), 0);
  };

  return (
    <div className="p-4 md:p-8 relative min-h-full">
      {loading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[9999] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-16 h-16 text-white animate-spin" />
          <p className="text-white text-xl font-medium animate-pulse tracking-wide">AI analyzing meal...</p>
        </div>
      )}

      <div className={`max-w-6xl mx-auto space-y-8 ${loading ? 'pointer-events-none select-none opacity-50' : ''}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#A3DAFF]/30 pb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#A3DAFF] rounded-2xl shadow-sm text-[#004070]">
              <Utensils size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#004070]">Meal Analyst</h1>
              <p className="text-sm text-gray-500 font-medium">Identify nutrients and get meal suggestions</p>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <Link href="/cooking">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl shadow-md gap-2 h-12">
                <ChefHat size={18} />
                COOKING ASSISTANT
              </Button>
            </Link>
            {profile && (
              <div className="flex gap-3">
                <div className="bg-white border border-[#A3DAFF] px-4 py-2 rounded-xl shadow-sm flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase">BMI</span>
                  <span className="text-lg font-bold text-[#005596]">{profile.bmi}</span>
                </div>
                <div className="bg-white border border-[#A3DAFF] px-4 py-2 rounded-xl shadow-sm flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase">Status</span>
                  <span className="text-sm font-bold text-[#004070]">{profile.status}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-3xl mx-auto space-y-8">
          <Card className="border-[#A3DAFF]/40 shadow-xl overflow-hidden rounded-[40px] bg-white">
            <CardHeader className="bg-[#F0F9FF] border-b border-[#A3DAFF]/20 py-8">
              <CardTitle className="text-[#004070] flex items-center justify-center gap-3 text-2xl font-black">
                <Sparkles size={24} className="text-[#A3DAFF]" />
                NUTRITION IDENTIFICATION
              </CardTitle>
              <CardDescription className="text-center font-medium text-gray-500">
                Capture photo or describe your meal for AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="relative group">
                <Textarea
                  placeholder="What did you eat today? (e.g., 1 bowl of beef pho, 2 slices of brown bread...)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="min-h-[180px] border-2 border-[#A3DAFF]/30 focus:border-[#A3DAFF] focus:ring-0 text-xl rounded-[32px] p-6 resize-none transition-all bg-gray-50/30"
                />
                <div className="absolute bottom-4 right-6 text-[#A3DAFF] opacity-20 group-focus-within:opacity-100 transition-opacity">
                  <Utensils size={40} />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex gap-3 w-full sm:w-auto">
                  <input type="file" id="file-upload" accept="image/*" onChange={handleFileChange} className="hidden" />
                  <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()} className="flex-1 rounded-2xl border-[#A3DAFF] text-[#005596] hover:bg-[#F0F9FF] h-14 px-6 font-bold">
                    <Upload size={20} className="mr-2" />
                    UPLOAD
                  </Button>
                  <Button variant="outline" onClick={startCamera} className="flex-1 rounded-2xl border-[#A3DAFF] text-[#005596] hover:bg-[#F0F9FF] h-14 px-6 font-bold">
                    <Camera size={20} className="mr-2" />
                    CAMERA
                  </Button>
                </div>
                
                <Button 
                  onClick={() => startAnalysis()} 
                  disabled={(!input.trim() && !image) || loading}
                  className="w-full sm:w-auto sm:ml-auto bg-[#004070] text-white hover:bg-[#005596] font-black px-12 h-14 rounded-2xl shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0"
                >
                  ANALYZE NOW
                </Button>
              </div>

              {imagePreview && (
                <div className="relative inline-block animate-in zoom-in-95 duration-300">
                  <div className="p-2 bg-white rounded-[32px] shadow-2xl border-2 border-[#A3DAFF]/20">
                    <img src={imagePreview} alt="Preview" className="w-64 h-64 object-cover rounded-[24px]" />
                  </div>
                  <button onClick={removeImage} className="absolute -top-4 -right-4 bg-red-500 text-white rounded-2xl p-2.5 shadow-xl hover:bg-red-600 transition-colors border-4 border-white">
                    <X size={20} />
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {!fullData && !loading && (
            <div className="text-center py-12 space-y-4">
              <div className="bg-[#A3DAFF]/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target size={32} className="text-[#A3DAFF]" />
              </div>
              <h3 className="text-xl font-bold text-[#004070]">Ready to analyze</h3>
              <p className="text-gray-400 max-w-xs mx-auto">Nutrition info and AI suggestions will appear here after analysis.</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && fullData && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
          <div className="fixed inset-0 bg-black/30" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="bg-[#F8FAFC] w-full max-w-[95vw] max-h-[95vh] overflow-y-auto rounded-[40px] shadow-2xl relative z-10 border border-white/20">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors z-20"
            >
              <X size={20} />
            </button>

            <div className="bg-[#004070] p-6 md:p-8 text-white relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-[24px] backdrop-blur-xl border border-white/10">
                    <Utensils size={32} className="text-[#A3DAFF]" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#A3DAFF] text-[#004070] text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">{fullData.current_meal_type}</span>
                      <span className="text-white/50 text-[10px] font-bold uppercase tracking-tighter">Detected Meal</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">{fullData.identified_food}</h2>
                      {vectorId && (
                        <Button 
                          onClick={() => {
                            setCorrectedFoodName(fullData.identified_food);
                            setCorrectedDescription(fullData.summary || "");
                            setIsSheetOpen(true);
                          }}
                          className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl px-4 h-9 text-[10px] font-black gap-2 backdrop-blur-sm"
                        >
                          <Edit2 size={12} className="text-[#A3DAFF]" />
                          SỬA LẠI
                        </Button>
                      )}
                    </div>
                    {fullData.timing_assessment && (
                      <div className={`mt-2 p-3 rounded-2xl flex items-start gap-3 border ${fullData.timing_assessment.is_suitable ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                        <div className={`p-1 rounded-full ${fullData.timing_assessment.is_suitable ? 'bg-green-500' : 'bg-red-500'}`}>
                          {fullData.timing_assessment.is_suitable ? <CheckCircle2 size={12} className="text-white" /> : <X size={12} className="text-white" />}
                        </div>
                        <p className="text-[12px] font-medium text-white/90 italic leading-relaxed">
                          {fullData.timing_assessment.reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-row md:flex-col gap-2 items-end">
                   <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 text-center backdrop-blur-sm">
                    <p className="text-[9px] font-bold text-[#A3DAFF] uppercase mb-0.5">Status</p>
                    <p className="text-lg font-black uppercase">{fullData.status}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                <section className="space-y-4">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Lightbulb size={14} className="text-yellow-500" /> ANALYSIS DETAILS
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fullData.consumed && Object.entries(fullData.consumed).map(([key, meal]: any) => (
                      <div key={key} className="bg-white border border-[#A3DAFF]/40 rounded-[32px] p-6 shadow-md hover:shadow-lg transition-all border-b-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-black text-[#004070] text-lg uppercase tracking-tight">{key}</h4>
                            <div className="bg-[#F0F9FF] px-3 py-1 rounded-full border border-[#A3DAFF]/30">
                              <span className="text-[#005596] font-black text-xs">{meal.calories} kcal</span>
                            </div>
                          </div>
                          
                          {meal.calories > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { label: 'Prot', val: meal.protein, color: 'bg-[#005596]' },
                                { label: 'Carb', val: meal.carbs, color: 'bg-[#87C6EE]' },
                                { label: 'Fat', val: meal.fat, color: 'bg-[#A3DAFF]' }
                              ].map(m => (
                                <div key={m.label} className="bg-gray-50 rounded-2xl p-2 text-center border border-gray-100">
                                  <p className="text-[9px] font-black text-gray-400 uppercase mb-1">{m.label}</p>
                                  <p className="text-sm font-black text-[#004070]">{m.val}g</p>
                                  <div className={`h-1 w-full ${m.color} rounded-full mt-1.5 opacity-60`}></div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className={`space-y-2 ${meal.calories > 0 ? 'pt-3 border-t-2 border-dashed border-[#A3DAFF]/30' : ''}`}>
                            <p className="text-[11px] font-black text-[#A3DAFF] uppercase tracking-wider">NEXT ANALYSIS:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {meal.suggestion.split(',').map((dish: string) => (
                                <button
                                  key={dish}
                                  onClick={() => runTextAnalysis(dish.trim())}
                                  className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white border border-[#A3DAFF]/30 text-[#004070] hover:bg-[#A3DAFF]/20 hover:border-[#A3DAFF]/50 transition-all flex items-center gap-1 group/btn"
                                >
                                  {dish.trim()}
                                  <Sparkles size={8} className="text-[#A3DAFF] opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {fullData.cooking_instructions && (
                  <section className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-[#A3DAFF]/20 pb-2">
                      <CookingPot size={20} className="text-orange-500" />
                      <h3 className="text-sm font-black text-[#004070] uppercase tracking-widest">
                        CÁCH CHẾ BIẾN & THÀNH PHẦN
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Ingredients Section */}
                      {fullData.cooking_instructions.ingredients && fullData.cooking_instructions.ingredients.length > 0 && (
                        <div className="bg-white border border-[#A3DAFF]/40 rounded-[32px] p-6 shadow-md">
                          <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Utensils size={14} className="text-[#005596]" /> THÀNH PHẦN CHÍNH
                          </h4>
                          <div className="space-y-3">
                            {fullData.cooking_instructions.ingredients.map((ing: string, i: number) => (
                              <div key={i} className="flex items-center gap-3 text-sm font-medium text-gray-600">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#A3DAFF]"></div>
                                {ing}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Steps Section */}
                      {fullData.cooking_instructions.steps && fullData.cooking_instructions.steps.length > 0 && (
                        <div className="bg-white border border-[#A3DAFF]/40 rounded-[32px] p-6 shadow-md">
                          <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <ChefHat size={14} className="text-orange-500" /> CÁC BƯỚC THỰC HIỆN
                          </h4>
                          <div className="space-y-4">
                            {fullData.cooking_instructions.steps.map((step: string, i: number) => (
                              <div key={i} className="flex items-start gap-4">
                                <div className="bg-[#F0F9FF] text-[#005596] w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-black text-[10px] border border-[#A3DAFF]/40">
                                  {i + 1}
                                </div>
                                <p className="text-xs font-medium text-gray-600 leading-relaxed pt-1">{step}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {(fullData.cooking_instructions.prep_time || fullData.cooking_instructions.cook_time) && (
                      <div className="flex gap-4">
                        {fullData.cooking_instructions.prep_time && (
                          <div className="bg-white border border-[#A3DAFF]/20 rounded-2xl px-4 py-2 flex items-center gap-2 shadow-sm">
                            <Timer size={14} className="text-blue-500" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Sơ chế:</span>
                            <span className="text-xs font-black text-[#004070]">{fullData.cooking_instructions.prep_time}</span>
                          </div>
                        )}
                        {fullData.cooking_instructions.cook_time && (
                          <div className="bg-white border border-[#A3DAFF]/20 rounded-2xl px-4 py-2 flex items-center gap-2 shadow-sm">
                            <Clock size={14} className="text-orange-500" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Nấu:</span>
                            <span className="text-xs font-black text-[#004070]">{fullData.cooking_instructions.cook_time}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                )}

                <section className="space-y-3">
                  <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Info size={16} className="text-[#A3DAFF]" /> SUMMARY
                  </h3>
                  <div className="bg-white p-5 rounded-[24px] border border-[#A3DAFF]/20 shadow-sm relative">
                    <p className="text-base text-[#004070] font-medium leading-relaxed italic">
                      {fullData.summary}
                    </p>
                  </div>
                </section>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <section className="bg-white p-7 rounded-[32px] border border-[#A3DAFF]/20 shadow-lg flex flex-col items-center">
                  <h3 className="text-[11px] font-black text-[#004070] uppercase tracking-widest mb-4">NUTRITION RATIO</h3>
                  <div className="relative w-full max-w-[180px] mb-5">
                    <Pie data={getPieData() as any} options={{ cutout: '75%', plugins: { legend: { display: false } } }} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-black text-[#004070] leading-none">{getTotalCalories()}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">CALO</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 w-full gap-2">
                    {['Protein', 'Carbs', 'Fat'].map((label, i) => {
                      const colors = ['#005596', '#87C6EE', '#A3DAFF'];
                      return (
                        <div key={label} className="text-center">
                          <div className="w-8 h-1.5 rounded-full mx-auto mb-1.5" style={{ backgroundColor: colors[i] }}></div>
                          <p className="text-[10px] font-black text-gray-400 uppercase">{label}</p>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {fullData.activity_recommendation && (
                  <section className="bg-[#004070] text-white rounded-[32px] shadow-xl overflow-hidden border-none p-6 space-y-4 relative">
                    <div className="flex items-center gap-2 text-lg font-black italic">
                      <Activity className="text-[#A3DAFF]" size={20} />
                      WORKOUT
                    </div>
                    
                    <div className="space-y-3 relative z-10">
                      <div className="bg-white/10 rounded-2xl p-3 border border-white/10 backdrop-blur-sm">
                        <p className="text-lg font-black leading-tight">{fullData.activity_recommendation.type}</p>
                        <p className="text-[10px] font-bold uppercase tracking-tighter text-[#A3DAFF]">Intensity: {fullData.activity_recommendation.intensity}</p>
                      </div>
                      
                      <div className="space-y-2">
                        {fullData.activity_recommendation.content.slice(0, 2).map((item: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-[12px] font-medium leading-snug">
                            <div className="mt-1 bg-[#A3DAFF] text-[#004070] rounded-full p-0.5 shrink-0">
                              <CheckCircle2 size={10} />
                            </div>
                            <span className="opacity-90">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 flex justify-center gap-3 bg-white/50">
              <Button 
                onClick={() => setIsModalOpen(false)}
                className="bg-[#004070] text-white hover:bg-[#005596] font-black px-12 h-12 rounded-2xl shadow-sm text-sm"
              >
                ĐÃ HIỂU
              </Button>
            </div>
          </div>
        </div>
      )}

      {showCamera && (
        <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-2xl aspect-video bg-gray-900 rounded-[40px] overflow-hidden border-4 border-[#A3DAFF] shadow-2xl">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute top-6 right-6">
               <button onClick={stopCamera} className="bg-black/50 text-white p-3 rounded-2xl hover:bg-black/70 transition-all">
                <X size={24} />
              </button>
            </div>
            <div className="absolute bottom-10 left-0 right-0 flex justify-center">
              <button 
                onClick={capturePhoto} 
                className="group bg-[#A3DAFF] text-[#004070] p-1 rounded-full hover:scale-105 transition-all shadow-[0_0_30px_rgba(163,218,255,0.5)] border-8 border-white/20"
              >
                <div className="bg-[#A3DAFF] p-6 rounded-full border-4 border-[#004070]">
                  <Camera size={32} />
                </div>
              </button>
            </div>
          </div>
          <p className="text-white/50 text-sm mt-6 font-medium">Position your meal in the center of the frame</p>
        </div>
      )}

      {/* Shadcn Sheet for Correction */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 border-none bg-white shadow-2xl">
          <div className="h-full flex flex-col">
            <div className="bg-[#004070] p-8 text-white">
              <SheetHeader className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Edit2 size={24} className="text-[#A3DAFF]" />
                  </div>
                  <SheetTitle className="text-2xl font-black text-white uppercase tracking-tight">Sửa Thông Tin</SheetTitle>
                </div>
                <SheetDescription className="text-white/60 font-medium">
                  Cung cấp thông tin chính xác để AI học lại món ăn này.
                </SheetDescription>
              </SheetHeader>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Option Tabs */}
              <div className="flex p-1 bg-gray-100 rounded-2xl">
                {[
                  { id: 'text', label: 'Manual', icon: FileText },
                  { id: 'link', label: 'Link', icon: LinkIcon },
                  { id: 'ai', label: 'AI Gen', icon: RefreshCw },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setCorrectionMode(mode.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${
                      correctionMode === mode.id 
                      ? 'bg-white text-[#004070] shadow-sm' 
                      : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <mode.icon size={14} />
                    {mode.label}
                  </button>
                ))}
              </div>

              <div className="space-y-6">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tên món ăn đúng</label>
                  <Input
                    value={correctedFoodName}
                    onChange={(e) => setCorrectedFoodName(e.target.value)}
                    className="h-14 bg-gray-50 border-2 border-[#A3DAFF]/20 rounded-2xl px-5 font-bold text-[#004070] focus-visible:ring-0 focus-visible:border-[#004070] transition-all text-lg"
                    placeholder="Ví dụ: Bánh Custas, Phở bò..."
                  />
                </div>

                {correctionMode === 'link' && (
                  <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Đường dẫn tham khảo (URL)</label>
                    <div className="relative">
                      <Input
                        value={correctedLink}
                        onChange={(e) => setCorrectedLink(e.target.value)}
                        className="h-14 bg-gray-50 border-2 border-[#A3DAFF]/20 rounded-2xl pl-12 pr-5 font-medium text-[#004070] focus-visible:ring-0 focus-visible:border-[#004070] transition-all"
                        placeholder="https://example.com/recipe"
                      />
                      <LinkIcon className="absolute left-4 top-4.5 text-[#A3DAFF]" size={20} />
                    </div>
                  </div>
                )}

                {(correctionMode === 'text' || correctionMode === 'link') && (
                  <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      {correctionMode === 'link' ? 'Ghi chú thêm' : 'Mô tả chi tiết món ăn'}
                    </label>
                    <Textarea
                      value={correctedDescription}
                      onChange={(e) => setCorrectedDescription(e.target.value)}
                      className="min-h-[200px] bg-gray-50 border-2 border-[#A3DAFF]/20 rounded-2xl p-5 font-medium text-gray-600 focus-visible:ring-0 focus-visible:border-[#004070] transition-all resize-none leading-relaxed"
                      placeholder={correctionMode === 'link' ? "Thông tin bổ sung từ link..." : "Nhập nguyên liệu, thành phần dinh dưỡng hoặc cách chế biến..."}
                    />
                  </div>
                )}

                {correctionMode === 'ai' && (
                  <div className="bg-[#F0F9FF] p-6 rounded-[32px] border-2 border-[#A3DAFF]/20 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3 text-[#004070]">
                      <RefreshCw size={24} className="animate-spin-slow text-[#A3DAFF]" />
                      <p className="font-bold text-sm">AI Phân Tích Lại</p>
                    </div>
                    <p className="text-xs text-[#004070]/70 leading-relaxed font-medium">
                      Hệ thống sẽ sử dụng tên món ăn mới bạn vừa nhập để phân tích lại toàn bộ giá trị dinh dưỡng dựa trên hình ảnh đã chụp.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => setIsSheetOpen(false)} 
                className="flex-1 rounded-2xl h-14 font-bold border-2 border-gray-200 text-gray-400 hover:bg-gray-100"
              >
                HỦY
              </Button>
              <Button 
                onClick={handleCorrection} 
                disabled={isUpdatingCorrection}
                className="flex-1 bg-[#004070] hover:bg-[#005596] text-white rounded-2xl h-14 font-black shadow-xl gap-2"
              >
                {isUpdatingCorrection ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    {correctionMode === 'ai' ? <RefreshCw size={18} /> : <Save size={18} />}
                    {correctionMode === 'ai' ? 'PHÂN TÍCH LẠI' : 'CẬP NHẬT'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
