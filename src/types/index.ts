export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  age: number;
  gender: "male" | "female" | "other";
  height_cm: number;
  current_weight_kg: number;
  goal_weight_kg: number;
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
  dietary_restrictions: string[];
  goals: string[];
  medical_notes?: string;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface NutritionTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface FoodItem {
  name: string;
  quantity_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
}

export interface VitaminsMinerals {
  vitamin_a_mcg: number;
  vitamin_b12_mcg: number;
  vitamin_c_mg: number;
  vitamin_d_mcg: number;
  vitamin_e_mg: number;
  vitamin_k_mcg: number;
  folate_mcg: number;
  iron_mg: number;
  calcium_mg: number;
  potassium_mg: number;
  sodium_mg: number;
  magnesium_mg: number;
  zinc_mg: number;
}

export interface FoodAnalysis {
  food_items: FoodItem[];
  totals: NutritionTotals;
  vitamins_minerals: VitaminsMinerals;
  meal_quality_score: number;
  glycemic_index: "low" | "medium" | "high";
  allergens: string[];
  health_notes: string;
}

export interface AIGuidance {
  message: string;
  color: "green" | "yellow" | "orange" | "red";
  score: number;
}

export interface PlanAlignment {
  matches_diet: boolean;
  matches_workout_nutrition: boolean;
  suggestions: string[];
  remaining_today: { calories: number; protein_g: number; carbs_g: number; fat_g: number; };
}

export interface FoodAnalysisResult {
  success: boolean;
  userId: string;
  mealType: string;
  analysis: FoodAnalysis;
  ai_guidance: AIGuidance;
  plan_alignment?: PlanAlignment;
  analyzed_at: string;
}

export interface FoodLog {
  id?: string;
  userId: string;
  date: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  food_name: string;
  image_url?: string;
  analysis: FoodAnalysis;
  ai_guidance: AIGuidance;
  plan_alignment?: PlanAlignment;
  logged_at: string;
}

export interface DietMeal {
  name: string;
  time: string;
  items: { food: string; quantity: string; calories: number }[];
  total_calories: number;
  prep_time_min: number;
  recipe_hint: string;
}

export interface DietPlanDay {
  day: number;
  day_name: string;
  meals: {
    breakfast: DietMeal;
    morning_snack?: DietMeal;
    lunch: DietMeal;
    afternoon_snack?: DietMeal;
    dinner: DietMeal;
  };
  day_total_calories: number;
}

export interface DietPlan {
  id?: string;
  userId: string;
  bmi: number;
  bmr: number;
  tdee: number;
  plan_type: string;
  daily_targets: NutritionTotals & { water_ml: number };
  days: DietPlanDay[];
  nutritionist_notes: string;
  supplements_recommended: string[];
  foods_to_avoid: string[];
  foods_to_emphasize: string[];
  linked_workout_plan_id?: string;
  source?: "standalone" | "auto_from_workout" | "modified";
  generated_at: string;
}

export interface WorkoutExercise {
  name: string;
  muscle_group: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  form_tips: string;
  calories_burned_approx: number;
}

export interface WorkoutDay {
  day: number;
  day_name: string;
  workout_type: string;
  is_rest_day: boolean;
  duration_min: number;
  warmup: { exercise: string; duration_sec: number }[];
  exercises: WorkoutExercise[];
  cooldown: { stretch: string; duration_sec: number }[];
  day_notes: string;
}

export interface WorkoutPlan {
  id?: string;
  userId: string;
  plan_name: string;
  weekly_schedule: WorkoutDay[];
  trainer_notes: string;
  nutrition_timing: string;
  recovery_tips: string;
  progression_plan: string;
  linked_diet_plan_id?: string;
  source?: "standalone" | "auto_from_diet" | "modified";
  generated_at: string;
}
