class FitnessService:
    @staticmethod
    def calculate_metrics(weight_kg, height_cm, age, gender, activity_level, body_type="", health_condition=""):
        # BMI
        height_m = height_cm / 100
        bmi = round(weight_kg / (height_m ** 2), 1)
        
        # BMR (Mifflin-St Jeor)
        if gender.lower() == 'male':
            bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
        else:
            bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
            
        # TDEE
        tdee = round(bmr * activity_level)
        
        # Body Status & Warning
        status = ""
        warning = ""
        if bmi < 18.5:
            status = "Thiếu cân (Gầy)"
            warning = "Cảnh báo: Bạn đang ở mức thiếu cân, cần bổ sung dinh dưỡng để tăng cân an toàn."
        elif 18.5 <= bmi < 25:
            status = "Bình thường (Khỏe mạnh)"
            warning = "Tuyệt vời: Cơ thể bạn đang ở trạng thái cân bằng."
        elif 25 <= bmi < 30:
            status = "Thừa cân"
            warning = "Lưu ý: Bạn đang ở mức thừa cân, nên điều chỉnh chế độ ăn và tập luyện."
        else:
            status = "Béo phì"
            warning = "Nguy hiểm: Chỉ số BMI quá cao, có nguy cơ ảnh hưởng đến sức khỏe tim mạch."

        return {
            "bmi": bmi,
            "bmr": round(bmr),
            "tdee": tdee,
            "status": status,
            "warning": warning,
            "target_gain": tdee + 500,
            "target_loss": tdee - 500,
            "body_type": body_type,
            "health_condition": health_condition
        }
