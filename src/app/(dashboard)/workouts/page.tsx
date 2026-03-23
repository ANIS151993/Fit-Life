"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getLatestWorkoutPlan, saveLinkedPlans } from "@/lib/firestore";
import { WorkoutPlan, WorkoutDay } from "@/types";
import toast from "react-hot-toast";
import { Dumbbell, Clock, Flame, ChevronDown, Plus, Loader2, Zap, Target, Trophy, Heart, Sparkles } from "lucide-react";

const N8N_BASE = "https://n8n.marcbd.site/webhook";
const N8N_WORKOUT_FAST = `${N8N_BASE}/fitlife/generate-workout-fast`;
const N8N_WORKOUT_FREE = `${N8N_BASE}/fitlife/generate-workout-free`;
const N8N_DIET_FAST = `${N8N_BASE}/fitlife/generate-diet-fast`;
const N8N_DIET_FREE = `${N8N_BASE}/fitlife/generate-diet-free`;
const N8N_POLL = `${N8N_BASE}/fitlife/food-result`;

export default function WorkoutsPage() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState("");
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [goals, setGoals] = useState("weight loss and muscle toning");
  const [fitnessLevel, setFitnessLevel] = useState("beginner");
  const [equipment, setEquipment] = useState("minimal");
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [sessionMinutes, setSessionMinutes] = useState(45);
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState("male");
  const [heightCm, setHeightCm] = useState(175);
  const [currentWeight, setCurrentWeight] = useState(80);
  const [goalWeight, setGoalWeight] = useState(72);
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [restrictions, setRestrictions] = useState("");
  const [injuries, setInjuries] = useState("");

  useEffect(() => {
    if (!user) return;
    getLatestWorkoutPlan(user.uid).then((p) => { setPlan(p); setLoading(false); if (!p) setShowForm(true); });
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [user]);

  const workoutPayload = useCallback(() => ({
    userId: user?.uid, goals, fitness_level: fitnessLevel,
    equipment, days_per_week: daysPerWeek, session_minutes: sessionMinutes,
    age, injuries: injuries || "none",
  }), [user, goals, fitnessLevel, equipment, daysPerWeek, sessionMinutes, age, injuries]);

  const dietPayload = useCallback(() => ({
    userId: user?.uid, name: user?.displayName || "User",
    age, gender, height_cm: heightCm, current_weight_kg: currentWeight,
    goal_weight_kg: goalWeight, activity_level: activityLevel,
    restrictions: restrictions || "none", goals,
  }), [user, age, gender, heightCm, currentWeight, goalWeight, activityLevel, restrictions, goals]);

  const savePlans = useCallback(async (workoutData: Record<string, unknown>, dietData: Record<string, unknown> | null) => {
    if (!user) return;
    const workoutPlan: WorkoutPlan = {
      userId: user.uid, plan_name: (workoutData.plan_name as string) || goals + " Plan",
      weekly_schedule: (workoutData.weekly_schedule as []) || [],
      trainer_notes: (workoutData.trainer_notes as string) || "",
      nutrition_timing: (workoutData.nutrition_timing as string) || "",
      recovery_tips: (workoutData.recovery_tips as string) || "",
      progression_plan: (workoutData.progression_plan as string) || "",
      source: "standalone", generated_at: new Date().toISOString(),
    };
    const dp = dietData && dietData.success ? {
      userId: user.uid, bmi: (dietData.bmi as number) || 0, bmr: (dietData.bmr as number) || 0, tdee: (dietData.tdee as number) || 0,
      plan_type: (dietData.plan_type as string) || "balanced",
      daily_targets: (dietData.daily_targets as { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number; water_ml: number }) || { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 65, fiber_g: 30, water_ml: 2500 },
      days: (dietData.days as []) || [], nutritionist_notes: (dietData.nutritionist_notes as string) || "",
      supplements_recommended: (dietData.supplements_recommended as string[]) || [],
      foods_to_avoid: (dietData.foods_to_avoid as string[]) || [],
      foods_to_emphasize: (dietData.foods_to_emphasize as string[]) || [],
      source: "auto_from_workout" as const, generated_at: new Date().toISOString(),
    } : null;
    if (dp) await saveLinkedPlans(user.uid, workoutPlan, dp);
    setPlan(workoutPlan);
    setShowForm(false);
  }, [user, goals]);

  const generateFast = useCallback(async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const wJobId = crypto.randomUUID();
      setGenStep("Generating workout with Gemini... (~30s)");
      toast.loading("Quick workout plan generating...", { id: "gen" });
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
      if (!wData.success) throw new Error((wData.error as string) || "Workout generation failed");

      setGenStep("Generating matching diet...");
      const dJobId = crypto.randomUUID();
      await fetch(N8N_DIET_FAST, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...dietPayload(), jobId: dJobId }) });
      const dData = await new Promise<Record<string, unknown>>((resolve, reject) => {
        let att = 0;
        const iv = setInterval(async () => {
          att++;
          if (att > 60) { clearInterval(iv); reject(new Error("Diet timed out")); return; }
          try {
            const r = await fetch(`${N8N_POLL}?jobId=${encodeURIComponent(dJobId)}`);
            const d = await r.json();
            if (d.status === "done") { clearInterval(iv); resolve(d); }
            else setGenStep(`Gemini generating diet... (${att * 3}s)`);
          } catch { /* ignore */ }
        }, 3000);
        pollRef.current = iv;
      });

      await savePlans(wData, dData.success ? dData : null);
      toast.success("Workout + diet plan created!", { id: "gen" });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed", { id: "gen" }); }
    finally { setGenerating(false); setGenStep(""); }
  }, [user, workoutPayload, dietPayload, savePlans]);

  const generateFree = useCallback(async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const wJobId = crypto.randomUUID();
      setGenStep("Generating workout with local AI... (3-5 min)");
      toast.loading("Free workout plan generating (3-5 min)...", { id: "gen" });
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
      if (!wData.success) throw new Error((wData.error as string) || "Workout generation failed");

      const dJobId = crypto.randomUUID();
      setGenStep("Generating matching diet... (3-5 min)");
      await fetch(N8N_DIET_FREE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...dietPayload(), jobId: dJobId }) });
      const dData = await new Promise<Record<string, unknown>>((resolve, reject) => {
        let att = 0;
        const iv = setInterval(async () => {
          att++;
          if (att > 90) { clearInterval(iv); reject(new Error("Diet timed out")); return; }
          try {
            const r = await fetch(`${N8N_POLL}?jobId=${encodeURIComponent(dJobId)}`);
            const d = await r.json();
            if (d.status === "done") { clearInterval(iv); resolve(d); }
            else setGenStep(`Local AI generating diet... (${att * 5}s)`);
          } catch { /* ignore */ }
        }, 5000);
        pollRef.current = iv;
      });

      await savePlans(wData, dData.success ? dData : null);
      toast.success("Workout + diet plan created!", { id: "gen" });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed", { id: "gen" }); }
    finally { setGenerating(false); setGenStep(""); }
  }, [user, workoutPayload, dietPayload, savePlans]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="glass rounded-2xl p-8 flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-3 border-brand-200 border-t-brand-500 animate-spin" />
        <p className="text-sm text-gray-500">Loading your workout plan...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between anim-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workout Plan</h1>
          <p className="text-sm text-gray-500 mt-1">AI-powered exercise programs</p>
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
              Create Workout Plan
            </h2>
            <p className="text-sm text-gray-500 mt-1">A matching diet plan will be auto-generated</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fitness Goals</label>
              <input value={goals} onChange={(e) => setGoals(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fitness Level</label>
              <select value={fitnessLevel} onChange={(e) => setFitnessLevel(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80">
                <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Equipment</label>
              <select value={equipment} onChange={(e) => setEquipment(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80">
                <option value="none">No equipment</option><option value="minimal">Minimal (dumbbells)</option><option value="full_gym">Full gym</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Days per Week</label>
              <select value={daysPerWeek} onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80">
                {[3,4,5,6].map(d => <option key={d} value={d}>{d} days</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Session Duration</label>
              <select value={sessionMinutes} onChange={(e) => setSessionMinutes(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80">
                {[30,45,60,90].map(m => <option key={m} value={m}>{m} minutes</option>)}
              </select>
            </div>
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
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80" placeholder="e.g. vegetarian" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Injuries / Limitations</label>
            <input value={injuries} onChange={(e) => setInjuries(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80" placeholder="e.g. bad knee, lower back issues" />
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
      {plan && plan.weekly_schedule && plan.weekly_schedule.length > 0 && (
        <div className="space-y-4">
          {/* Plan Header */}
          <div className="flex items-center gap-3 anim-fade-up anim-d1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-emerald-100 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <span className="font-semibold text-gray-900">{plan.plan_name}</span>
              {plan.source === "auto_from_diet" && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Auto from diet</span>
              )}
            </div>
          </div>

          {/* Day Cards */}
          {plan.weekly_schedule.map((day: WorkoutDay, idx: number) => (
            <div key={day.day} className={`glass rounded-2xl overflow-hidden anim-fade-up`} style={{ animationDelay: `${(idx + 2) * 80}ms` }}>
              <button onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/40 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    day.is_rest_day
                      ? "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400"
                      : "bg-gradient-to-br from-brand-100 to-emerald-100 text-brand-700"
                  }`}>
                    {day.is_rest_day
                      ? <Heart className="w-5 h-5" />
                      : <span className="font-bold text-sm">{day.day_name?.slice(0, 3) || "D" + day.day}</span>
                    }
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {day.workout_type || (day.is_rest_day ? "Rest & Recovery" : "Workout")}
                    </p>
                    {!day.is_rest_day && (
                      <div className="flex items-center gap-4 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" /> {day.duration_min} min
                        </span>
                        {day.exercises && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Flame className="w-3 h-3 text-orange-400" />
                            {day.exercises.reduce((s: number, e: { calories_burned_approx?: number }) => s + (e.calories_burned_approx || 0), 0)} cal
                          </span>
                        )}
                        {day.exercises && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Target className="w-3 h-3" /> {day.exercises.length} exercises
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {!day.is_rest_day && (
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${expandedDay === day.day ? "bg-brand-100 rotate-180" : "bg-gray-100"}`}>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </div>
                )}
              </button>
              {expandedDay === day.day && !day.is_rest_day && (
                <div className="px-6 pb-5 space-y-4">
                  {/* Warmup */}
                  {day.warmup && day.warmup.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Warmup</p>
                      <div className="flex flex-wrap gap-2">
                        {day.warmup.map((w: { exercise: string; duration_sec: number }, i: number) => (
                          <span key={i} className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-sm border border-orange-100">
                            {w.exercise} &middot; {w.duration_sec}s
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Exercises */}
                  {day.exercises && day.exercises.map((ex, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/60 hover:bg-white transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center text-sm font-bold">
                            {i + 1}
                          </div>
                          <p className="font-semibold text-gray-900">{ex.name}</p>
                        </div>
                        <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">{ex.muscle_group}</span>
                      </div>
                      <div className="ml-11 space-y-1">
                        <p className="text-sm text-gray-700 font-medium">
                          {ex.sets} sets &times; {ex.reps} reps &middot; Rest {ex.rest_seconds}s
                        </p>
                        {ex.form_tips && (
                          <p className="text-xs text-gray-500 leading-relaxed">{ex.form_tips}</p>
                        )}
                        {ex.calories_burned_approx > 0 && (
                          <p className="text-xs text-orange-500 flex items-center gap-1">
                            <Flame className="w-3 h-3" /> ~{ex.calories_burned_approx} cal
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Cooldown */}
                  {day.cooldown && day.cooldown.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Cooldown</p>
                      <div className="flex flex-wrap gap-2">
                        {day.cooldown.map((c: { stretch: string; duration_sec: number }, i: number) => (
                          <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100">
                            {c.stretch} &middot; {c.duration_sec}s
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {day.day_notes && <p className="text-sm text-gray-500 italic border-l-2 border-brand-200 pl-3">{day.day_notes}</p>}
                </div>
              )}
            </div>
          ))}

          {/* Notes */}
          {plan.trainer_notes && (
            <div className="rounded-2xl p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 anim-fade-up">
              <p className="font-bold text-blue-900 mb-2 flex items-center gap-2"><Dumbbell className="w-4 h-4" /> Trainer Notes</p>
              <p className="text-sm text-blue-800 leading-relaxed">{plan.trainer_notes}</p>
            </div>
          )}
          {plan.nutrition_timing && (
            <div className="rounded-2xl p-5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 anim-fade-up">
              <p className="font-bold text-green-900 mb-2 flex items-center gap-2"><Clock className="w-4 h-4" /> Nutrition Timing</p>
              <p className="text-sm text-green-800 leading-relaxed">{plan.nutrition_timing}</p>
            </div>
          )}
          {plan.recovery_tips && (
            <div className="rounded-2xl p-5 bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 anim-fade-up">
              <p className="font-bold text-purple-900 mb-2 flex items-center gap-2"><Heart className="w-4 h-4" /> Recovery Tips</p>
              <p className="text-sm text-purple-800 leading-relaxed">{plan.recovery_tips}</p>
            </div>
          )}
        </div>
      )}

      {/* Empty states */}
      {plan && (!plan.weekly_schedule || plan.weekly_schedule.length === 0) && (
        <div className="space-y-4 anim-fade-up">
          <div className="rounded-2xl p-6 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200">
            <p className="font-semibold text-yellow-800">Workout plan generated but exercises could not be fully structured.</p>
            <p className="text-sm text-yellow-700 mt-1">Try the Quick Plan (Gemini) for a more detailed workout.</p>
          </div>
          {plan.trainer_notes && (
            <div className="rounded-2xl p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
              <p className="font-bold text-blue-900 mb-2">AI Trainer Notes</p>
              <p className="text-sm text-blue-800 whitespace-pre-line leading-relaxed">{plan.trainer_notes}</p>
            </div>
          )}
          <button onClick={() => setShowForm(true)}
            className="w-full py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-brand-500/25 transition-all">
            Generate New Plan
          </button>
        </div>
      )}
      {!plan && !showForm && (
        <div className="text-center py-16 anim-fade-up">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-100 to-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-10 h-10 text-brand-500" />
          </div>
          <p className="text-gray-500 text-lg">No workout plan yet</p>
          <p className="text-sm text-gray-400 mt-1">Let our AI trainer create one for you</p>
          <button onClick={() => setShowForm(true)}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-brand-500/25 transition-all hover:scale-[1.02]">
            Create Your First Plan
          </button>
        </div>
      )}
    </div>
  );
}
