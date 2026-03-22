"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getLatestDietPlan, saveLinkedPlans } from "@/lib/firestore";
import { DietPlan, DietPlanDay } from "@/types";
import toast from "react-hot-toast";
import { BookOpen, ChevronDown, ChevronUp, Plus, Loader2, Zap, Clock } from "lucide-react";

const N8N_BASE = "https://n8n.marcbd.site/webhook";
const N8N_DIET_FAST = `${N8N_BASE}/fitlife/generate-diet-fast`;
const N8N_DIET_FREE = `${N8N_BASE}/fitlife/generate-diet-free`;
const N8N_WORKOUT_FAST = `${N8N_BASE}/fitlife/generate-workout-fast`;
const N8N_WORKOUT_FREE = `${N8N_BASE}/fitlife/generate-workout-free`;
const N8N_POLL = `${N8N_BASE}/fitlife/food-result`;

export default function DietPlanPage() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState("");
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [name, setName] = useState("");
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState("male");
  const [heightCm, setHeightCm] = useState(175);
  const [currentWeight, setCurrentWeight] = useState(80);
  const [goalWeight, setGoalWeight] = useState(72);
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [goals, setGoals] = useState("weight loss and balanced nutrition");
  const [restrictions, setRestrictions] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState("beginner");

  useEffect(() => {
    if (!user) return;
    setName(user.displayName || "");
    getLatestDietPlan(user.uid).then((p) => { setPlan(p); setLoading(false); if (!p) setShowForm(true); });
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [user]);

  const buildPayload = useCallback(() => ({
    userId: user?.uid, name: name || user?.displayName || "User",
    age, gender, height_cm: heightCm, current_weight_kg: currentWeight,
    goal_weight_kg: goalWeight, activity_level: activityLevel, goals,
    restrictions: restrictions || "none",
  }), [user, name, age, gender, heightCm, currentWeight, goalWeight, activityLevel, goals, restrictions]);

  const workoutPayload = useCallback(() => ({
    userId: user?.uid, goals, fitness_level: fitnessLevel,
    equipment: "minimal", days_per_week: 4, session_minutes: 45, age,
  }), [user, goals, fitnessLevel, age]);

  const savePlans = useCallback(async (dietData: Record<string, unknown>, workoutData: Record<string, unknown> | null) => {
    if (!user) return;
    const dietPlan: DietPlan = {
      userId: user.uid, bmi: (dietData.bmi as number) || 0, bmr: (dietData.bmr as number) || 0, tdee: (dietData.tdee as number) || 0,
      plan_type: (dietData.plan_type as string) || "balanced",
      daily_targets: (dietData.daily_targets as DietPlan["daily_targets"]) || { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 65, fiber_g: 30, water_ml: 2500 },
      days: (dietData.days as DietPlanDay[]) || [], nutritionist_notes: (dietData.nutritionist_notes as string) || "",
      supplements_recommended: (dietData.supplements_recommended as string[]) || [],
      foods_to_avoid: (dietData.foods_to_avoid as string[]) || [],
      foods_to_emphasize: (dietData.foods_to_emphasize as string[]) || [],
      source: "standalone", generated_at: new Date().toISOString(),
    };
    const wp = workoutData ? {
      userId: user.uid, plan_name: (workoutData.plan_name as string) || "Auto Workout",
      weekly_schedule: (workoutData.weekly_schedule as []) || [], trainer_notes: (workoutData.trainer_notes as string) || "",
      nutrition_timing: (workoutData.nutrition_timing as string) || "", recovery_tips: (workoutData.recovery_tips as string) || "",
      progression_plan: (workoutData.progression_plan as string) || "", source: "auto_from_diet" as const, generated_at: new Date().toISOString(),
    } : null;
    if (wp) await saveLinkedPlans(user.uid, wp, dietPlan);
    setPlan(dietPlan);
    setShowForm(false);
  }, [user]);

  // Gemini (Fast) - synchronous
  const generateFast = useCallback(async () => {
    if (!user) return;
    setGenerating(true);
    try {
      setGenStep("Generating diet plan with Gemini...");
      toast.loading("Quick diet plan generating...", { id: "gen" });
      const dietRes = await fetch(N8N_DIET_FAST, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload()) });
      const dietRaw = await dietRes.text();
      let dietData: Record<string, unknown>;
      try { const p = JSON.parse(dietRaw); dietData = Array.isArray(p) ? p[0] : p; } catch { throw new Error("Failed to parse diet response"); }
      if (!dietData.success) throw new Error((dietData.error as string) || "Diet generation failed");

      setGenStep("Generating matching workout...");
      const wRes = await fetch(N8N_WORKOUT_FAST, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(workoutPayload()) });
      const wRaw = await wRes.text();
      let wData: Record<string, unknown>;
      try { const p = JSON.parse(wRaw); wData = Array.isArray(p) ? p[0] : p; } catch { wData = {}; }

      await savePlans(dietData, wData.success ? wData : null);
      toast.success("Diet + workout plan created!", { id: "gen" });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed", { id: "gen" }); }
    finally { setGenerating(false); setGenStep(""); }
  }, [user, buildPayload, workoutPayload, savePlans]);

  // Ollama (Free) - async with polling
  const generateFree = useCallback(async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const dietJobId = crypto.randomUUID();
      setGenStep("Generating diet plan with local AI... (3-5 min)");
      toast.loading("Free diet plan generating (3-5 min)...", { id: "gen" });

      await fetch(N8N_DIET_FREE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...buildPayload(), jobId: dietJobId }) });

      // Poll for diet result
      const dietData = await new Promise<Record<string, unknown>>((resolve, reject) => {
        let att = 0;
        const iv = setInterval(async () => {
          att++;
          if (att > 90) { clearInterval(iv); reject(new Error("Diet plan timed out")); return; }
          try {
            const r = await fetch(`${N8N_POLL}?jobId=${encodeURIComponent(dietJobId)}`);
            const d = await r.json();
            if (d.status === "done") { clearInterval(iv); resolve(d); }
            else setGenStep(`Local AI generating diet... (${att * 5}s)`);
          } catch { /* ignore */ }
        }, 5000);
        pollRef.current = iv;
      });
      if (!dietData.success) throw new Error((dietData.error as string) || "Diet generation failed");

      // Generate matching workout
      setGenStep("Generating matching workout... (3-5 min)");
      const wJobId = crypto.randomUUID();
      await fetch(N8N_WORKOUT_FREE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...workoutPayload(), jobId: wJobId }) });

      const wData = await new Promise<Record<string, unknown>>((resolve, reject) => {
        let att = 0;
        const iv = setInterval(async () => {
          att++;
          if (att > 90) { clearInterval(iv); reject(new Error("Workout timed out")); return; }
          try {
            const r = await fetch(`${N8N_POLL}?jobId=${encodeURIComponent(wJobId)}`);
            const d = await r.json();
            if (d.status === "done") { clearInterval(iv); resolve(d); }
            else setGenStep(`Local AI generating workout... (${att * 5}s)`);
          } catch { /* ignore */ }
        }, 5000);
        pollRef.current = iv;
      });

      await savePlans(dietData, wData.success ? wData : null);
      toast.success("Diet + workout plan created!", { id: "gen" });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed", { id: "gen" }); }
    finally { setGenerating(false); setGenStep(""); }
  }, [user, buildPayload, workoutPayload, savePlans]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Diet Plan</h1>
        {plan && <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700"><Plus className="w-4 h-4" /> New Plan</button>}
      </div>
      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-semibold text-gray-900 text-lg">Create Diet Plan</h2>
          <p className="text-sm text-gray-500">A matching workout plan will be auto-generated.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Goals</label><input value={goals} onChange={(e) => setGoals(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Age</label><input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Gender</label><select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none"><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label><input type="number" value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Weight (kg)</label><input type="number" value={currentWeight} onChange={(e) => setCurrentWeight(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Goal Weight (kg)</label><input type="number" value={goalWeight} onChange={(e) => setGoalWeight(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Activity Level</label><select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none"><option value="sedentary">Sedentary</option><option value="light">Light</option><option value="moderate">Moderate</option><option value="active">Active</option><option value="very_active">Very Active</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Restrictions</label><input value={restrictions} onChange={(e) => setRestrictions(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" placeholder="e.g. vegetarian, halal" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Fitness Level</label><select value={fitnessLevel} onChange={(e) => setFitnessLevel(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
          </div>
          {!generating && (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={generateFast} className="py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex flex-col items-center gap-1 shadow-lg">
                <Zap className="w-6 h-6" /><span>Quick Plan</span><span className="text-xs opacity-80">Gemini AI ~ 30s</span>
              </button>
              <button onClick={generateFree} className="py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all flex flex-col items-center gap-1 shadow-lg">
                <Clock className="w-6 h-6" /><span>Free Plan</span><span className="text-xs opacity-80">Local AI ~ 5-10 min</span>
              </button>
            </div>
          )}
          {generating && (
            <div className="py-4 bg-gray-100 rounded-2xl flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-green-600" />
              <span className="text-gray-700 font-medium">{genStep}</span>
            </div>
          )}
        </div>
      )}
      {plan && (
        <div className="space-y-3">
          {plan.source === "auto_from_workout" && <p className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-xl">Auto-generated to match your workout plan</p>}
          {plan.daily_targets && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-3">Daily Targets</h2>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {[{l:"Calories",v:plan.daily_targets.calories,u:"kcal",c:"text-green-600"},{l:"Protein",v:plan.daily_targets.protein_g,u:"g",c:"text-blue-600"},{l:"Carbs",v:plan.daily_targets.carbs_g,u:"g",c:"text-orange-500"},{l:"Fat",v:plan.daily_targets.fat_g,u:"g",c:"text-yellow-500"},{l:"Fiber",v:plan.daily_targets.fiber_g,u:"g",c:"text-purple-500"},{l:"Water",v:plan.daily_targets.water_ml,u:"ml",c:"text-cyan-500"}].map(t=>(
                  <div key={t.l} className="text-center p-2 bg-gray-50 rounded-xl"><p className={"text-lg font-bold "+t.c}>{t.v}</p><p className="text-xs text-gray-400">{t.u} {t.l}</p></div>
                ))}
              </div>
            </div>
          )}
          {plan.days && plan.days.map((day: DietPlanDay) => (
            <div key={day.day} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)} className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50">
                <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center"><span className="font-bold text-sm">{day.day_name?.slice(0,3)||"D"+day.day}</span></div><div><p className="font-medium text-gray-900">Day {day.day} - {day.day_name}</p><p className="text-xs text-gray-400">{day.day_total_calories} kcal</p></div></div>
                {expandedDay === day.day ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>
              {expandedDay === day.day && day.meals && (
                <div className="px-6 pb-4 space-y-3">
                  {(["breakfast","lunch","dinner"] as const).map(mk => { const meal = day.meals[mk]; if (!meal) return null; return (
                    <div key={mk} className="p-3 bg-gray-50 rounded-xl"><div className="flex items-center justify-between mb-2"><p className="font-medium text-gray-900">{meal.name||mk}</p><span className="text-xs text-gray-400">{meal.time} | {meal.total_calories} kcal</span></div>
                    {meal.items && meal.items.map((item:{food:string;quantity:string;calories:number},i:number)=><p key={i} className="text-sm text-gray-600 ml-2">- {item.food} ({item.quantity}) - {item.calories} kcal</p>)}
                    {meal.recipe_hint && <p className="text-xs text-green-600 mt-1">{meal.recipe_hint}</p>}</div>
                  );})}
                </div>
              )}
            </div>
          ))}
          {plan.nutritionist_notes && <div className="bg-green-50 rounded-2xl p-4 border border-green-100"><p className="text-sm font-semibold text-green-800 mb-1">Nutritionist Notes</p><p className="text-sm text-green-700">{plan.nutritionist_notes}</p></div>}
          {plan.foods_to_emphasize && plan.foods_to_emphasize.length > 0 && <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"><p className="text-sm font-semibold text-gray-800 mb-2">Foods to Emphasize</p><div className="flex flex-wrap gap-2">{plan.foods_to_emphasize.map((f:string,i:number)=><span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">{f}</span>)}</div></div>}
          {plan.foods_to_avoid && plan.foods_to_avoid.length > 0 && <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"><p className="text-sm font-semibold text-gray-800 mb-2">Foods to Avoid</p><div className="flex flex-wrap gap-2">{plan.foods_to_avoid.map((f:string,i:number)=><span key={i} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs">{f}</span>)}</div></div>}
        </div>
      )}
      {!plan && !showForm && <div className="text-center py-12"><BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" /><p className="text-gray-500">No diet plan yet</p><button onClick={() => setShowForm(true)} className="mt-4 px-6 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">Create Your First Plan</button></div>}
    </div>
  );
}
