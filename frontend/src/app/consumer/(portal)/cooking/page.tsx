'use client';
import { useState, useEffect, useCallback } from 'react';
import { FitnessApi } from '@/modules/fitness/api/fitness.api';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  CookingPot, Search, Loader2, ChefHat, UtensilsCrossed,
  CheckCircle2, Sparkles, X, BookOpen, Clock, Flame,
  Star, Lightbulb, Salad, ListOrdered,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

const GỢI_Ý_NHANH = [
  'Phở bò', 'Bún bò Huế', 'Cá kho tộ', 'Gà nướng mật ong',
  'Bún chả', 'Cơm tấm sườn', 'Canh chua cá', 'Thịt kho trứng',
];

function RecipeModal({ recipe, onClose }: { recipe: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 md:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      {/* Modal — full width on mobile, capped on desktop */}
      <div className="relative w-full max-w-5xl h-[96vh] md:h-[92vh] flex flex-col rounded-[28px] shadow-2xl overflow-hidden bg-[#F0F4F8]">

        {/* ══ HEADER ══ */}
        <div className="shrink-0 bg-gradient-to-r from-[#002D50] via-[#004070] to-[#005596] px-6 md:px-8 py-5 md:py-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/35 text-white rounded-full p-2 transition-all"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-4 pr-10">
            <div className="bg-orange-500 shadow-lg p-3 rounded-2xl shrink-0">
              <ChefHat size={26} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-orange-300 text-[10px] font-black uppercase tracking-[0.18em]">
                Công thức · AI Chef
              </p>
              <h2 className="text-xl md:text-2xl font-black text-white leading-snug truncate">
                {recipe.dish_name}
              </h2>
            </div>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="flex items-center gap-1.5 bg-white/10 border border-white/20 px-3 py-1.5 rounded-full text-xs font-bold text-white">
              <Clock size={12} className="text-orange-300" /> Sơ chế: {recipe.prep_time}
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 border border-white/20 px-3 py-1.5 rounded-full text-xs font-bold text-white">
              <Flame size={12} className="text-orange-400" /> Nấu: {recipe.cook_time}
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 border border-white/20 px-3 py-1.5 rounded-full text-xs font-bold text-white">
              <Star size={12} className="text-yellow-300" /> Độ khó: {recipe.difficulty}
            </span>
          </div>
        </div>

        {/* ══ BODY — scrollable ══ */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">

          {/* ── ROW 1: Dinh dưỡng (full width, compact) ── */}
          <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-blue-100 rounded-2xl px-5 py-4 flex items-center gap-4">
            <div className="bg-blue-100 p-2.5 rounded-xl shrink-0">
              <Salad size={20} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-0.5">
                Giá trị dinh dưỡng · mỗi khẩu phần
              </p>
              <p className="text-blue-900 font-semibold text-sm leading-relaxed">
                {recipe.nutrition_overview}
              </p>
            </div>
          </div>

          {/* ── ROW 2: Nguyên liệu | Các bước (2 cột) ── */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

            {/* CỘT TRÁI 2/5 — Nguyên liệu */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
              <div className="bg-orange-50 border-b border-orange-100 px-5 py-3.5 flex items-center gap-2.5">
                <div className="bg-orange-100 p-1.5 rounded-lg">
                  <UtensilsCrossed size={16} className="text-orange-500" />
                </div>
                <h3 className="font-black text-[#004070] text-xs uppercase tracking-wide">
                  Nguyên liệu cần chuẩn bị
                </h3>
              </div>
              <ul className="flex-1 overflow-y-auto p-4 space-y-2">
                {recipe.ingredients.map((ing: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 p-2.5 hover:bg-orange-50 rounded-xl transition-colors">
                    <span className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-gray-700 font-medium text-sm leading-relaxed">{ing}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CỘT PHẢI 3/5 — Các bước */}
            <div className="md:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
              <div className="bg-blue-50 border-b border-blue-100 px-5 py-3.5 flex items-center gap-2.5">
                <div className="bg-blue-100 p-1.5 rounded-lg">
                  <ListOrdered size={16} className="text-blue-600" />
                </div>
                <h3 className="font-black text-[#004070] text-xs uppercase tracking-wide">
                  Hướng dẫn các bước thực hiện
                </h3>
              </div>
              <ol className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {recipe.steps.map((step: string, i: number) => (
                  <li key={i} className="flex gap-3 p-3 hover:bg-blue-50/50 rounded-xl transition-colors">
                    <span className="w-7 h-7 bg-[#004070] text-white rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-gray-700 font-medium text-sm leading-relaxed pt-0.5">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* ── ROW 3: Bí quyết | Chúc ngon miệng (2 cột) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Bí quyết đầu bếp */}
            <div className="bg-white rounded-2xl border border-yellow-100 shadow-sm overflow-hidden">
              <div className="bg-yellow-50 border-b border-yellow-100 px-5 py-3.5 flex items-center gap-2.5">
                <div className="bg-yellow-100 p-1.5 rounded-lg">
                  <Lightbulb size={16} className="text-yellow-500" />
                </div>
                <h3 className="font-black text-[#004070] text-xs uppercase tracking-wide">
                  Bí quyết từ đầu bếp
                </h3>
              </div>
              <div className="px-5 py-4">
                <p className="text-gray-700 font-medium italic text-sm leading-relaxed">
                  "{recipe.chef_tip}"
                </p>
              </div>
            </div>

            {/* Chúc ngon miệng + nút đóng */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 flex items-center justify-between text-white shadow-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={34} className="opacity-90 shrink-0" />
                <div>
                  <p className="font-black text-base leading-tight">Chúc bạn ngon miệng!</p>
                  <p className="text-orange-100 text-xs mt-1 leading-relaxed">
                    Công thức được AI Chef<br />tối ưu cho sức khoẻ Việt
                  </p>
                </div>
              </div>
              <Button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/35 border border-white/30 text-white font-bold rounded-xl px-5 py-2 text-sm shrink-0"
              >
                Đóng
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function CookingAssistantPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [foodName, setFoodName] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<any>(null);

  const handleSearch = useCallback(async (dish?: string) => {
    const query = (dish || foodName).trim();
    if (!query) return;

    setLoading(true);
    setRecipe(null);
    if (dish) setFoodName(dish);

    try {
      await FitnessApi.getCookingRecipe({ food_name: query }, (text) => {
        try {
          const firstBrace = text.indexOf('{');
          const lastBrace = text.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace > firstBrace) {
            setRecipe(JSON.parse(text.substring(firstBrace, lastBrace + 1)));
          }
        } catch {
          // đang stream...
        }
      });
    } catch (error) {
      console.error('Lỗi tìm công thức:', error);
    }
    setLoading(false);
  }, [foodName]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      handleSearch(q);
      router.replace('/cooking');
    }
  }, [searchParams, handleSearch, router]);

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#F8FAFC]">

      {/* ── Loading overlay ── */}
      {loading && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[9998] flex items-center justify-center">
          <div className="bg-white rounded-3xl px-10 py-8 flex flex-col items-center gap-5 shadow-2xl">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-orange-500 animate-spin" />
              <ChefHat className="w-7 h-7 text-orange-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center">
              <p className="text-[#004070] text-lg font-black">Đầu bếp AI đang nấu...</p>
              <p className="text-gray-400 text-sm mt-1">Vui lòng chờ trong giây lát</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Recipe Modal ── */}
      {recipe && <RecipeModal recipe={recipe} onClose={() => setRecipe(null)} />}

      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header trang */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 pb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-2xl text-orange-600">
              <CookingPot size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-[#004070]">Trợ Lý Nấu Ăn</h1>
              <p className="text-sm text-gray-500 font-medium">Công thức ẩm thực thông minh từ AI Chef</p>
            </div>
          </div>
          <Link href="/consumer/fitness">
            <Button variant="outline" className="border-[#A3DAFF] text-[#005596] font-bold rounded-2xl h-12 gap-2">
              <UtensilsCrossed size={18} />
              PHÂN TÍCH BỮA ĂN
            </Button>
          </Link>
        </div>

        {/* Search card */}
        <Card className="border-0 shadow-xl rounded-[32px] overflow-hidden">
          <CardHeader className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-b border-orange-100 py-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <ChefHat size={22} className="text-orange-500" />
              <CardTitle className="text-[#004070] text-2xl font-black">TRA CỨU CÔNG THỨC NẤU ĂN</CardTitle>
            </div>
            <CardDescription className="text-gray-500 font-medium text-sm">
              Nhập tên món bạn muốn — AI tạo công thức đầy đủ ngay lập tức
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6 bg-white">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="VD: Cá kho tộ, Phở bò, Bún chả Hà Nội..."
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-12 h-14 text-base border-2 border-gray-200 focus:border-orange-400 rounded-2xl bg-gray-50 transition-colors"
                />
              </div>
              <Button
                onClick={() => handleSearch()}
                disabled={!foodName.trim() || loading}
                className="h-14 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black px-8 rounded-2xl shadow-lg gap-2"
              >
                <Search size={18} />
                TÌM KIẾM
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Gợi ý món ăn phổ biến</p>
              <div className="flex flex-wrap gap-2">
                {GỢI_Ý_NHANH.map((dish) => (
                  <button
                    key={dish}
                    onClick={() => handleSearch(dish)}
                    disabled={loading}
                    className="px-4 py-2 bg-orange-50 hover:bg-orange-100 active:scale-95 border border-orange-200 hover:border-orange-400 text-orange-700 font-semibold text-sm rounded-xl transition-all disabled:opacity-50"
                  >
                    {dish}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature hints */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: <UtensilsCrossed size={20} className="text-orange-500" />,
              bg: 'bg-orange-50',
              title: 'Nguyên liệu chi tiết',
              desc: 'Đầy đủ định lượng, dễ chuẩn bị cho mọi gia đình Việt',
            },
            {
              icon: <BookOpen size={20} className="text-blue-500" />,
              bg: 'bg-blue-50',
              title: 'Hướng dẫn từng bước',
              desc: 'Các bước rõ ràng, phù hợp với mọi trình độ nấu ăn',
            },
            {
              icon: <Sparkles size={20} className="text-yellow-500" />,
              bg: 'bg-yellow-50',
              title: 'Mẹo từ chuyên gia',
              desc: 'Bí quyết giúp món ăn ngon hơn từ AI Chef chuyên nghiệp',
            },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
              <div className={`${item.bg} p-2.5 rounded-xl shrink-0`}>{item.icon}</div>
              <div>
                <p className="font-black text-gray-800 text-sm">{item.title}</p>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
