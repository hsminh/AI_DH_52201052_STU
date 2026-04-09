def get_fitness_analyst_prompt(user_input, context="", body_metrics=None):
    """
    Trả về prompt phân tích fitness với ngữ cảnh RAG và chỉ số cơ thể.
    """
    context_str = f"DỮ LIỆU TỪ HỆ THỐNG HUẤN LUYỆN (Sử dụng để tính toán calo chính xác):\n{context}\n" if context else ""
    
    metrics_str = ""
    if body_metrics:
        metrics_str = f"""
THÔNG SỐ CƠ THỂ HIỆN TẠI:
- BMI: {body_metrics['bmi']} ({body_metrics['status']})
- BMR: {body_metrics['bmr']} kcal
- TDEE: {body_metrics['tdee']} kcal
- MỤC TIÊU TĂNG CÂN: {body_metrics['target_gain']} kcal
- MỤC TIÊU GIẢM CÂN: {body_metrics['target_loss']} kcal
- CƠ ĐỊA: {body_metrics.get('body_type', 'Bình thường')}
- TÌNH TRẠNG SỨC KHỎE: {body_metrics.get('health_condition', 'Ổn định')}
CẢNH BÁO SỨC KHỎE: {body_metrics['warning']}
"""

    return f"""
Hãy đóng vai một Chuyên gia Dinh dưỡng và Fitness cao cấp, đặc biệt am hiểu về Y khoa và Chuyển hóa. 
Phân tích dữ liệu người dùng dựa trên thông số cơ thể, CƠ ĐỊA và TÌNH TRẠNG BỆNH LÝ của họ.

{context_str}
{metrics_str}

YÊU CẦU PHÂN TÍCH CHUYÊN SÂU:
1. ĐÁNH GIÁ MÂU THUẪN: Người dùng có BMI rất cao ({body_metrics['bmi'] if body_metrics else 'N/A'}) nhưng lại có cơ địa "Khó tăng cân" và "Bệnh về chuyển hóa". Hãy giải thích điều này dưới góc độ y khoa (ví dụ: kháng insulin, rối loạn nội tiết, hoặc chuyển hóa chậm).
2. CHIẾN LƯỢC DINH DƯỠNG ĐẶC BIỆT: Với người bị bệnh chuyển hóa, việc tăng/giảm cân không chỉ là calo. Hãy đưa ra lời khuyên về chỉ số GI, thời điểm ăn và các loại thực phẩm hỗ trợ chuyển hóa.
3. TỔNG QUAN CALO & DINH DƯỠNG: (Calories, Protein, Carbs, Fat) từ bữa ăn hiện tại.
4. SO SÁNH VỚI MỤC TIÊU (TDEE) & CẢNH BÁO.
5. ĐỀ XUẤT THỰC ĐƠN & BÀI TẬP PHỤC HỒI CHUYỂN HÓA.

ĐỊNH DẠNG PHẢN HỒI (Rất quan trọng để hiển thị UI):
Hãy trình bày theo định dạng văn bản rõ ràng, sử dụng các dấu mốc sau để hệ thống tách dữ liệu:
[NUTRITION_START]
Calories: [số] kcal
Protein: [số] g
Carbs: [số] g
Fat: [số] g
[NUTRITION_END]

[ANALYSIS_START]
(Phân tích trạng thái cơ thể, bữa ăn và so sánh TDEE ở đây)
[ANALYSIS_END]

[RECOMMEND_START]
(Đề xuất thực đơn để đạt mục tiêu Calo ở đây)
[RECOMMEND_END]

[EXERCISE_START]
(Chương trình tập luyện ở đây)
[EXERCISE_END]

DỮ LIỆU NGƯỜI DÙNG NHẬP:
{user_input}

LƯU Ý: Phải luôn dựa vào thông số BMI và TDEE của người dùng để đưa ra lời khuyên thực tế nhất. Trả về bằng tiếng Việt.
"""
