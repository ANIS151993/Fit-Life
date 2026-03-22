"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getLatestWorkoutPlan, saveLinkedPlans } from "@/lib/firestore";
import { WorkoutPlan, WorkoutDay } from "@/types";
import toast from "react-hot-toast";
import { Dumbbell, Clock, Flame, ChevronDown, ChevronUp, Plus, Loader2 } from "lucide-react";

const N8N_WORKOUT = "https://n8n.marcbd.site/webhook/fitlife/generate-workout";
const N8N_DIET = "https://n8n.marcbd.site/webhook/fitlife/generate-diet";

export default function WorkoutsPage() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState("");
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

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
    getLatestWorkoutPlan(user.uid).then((p) => {
      setPlan(p);
      setLoading(false);
      if (!p) setShowForm(true);
    });
  }, [user]);

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      // Step 1: Generate workout plan directly from n8n
      setGenStep("Generating workout plan with AI... (3-5 min)");
      const workoutRes = await fetch(N8N_WORKOUT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid, goals, fitness_level: fitnessLevel,
          equipment, days_per_week: daysPerWeek,
          session_minutes: sessionMinutes, age, injuries,
        }),
      });
      const workoutRaw = await workoutRes.text();
      let workoutData;
      try { const p = JSON.parse(workoutRaw); workoutData = Array.isArray(p) ? p[0] : p; }
      catch { throw new Error("Failed to parse workout response"); }
      if (!workoutData.success) throw new Error(workoutData.error || "Workout generation failed");

      // Step 2: Generate matching diet plan
      setGenStep("Generating matching diet plan... (3-5 min)");
      const dietRes = await fetch(N8N_DIET, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid, name: user.displayName || "User",
          age, gender, height_cm: heightCm,
          current_weight_kg: currentWeight, goal_weight_kg: goalWeight,
          activity_level: activityLevel, restrictions: restrictions || "none",
          goals, workout_context: daysPerWeek + " days/week " + goals + " workout",
        }),
      });
      const dietRaw = await dietRes.text();
      let dietData;
      try { const p = JSON.parse(dietRaw); dietData = Array.isArray(p) ? p[0] : p; }
      catch { throw new Error("Failed to parse diet response"); }

      // Step 3: Save both plans
      setGenStep("Saving plans...");
      const workoutPlan: WorkoutPlan = {
        userId: user.uid,
        plan_name: workoutData.plan_name || goals + " Plan",
        weekly_schedule: workoutData.weekly_schedule || [],
        trainer_notes: workoutData.trainer_notes || "",
        nutrition_timing: workoutData.nutrition_timing || "",
        recovery_tips: workoutData.recovery_tips || "",
        progression_plan: workoutData.progression_plan || "",
        source: "standalone",
        generated_at: new Date().toISOString(),
      };
      const dietPlan = {
        userId: user.uid,
        bmi: dietData.bmi || 0, bmr: dietData.bmr || 0, tdee: dietData.tdee || 0,
        plan_type: dietData.plan_type || "balanced",
        daily_targets: dietData.daily_targets || { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 65, fiber_g: 30, water_ml: 2500 },
        days: dietData.days || [],
        nutritionist_notes: dietData.nutritionist_notes || "",
        supplements_recommended: dietData.supplements_recommended || [],
        foods_to_avoid: dietData.foods_to_avoid || [],
        foods_to_emphasize: dietData.foods_to_emphasize || [],
        source: "auto_from_workout" as const,
        generated_at: new Date().toISOString(),
      };
      await saveLinkedPlans(user.uid, workoutPlan, dietPlan);
      setPlan(workoutPlan);
      setShowForm(false);
      toast.success("Workout + diet plan created!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
      setGenStep("");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Workout Plan</h1>
        {plan && <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700"><Plus className="w-4 h-4" /> New Plan</button>}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-semibold text-gray-900 text-lg">Create Workout Plan</h2>
          <p className="text-sm text-gray-500">A matching diet plan will be auto-generated. Takes ~8-10 min total.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Fitness Goals</label><input value={goals} onChange={(e) => setGoals(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Fitness Level</label><select value={fitnessLevel} onChange={(e) => setFitnessLevel(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Equipment</label><select value={equipment} onChange={(e) => setEquipment(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none"><option value="none">No equipment</option><option value="minimal">Minimal (dumbbells)</option><option value="full_gym">Full gym</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Days per Week</label><select value={daysPerWeek} onChange={(e) => setDaysPerWeek(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none">{[3,4,5,6].map(d=><option key={d} value={d}>{d} days</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Session (min)</label><select value={sessionMinutes} onChange={(e) => setSessionMinutes(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none">{[30,45,60,90].map(m=><option key={m} value={m}>{m} min</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Age</label><input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Gender</label><select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none"><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label><input type="number" value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Weight (kg)</label><input type="number" value={currentWeight} onChange={(e) => setCurrentWeight(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Goal Weight (kg)</label><input type="number" value={goalWeight} onChange={(e) => setGoalWeight(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Activity Level</label><select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none"><option value="sedentary">Sedentary</option><option value="light">Light</option><option value="moderate">Moderate</option><option value="active">Active</option><option value="very_active">Very Active</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Restrictions</label><input value={restrictions} onChange={(e) => setRestrictions(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" placeholder="e.g. vegetarian" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Injuries</label><input value={injuries} onChange={(e) => setInjuries(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" placeholder="e.g. bad knee" /></div>
          <button onClick={handleGenerate} disabled={generating} className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {generating ? <><Loader2 className="w-5 h-5 animate-spin" /> {genStep}</> : <><Dumbbell className="w-5 h-5" /> Generate Workout + Diet Plan</>}
          </button>
        </div>
      )}

      {plan && plan.weekly_schedule && plan.weekly_schedule.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Plan: {plan.plan_name}</span>
            {plan.source === "auto_from_diet" && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">Auto from diet</span>}
          </div>
          {plan.weekly_schedule.map((day: WorkoutDay) => (
            <div key={day.day} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)} className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${day.is_rest_day ? "bg-gray-100 text-gray-400" : "bg-green-100 text-green-600"}`}>
                    <span className="font-bold text-sm">{day.day_name?.slice(0, 3) || "D" + day.day}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{day.workout_type || (day.is_rest_day ? "Rest Day" : "Workout")}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {!day.is_rest_day && <><Clock className="w-3 h-3" /> {day.duration_min} min</>}
                      {!day.is_rest_day && day.exercises && <><Flame className="w-3 h-3" /> {day.exercises.reduce((s, e) => s + (e.calories_burned_approx || 0), 0)} cal</>}
                    </div>
                  </div>
                </div>
                {!day.is_rest_day && (expandedDay === day.day ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />)}
              </button>
              {expandedDay === day.day && !day.is_rest_day && (
                <div className="px-6 pb-4 space-y-3">
                  {day.warmup && day.warmup.length > 0 && <div><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Warmup</p>{day.warmup.map((w, i) => <p key={i} className="text-sm text-gray-600">{w.exercise} - {w.duration_sec}s</p>)}</div>}
                  {day.exercises && day.exercises.map((ex, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-1"><p className="font-medium text-gray-900">{ex.name}</p><span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{ex.muscle_group}</span></div>
                      <p className="text-sm text-gray-600">{ex.sets} sets x {ex.reps} reps - Rest {ex.rest_seconds}s</p>
                      {ex.form_tips && <p className="text-xs text-gray-400 mt-1">{ex.form_tips}</p>}
                    </div>
                  ))}
                  {day.cooldown && day.cooldown.length > 0 && <div><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Cooldown</p>{day.cooldown.map((c, i) => <p key={i} className="text-sm text-gray-600">{c.stretch} - {c.duration_sec}s</p>)}</div>}
                  {day.day_notes && <p className="text-xs text-gray-400 italic">{day.day_notes}</p>}
                </div>
              )}
            </div>
          ))}
          {plan.trainer_notes && <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100"><p className="text-sm font-semibold text-blue-800 mb-1">Trainer Notes</p><p className="text-sm text-blue-700">{plan.trainer_notes}</p></div>}
          {plan.nutrition_timing && <div className="bg-green-50 rounded-2xl p-4 border border-green-100"><p className="text-sm font-semibold text-green-800 mb-1">Nutrition Timing</p><p className="text-sm text-green-700">{plan.nutrition_timing}</p></div>}
        </div>
      )}
      {!plan && !showForm && (
        <div className="text-center py-12"><Dumbbell className="w-16 h-16 mx-auto text-gray-300 mb-4" /><p className="text-gray-500">No workout plan yet</p><button onClick={() => setShowForm(true)} className="mt-4 px-6 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">Create Your First Plan</button></div>
      )}
    </div>
  );
}
