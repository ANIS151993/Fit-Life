const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET!;

const n8nHeaders = {
  "Content-Type": "application/json",
  "x-webhook-secret": WEBHOOK_SECRET,
};

export async function analyzeFoodImage(payload: {
  imageBase64: string;
  userId: string;
  mealType: string;
  dietPlanId?: string;
}) {
  const res = await fetch(process.env.N8N_FOOD_ANALYZE_WEBHOOK!, {
    method: "POST",
    headers: n8nHeaders,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Food analysis failed: ${res.status}`);
  return res.json();
}

export async function generateDietPlan(payload: {
  userId: string;
  name: string;
  age: number;
  gender: string;
  height_cm: number;
  current_weight_kg: number;
  goal_weight_kg: number;
  activity_level: string;
  restrictions: string;
  goals: string;
  medical_notes?: string;
}) {
  const res = await fetch(process.env.N8N_DIET_PLAN_WEBHOOK!, {
    method: "POST",
    headers: n8nHeaders,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Diet plan failed: ${res.status}`);
  return res.json();
}

export async function generateWorkoutPlan(payload: {
  userId: string;
  goals: string;
  fitness_level: string;
  equipment: string;
  days_per_week: number;
  session_minutes: number;
  age: number;
  injuries?: string;
}) {
  const res = await fetch(process.env.N8N_WORKOUT_WEBHOOK!, {
    method: "POST",
    headers: n8nHeaders,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Workout plan failed: ${res.status}`);
  return res.json();
}
