def get_fitness_analyst_prompt(user_input):
    """
    Trả về prompt yêu cầu kết quả dạng JSON để vẽ biểu đồ.
    """
    return f"""
Hãy đóng vai một Chuyên gia Dinh dưỡng và Fitness. Phân tích dữ liệu người dùng và trả về DUY NHẤT một mã JSON chuẩn (không có văn bản thừa) theo cấu trúc sau:

DỮ LIỆU NGƯỜI DÙNG:
{user_input}

CẤU TRÚC JSON YÊU CẦU:
{{
  "nutrition_summary": {{
    "calories": [số nguyên],
    "protein": [số nguyên],
    "carbs": [số nguyên],
    "fats": [số nguyên]
  }},
  "meal_analysis": "[chuỗi văn bản phân tích]",
  "recommend_food": {{
    "morning": "[món ăn + lượng]",
    "lunch": "[món ăn + lượng]",
    "evening": "[món ăn + lượng]",
    "snack": "[món ăn + lượng]"
  }},
  "exercise_program": {{
    "target": "[mục tiêu]",
    "workout": "[danh sách bài tập]",
    "intensity": "[Thấp/Trung bình/Cao]",
    "duration": "[phút]"
  }}
}}

LƯU Ý: Trả về JSON bằng tiếng Việt. Không thêm bất kỳ lời giải thích nào ngoài khối JSON.
"""
