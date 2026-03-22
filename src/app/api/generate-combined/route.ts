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
    const { mode } = body;

    if (mode === "workout_first") {
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
      });
      if (!workoutRes.ok) throw new Error("Workout generation failed: " + workoutRes.status);
      const workoutRaw = await workoutRes.text();
      let workoutData;
      try {
        const parsed = JSON.parse(workoutRaw);
        workoutData = Array.isArray(parsed) ? parsed[0] : parsed;
      } catch { workoutData = { success: false }; }

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
          workout_context: body.days_per_week + " days/week " + body.goals + " workout, " + body.session_minutes + "min sessions",
        }),
      });
      if (!dietRes.ok) throw new Error("Diet generation failed: " + dietRes.status);
      const dietRaw = await dietRes.text();
      let dietData;
      try {
        const parsed = JSON.parse(dietRaw);
        dietData = Array.isArray(parsed) ? parsed[0] : parsed;
      } catch { dietData = { success: false }; }

      return NextResponse.json({
        success: true,
        workout: workoutData,
        diet: { ...dietData, source: "auto_from_workout" },
      });

    } else if (mode === "diet_first") {
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
        }),
      });
      if (!dietRes.ok) throw new Error("Diet generation failed: " + dietRes.status);
      const dietRaw = await dietRes.text();
      let dietData;
      try {
        const parsed = JSON.parse(dietRaw);
        dietData = Array.isArray(parsed) ? parsed[0] : parsed;
      } catch { dietData = { success: false }; }

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
          diet_context: body.goals + " diet targeting " + body.goal_weight_kg + "kg",
        }),
      });
      if (!workoutRes.ok) throw new Error("Workout generation failed: " + workoutRes.status);
      const workoutRaw = await workoutRes.text();
      let workoutData;
      try {
        const parsed = JSON.parse(workoutRaw);
        workoutData = Array.isArray(parsed) ? parsed[0] : parsed;
      } catch { workoutData = { success: false }; }

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
