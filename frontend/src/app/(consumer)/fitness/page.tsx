'use client';
import { useState, useRef, useEffect } from 'react';
import { FitnessApi } from '@/modules/fitness/api/fitness.api';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { 
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
  Target
} from 'lucide-react';
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
  const [fullData, setFullData] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const startAnalysis = async () => {
    setLoading(true);
    setFullData(null);

    const formData = new FormData();
    formData.append('user_input', input);
    if (image) formData.append('image', image);

    try {
      if (image) {
        await FitnessApi.analyzeImage(formData, processStream);
      } else {
        await FitnessApi.analyzeText({ user_input: input }, processStream);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    }
    setLoading(false);
  };

  const processStream = (text: string) => {
    // Extract profile data
    const profileMatch = text.match(/\[PROFILE_DATA\]([\s\S]*?)\[\/PROFILE_DATA\]/);
    if (profileMatch) {
      try {
        setProfile(JSON.parse(profileMatch[1]));
      } catch (e) {}
    }

    // Try to find JSON block
    let jsonDataStr = "";
    const jsonMarkdownMatch = text.match(/```json([\s\S]*?)```/);
    
    if (jsonMarkdownMatch) {
      jsonDataStr = jsonMarkdownMatch[1];
    } else {
      // If no markdown, look for first { and last }
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
        // Tự động mở modal khi có dữ liệu ổn định
        if (parsed.identified_food) {
          setIsModalOpen(true);
        }
      } catch (err) {
        // Có thể JSON chưa hoàn thiện do đang stream, bỏ qua
      }
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
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[9999] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-16 h-16 text-white animate-spin" />
          <p className="text-white text-xl font-medium animate-pulse tracking-wide">AI đang phân tích món ăn...</p>
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

        <div className="max-w-3xl mx-auto space-y-8">
          <Card className="border-[#A3DAFF]/40 shadow-xl overflow-hidden rounded-[40px] bg-white">
            <CardHeader className="bg-[#F0F9FF] border-b border-[#A3DAFF]/20 py-8">
              <CardTitle className="text-[#004070] flex items-center justify-center gap-3 text-2xl font-black">
                <Sparkles size={24} className="text-[#A3DAFF]" />
                NHẬN DIỆN DINH DƯỠNG
              </CardTitle>
              <CardDescription className="text-center font-medium text-gray-500">
                Chụp ảnh hoặc mô tả bữa ăn của bạn để AI phân tích
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="relative group">
                <Textarea
                  placeholder="Hôm nay bạn đã ăn gì? (VD: 1 bát phở bò, 2 lát bánh mì đen...)"
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
                    TẢI ẢNH
                  </Button>
                  <Button variant="outline" onClick={startCamera} className="flex-1 rounded-2xl border-[#A3DAFF] text-[#005596] hover:bg-[#F0F9FF] h-14 px-6 font-bold">
                    <Camera size={20} className="mr-2" />
                    MÁY ẢNH
                  </Button>
                </div>
                
                <Button 
                  onClick={startAnalysis} 
                  disabled={(!input.trim() && !image) || loading}
                  className="w-full sm:w-auto sm:ml-auto bg-[#004070] text-white hover:bg-[#005596] font-black px-12 h-14 rounded-2xl shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0"
                >
                  PHÂN TÍCH NGAY
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
              <h3 className="text-xl font-bold text-[#004070]">Sẵn sàng phân tích</h3>
              <p className="text-gray-400 max-w-xs mx-auto">Thông tin dinh dưỡng và gợi ý từ AI sẽ hiển thị tại đây sau khi bạn gửi dữ liệu.</p>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Result MODAL */}
      {isModalOpen && fullData && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
          <div className="fixed inset-0 bg-black/30" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="bg-[#F8FAFC] w-full max-w-[95vw] max-h-[95vh] overflow-y-auto rounded-[40px] shadow-2xl relative z-10 border border-white/20">
            {/* Modal Close */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors z-20"
            >
              <X size={20} />
            </button>

            {/* Modal Header Banner */}
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
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">{fullData.identified_food}</h2>
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
              {/* Left Column: Details */}
              <div className="lg:col-span-8 space-y-6">
                <section className="space-y-4">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Lightbulb size={14} className="text-yellow-500" /> Gợi ý thực đơn hôm nay
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {Object.entries(fullData.consumed || {}).map(([key, meal]: any) => (
                      <div key={key} className={`p-6 rounded-[32px] border transition-all ${meal.calories > 0 ? 'bg-white border-[#A3DAFF]/40 shadow-md ring-4 ring-[#A3DAFF]/5' : 'bg-gray-100/50 border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <span className={`text-[12px] font-black uppercase px-3 py-1 rounded-full ${meal.calories > 0 ? 'bg-[#F0F9FF] text-[#005596]' : 'bg-gray-200 text-gray-500'}`}>{key}</span>
                          {meal.calories > 0 && <CheckCircle2 size={20} className="text-green-500" />}
                        </div>
                        <div className="space-y-4">
                          {meal.calories > 0 && (
                            <div className="space-y-2">
                              <p className="text-3xl font-black text-[#004070]">{meal.calories} <small className="text-[12px] font-bold text-gray-400 uppercase">KCAL</small></p>
                              <div className="space-y-1.5 pt-2 border-t border-gray-50">
                                <p className="text-[13px] font-bold text-[#005596] flex justify-between"><span>Đạm:</span> <span>{meal.protein}g</span></p>
                                <p className="text-[13px] font-bold text-[#005596] flex justify-between"><span>Tinh bột:</span> <span>{meal.carbs}g</span></p>
                                <p className="text-[13px] font-bold text-[#005596] flex justify-between"><span>Chất béo:</span> <span>{meal.fat}g</span></p>
                              </div>
                            </div>
                          )}
                          <div className={`space-y-1.5 ${meal.calories > 0 ? 'pt-3 border-t-2 border-dashed border-[#A3DAFF]/30' : ''}`}>
                            <p className="text-[11px] font-black text-[#A3DAFF] uppercase tracking-wider">Món ăn khuyên dùng:</p>
                            <p className="text-[14px] text-gray-700 leading-relaxed font-semibold">{meal.suggestion}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Info size={16} className="text-[#A3DAFF]" /> Nhận xét chuyên gia
                  </h3>
                  <div className="bg-white p-5 rounded-[24px] border border-[#A3DAFF]/20 shadow-sm relative">
                    <p className="text-base text-[#004070] font-medium leading-relaxed italic">
                      {fullData.summary}
                    </p>
                  </div>
                </section>
              </div>

              {/* Right Column: Macro & Workout */}
              <div className="lg:col-span-4 space-y-6">
                <section className="bg-white p-7 rounded-[32px] border border-[#A3DAFF]/20 shadow-lg flex flex-col items-center">
                  <h3 className="text-[11px] font-black text-[#004070] uppercase tracking-widest mb-4">Tỷ lệ dinh dưỡng</h3>
                  <div className="relative w-full max-w-[180px] mb-5">
                    <Pie data={getPieData() as any} options={{ cutout: '75%', plugins: { legend: { display: false } } }} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-black text-[#004070] leading-none">{getTotalCalories()}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Calo</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 w-full gap-2">
                    {['Đạm', 'Tinh bột', 'Chất béo'].map((label, i) => {
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
                      TẬP LUYỆN
                    </div>
                    
                    <div className="space-y-3 relative z-10">
                      <div className="bg-white/10 rounded-2xl p-3 border border-white/10 backdrop-blur-sm">
                        <p className="text-lg font-black leading-tight">{fullData.activity_recommendation.type}</p>
                        <p className="text-[10px] font-bold uppercase tracking-tighter text-[#A3DAFF]">Cường độ: {fullData.activity_recommendation.intensity}</p>
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
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-center bg-white/50">
              <Button 
                onClick={() => setIsModalOpen(false)}
                className="bg-[#004070] text-white hover:bg-[#005596] font-black px-8 h-10 rounded-xl shadow-sm text-xs"
              >
                ĐÃ HIỂU
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
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
    </div>
  );
}
