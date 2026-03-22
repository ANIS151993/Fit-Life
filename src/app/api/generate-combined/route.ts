export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";

const WEBHOOK_SECRET = "fitlife_webhook_secret_2024";
const DIET_WEBHOOK = "https://n8n.marcbd.site/webhook/fitlife/generate-diet";
const WORKOUT_WEBHOOK = "https://n8n.marcbd.site/webhook/fitlife/generate-workout";

const headers = {
  "Content-Type": "application/json",
  "x-webhook-secret": WEBHOOK_SECRET,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode } = body; // "workout_first" or "diet_first"

    if (mode === "workout_first") {
      // 1. Generate workout plan
      const workoutRes = await fetch(WORKOUT_WEBHOOK, {
        method: "POST",
        headers,
        body: JSON.stringify({
          userId: body.userId,
          goals: body.goals,
          fitness_level: body.fitness_level,
          equipment: body.equipment,
          days_per_week: body.days_per_week,
          session_minutes: body.session_minutes,
          age: body.age,
          injuries: body.injuries || "",
        }),
        signal: AbortSignal.timeout(120000),
      });
      if (!workoutRes.ok) throw new Error(`Workout generation failed: ${workoutRes.status}`);
      const workoutData = await workoutRes.json();

      // 2. Auto-generate matching diet plan based on workout
      const dietRes = await fetch(DIET_WEBHOOK, {
        method: "POST",
        headers,
        body: JSON.stringify({
          userId: body.userId,
          name: body.name,
          age: body.age,
          gender: body.gender,
          height_cm: body.height_cm,
          current_weight_kg: body.current_weight_kg,
          goal_weight_kg: body.goal_weight_kg,
          activity_level: body.activity_level,
          restrictions: body.restrictions || "none",
          goals: body.goals,
          medical_notes: body.medical_notes || "",
          workout_context: `User has a ${body.days_per_week}-day/week workout plan focused on ${body.goals}. Diet should support muscle recovery and energy for ${body.session_minutes}-minute sessions. Fitness level: ${body.fitness_level}.`,
        }),
        signal: AbortSignal.timeout(120000),
      });
      if (!dietRes.ok) throw new Error(`Diet generation failed: ${dietRes.status}`);
      const dietData = await dietRes.json();

      return NextResponse.json({
        success: true,
        workout: workoutData,
        diet: { ...dietData, source: "auto_from_workout" },
      });

    } else if (mode === "diet_first") {
      // 1. Generate diet plan
      const dietRes = await fetch(DIET_WEBHOOK, {
        method: "POST",
        headers,
        body: JSON.stringify({
          userId: body.userId,
          name: body.name,
          age: body.age,
          gender: body.gender,
          height_cm: body.height_cm,
          current_weight_kg: body.current_weight_kg,
          goal_weight_kg: body.goal_weight_kg,
          activity_level: body.activity_level,
          restrictions: body.restrictions || "none",
          goals: body.goals,
          medical_notes: body.medical_notes || "",
        }),
        signal: AbortSignal.timeout(120000),
      });
      if (!dietRes.ok) throw new Error(`Diet generation failed: ${dietRes.status}`);
      const dietData = await dietRes.json();

      // 2. Auto-generate matching workout
      const workoutRes = await fetch(WORKOUT_WEBHOOK, {
        method: "POST",
        headers,
        body: JSON.stringify({
          userId: body.userId,
          goals: body.goals,
          fitness_level: body.fitness_level || "beginner",
          equipment: body.equipment || "minimal",
          days_per_week: body.days_per_week || 4,
          session_minutes: body.session_minutes || 45,
          age: body.age,
          injuries: body.injuries || "",
          diet_context: `User is on a ${body.goals} diet plan targeting ${body.goal_weight_kg}kg. Activity level: ${body.activity_level}. Workout should complement the nutrition plan.`,
        }),
        signal: AbortSignal.timeout(120000),
      });
      if (!workoutRes.ok) throw new Error(`Workout generation failed: ${workoutRes.status}`);
      const workoutData = await workoutRes.json();

      return NextResponse.json({
        success: true,
        diet: dietData,
        workout: { ...workoutData, source: "auto_from_diet" },
      });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
