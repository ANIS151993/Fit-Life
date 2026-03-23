"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getLatestDietPlan, saveLinkedPlans } from "@/lib/firestore";
import { DietPlan, DietPlanDay } from "@/types";
import toast from "react-hot-toast";
import { BookOpen, ChevronDown, ChevronUp, Plus, Loader2, Zap, Clock, Salad, Sparkles, Droplets, Leaf, ShieldAlert } from "lucide-react";

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

  const generateFast = useCallback(async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const dietJobId = crypto.randomUUID();
      setGenStep("Generating diet plan with Gemini... (~30s)");
      toast.loading("Quick diet plan generating...", { id: "gen" });
      await fetch(N8N_DIET_FAST, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...buildPayload(), jobId: dietJobId }) });
      const dietData = await new Promise<Record<string, unknown>>((resolve, reject) => {
        let att = 0;
        const iv = setInterval(async () => {
          att++;
          if (att > 60) { clearInterval(iv); reject(new Error("Diet plan timed out")); return; }
          try {
            const r = await fetch(`${N8N_POLL}?jobId=${encodeURIComponent(dietJobId)}`);
            const d = await r.json();
            if (d.status === "done") { clearInterval(iv); resolve(d); }
            else setGenStep(`Gemini generating diet... (${att * 3}s)`);
          } catch { /* ignore */ }
        }, 3000);
        pollRef.current = iv;
      });
      if (!dietData.success) throw new Error((dietData.error as string) || "Diet generation failed");

      setGenStep("Generating matching workout...");
      const wJobId = crypto.randomUUID();
      await fetch(N8N_WORKOUT_FAST, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...workoutPayload(), jobId: wJobId }) });
      const wData = await new Promise<Record<string, unknown>>((resolve, reject) => {
        let att = 0;
        const iv = setInterval(async () => {
          att++;
          if (att > 60) { clearInterval(iv); reject(new Error("Workout timed out")); return; }
          try {
            const r = await fetch(`${N8N_POLL}?jobId=${encodeURIComponent(wJobId)}`);
            const d = await r.json();
            if (d.status === "done") { clearInterval(iv); resolve(d); }
            else setGenStep(`Gemini generating workout... (${att * 3}s)`);
          } catch { /* ignore */ }
        }, 3000);
        pollRef.current = iv;
      });

      await savePlans(dietData, wData.success ? wData : null);
      toast.success("Diet + workout plan created!", { id: "gen" });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed", { id: "gen" }); }
    finally { setGenerating(false); setGenStep(""); }
  }, [user, buildPayload, workoutPayload, savePlans]);

  const generateFree = useCallback(async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const dietJobId = crypto.randomUUID();
      setGenStep("Generating diet plan with local AI... (3-5 min)");
      toast.loading("Free diet plan generating (3-5 min)...", { id: "gen" });
      await fetch(N8N_DIET_FREE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...buildPayload(), jobId: dietJobId }) });
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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="glass rounded-2xl p-8 flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-3 border-brand-200 border-t-brand-500 animate-spin" />
        <p className="text-sm text-gray-500">Loading your diet plan...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between anim-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diet Plan</h1>
          <p className="text-sm text-gray-500 mt-1">AI-powered personalized nutrition</p>
        </div>
        {plan && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-brand-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]">
            <Plus className="w-4 h-4" /> New Plan
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass rounded-2xl p-6 space-y-5 anim-fade-up">
          <div>
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-500" />
              Create Diet Plan
            </h2>
            <p className="text-sm text-gray-500 mt-1">A matching workout plan will be auto-generated</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Name", value: name, onChange: (v: string) => setName(v), type: "text" },
              { label: "Goals", value: goals, onChange: (v: string) => setGoals(v), type: "text" },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{f.label}</label>
                <input value={f.value} onChange={(e) => f.onChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Age</label>
              <input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80">
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Height (cm)</label>
              <input type="number" value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Current Weight (kg)</label>
              <input type="number" value={currentWeight} onChange={(e) => setCurrentWeight(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Goal Weight (kg)</label>
              <input type="number" value={goalWeight} onChange={(e) => setGoalWeight(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Activity Level</label>
              <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80">
                <option value="sedentary">Sedentary</option><option value="light">Light</option><option value="moderate">Moderate</option><option value="active">Active</option><option value="very_active">Very Active</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Restrictions</label>
              <input value={restrictions} onChange={(e) => setRestrictions(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80" placeholder="e.g. vegetarian, halal" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fitness Level</label>
              <select value={fitnessLevel} onChange={(e) => setFitnessLevel(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80">
                <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
          {!generating ? (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={generateFast}
                className="relative py-5 bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 text-white rounded-2xl font-semibold transition-all hover:shadow-xl hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98] overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite]" />
                <div className="relative flex flex-col items-center gap-1.5">
                  <Zap className="w-7 h-7" /><span className="text-base">Quick Plan</span><span className="text-xs opacity-75">Gemini AI ~ 30s</span>
                </div>
              </button>
              <button onClick={generateFree}
                className="relative py-5 bg-gradient-to-br from-brand-600 via-emerald-600 to-teal-600 text-white rounded-2xl font-semibold transition-all hover:shadow-xl hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite]" />
                <div className="relative flex flex-col items-center gap-1.5">
                  <Clock className="w-7 h-7" /><span className="text-base">Free Plan</span><span className="text-xs opacity-75">Local AI ~ 5-10 min</span>
                </div>
              </button>
            </div>
          ) : (
            <div className="py-5 glass rounded-2xl flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-3 border-brand-200 border-t-brand-500 animate-spin" />
              <span className="text-gray-700 font-semibold">{genStep}</span>
              <div className="flex gap-1">
                {[0,1,2,3,4].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plan Display */}
      {plan && (
        <div className="space-y-4">
          {plan.source === "auto_from_workout" && (
            <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50/80 px-4 py-2.5 rounded-xl border border-blue-100 anim-fade-up">
              <Sparkles className="w-4 h-4" /> Auto-generated to match your workout plan
            </div>
          )}

          {/* Daily Targets */}
          {plan.daily_targets && (
            <div className="glass rounded-2xl p-6 anim-fade-up anim-d1">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Salad className="w-5 h-5 text-brand-500" />
                Daily Targets
              </h2>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { l: "Calories", v: plan.daily_targets.calories, u: "kcal", from: "from-emerald-400", to: "to-green-500" },
                  { l: "Protein", v: plan.daily_targets.protein_g, u: "g", from: "from-blue-400", to: "to-blue-500" },
                  { l: "Carbs", v: plan.daily_targets.carbs_g, u: "g", from: "from-amber-400", to: "to-orange-500" },
                  { l: "Fat", v: plan.daily_targets.fat_g, u: "g", from: "from-rose-400", to: "to-red-500" },
                  { l: "Fiber", v: plan.daily_targets.fiber_g, u: "g", from: "from-violet-400", to: "to-purple-500" },
                  { l: "Water", v: plan.daily_targets.water_ml, u: "ml", from: "from-cyan-400", to: "to-blue-400" },
                ].map(t => (
                  <div key={t.l} className="text-center p-3 rounded-xl bg-gray-50/80 hover:bg-white transition-colors">
                    <p className={`text-lg font-extrabold bg-gradient-to-br ${t.from} ${t.to} bg-clip-text text-transparent`}>{t.v}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t.u}</p>
                    <p className="text-xs text-gray-500 font-medium">{t.l}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Day Cards */}
          {plan.days && plan.days.map((day: DietPlanDay, idx: number) => (
            <div key={day.day} className={`glass rounded-2xl overflow-hidden anim-fade-up`} style={{ animationDelay: `${(idx + 2) * 80}ms` }}>
              <button onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/40 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-100 to-emerald-100 text-brand-700 flex items-center justify-center">
                    <span className="font-bold text-sm">{day.day_name?.slice(0, 3) || "D" + day.day}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Day {day.day} &mdash; {day.day_name}</p>
                    <p className="text-sm text-gray-500">{day.day_total_calories} kcal total</p>
                  </div>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${expandedDay === day.day ? "bg-brand-100 rotate-180" : "bg-gray-100"}`}>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </div>
              </button>
              {expandedDay === day.day && day.meals && (
                <div className="px-6 pb-5 space-y-3">
                  {(["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner"] as const).map(mk => {
                    const meal = day.meals[mk];
                    if (!meal) return null;
                    return (
                      <div key={mk} className="p-4 rounded-xl bg-white/60 hover:bg-white transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-gray-900">{meal.name || mk.replace("_", " ")}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{meal.time}</span>
                            <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{meal.total_calories} kcal</span>
                          </div>
                        </div>
                        {meal.items && meal.items.map((item: { food: string; quantity: string; calories: number }, i: number) => (
                          <p key={i} className="text-sm text-gray-600 py-0.5 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-300 flex-shrink-0" />
                            {item.food} <span className="text-gray-400">({item.quantity})</span>
                            <span className="text-gray-400 ml-auto">{item.calories} kcal</span>
                          </p>
                        ))}
                        {meal.recipe_hint && <p className="text-xs text-brand-600 mt-2 italic">{meal.recipe_hint}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Notes & Recommendations */}
          {plan.nutritionist_notes && (
            <div className="rounded-2xl p-5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 anim-fade-up">
              <p className="font-bold text-green-900 mb-2 flex items-center gap-2"><Leaf className="w-4 h-4" /> Nutritionist Notes</p>
              <p className="text-sm text-green-800 leading-relaxed">{plan.nutritionist_notes}</p>
            </div>
          )}
          {plan.foods_to_emphasize && plan.foods_to_emphasize.length > 0 && (
            <div className="glass rounded-2xl p-5 anim-fade-up">
              <p className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Salad className="w-4 h-4 text-brand-500" /> Foods to Emphasize</p>
              <div className="flex flex-wrap gap-2">
                {plan.foods_to_emphasize.map((f: string, i: number) => (
                  <span key={i} className="px-3 py-1.5 bg-brand-50 text-brand-700 rounded-full text-sm font-medium border border-brand-100">{f}</span>
                ))}
              </div>
            </div>
          )}
          {plan.foods_to_avoid && plan.foods_to_avoid.length > 0 && (
            <div className="glass rounded-2xl p-5 anim-fade-up">
              <p className="font-bold text-gray-900 mb-3 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-red-500" /> Foods to Avoid</p>
              <div className="flex flex-wrap gap-2">
                {plan.foods_to_avoid.map((f: string, i: number) => (
                  <span key={i} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm font-medium border border-red-100">{f}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty states */}
      {plan && (!plan.days || plan.days.length === 0) && (
        <div className="rounded-2xl p-6 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 anim-fade-up">
          <p className="font-semibold text-yellow-800">Diet plan generated but meal details could not be fully structured.</p>
          <p className="text-sm text-yellow-700 mt-1">Try the Quick Plan (Gemini) for a detailed 7-day meal plan.</p>
          {plan.nutritionist_notes && <p className="text-sm text-yellow-700 mt-3 whitespace-pre-line">{plan.nutritionist_notes}</p>}
          <button onClick={() => setShowForm(true)}
            className="mt-4 px-5 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-brand-500/25 transition-all">
            Generate New Plan
          </button>
        </div>
      )}
      {!plan && !showForm && (
        <div className="text-center py-16 anim-fade-up">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-100 to-emerald-100 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-10 h-10 text-brand-500" />
          </div>
          <p className="text-gray-500 text-lg">No diet plan yet</p>
          <p className="text-sm text-gray-400 mt-1">Let our AI nutritionist create one for you</p>
          <button onClick={() => setShowForm(true)}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-brand-500/25 transition-all hover:scale-[1.02]">
            Create Your First Plan
          </button>
        </div>
      )}
    </div>
  );
}
