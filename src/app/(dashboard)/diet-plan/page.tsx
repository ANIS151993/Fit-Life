"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getLatestDietPlan, saveLinkedPlans } from "@/lib/firestore";
import { DietPlan, DietPlanDay } from "@/types";
import toast from "react-hot-toast";
import { BookOpen, ChevronDown, ChevronUp, Plus, Loader2 } from "lucide-react";

export default function DietPlanPage() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

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
  const [daysPerWeek] = useState(4);
  const [sessionMinutes] = useState(45);

  useEffect(() => {
    if (!user) return;
    setName(user.displayName || "");
    getLatestDietPlan(user.uid).then((p) => {
      setPlan(p);
      setLoading(false);
      if (!p) setShowForm(true);
    });
  }, [user]);

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      toast.loading("Generating diet + matching workout plan...", { id: "gen" });

      const res = await fetch("/api/generate-combined", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "diet_first",
          userId: user.uid,
          name: name || user.displayName || "User",
          age, gender, height_cm: heightCm,
          current_weight_kg: currentWeight,
          goal_weight_kg: goalWeight,
          activity_level: activityLevel,
          goals, restrictions,
          fitness_level: fitnessLevel,
          days_per_week: daysPerWeek,
          session_minutes: sessionMinutes,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Generation failed");

      const dietPlan: DietPlan = {
        userId: user.uid,
        bmi: data.diet?.bmi || 0,
        bmr: data.diet?.bmr || 0,
        tdee: data.diet?.tdee || 0,
        plan_type: data.diet?.plan_type || "balanced",
        daily_targets: data.diet?.daily_targets || { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 65, fiber_g: 30, water_ml: 2500 },
        days: data.diet?.days || [],
        nutritionist_notes: data.diet?.nutritionist_notes || "",
        supplements_recommended: data.diet?.supplements_recommended || [],
        foods_to_avoid: data.diet?.foods_to_avoid || [],
        foods_to_emphasize: data.diet?.foods_to_emphasize || [],
        source: "standalone",
        generated_at: new Date().toISOString(),
      };

      const workoutPlan = {
        userId: user.uid,
        plan_name: data.workout?.plan_name || "Auto Workout Plan",
        weekly_schedule: data.workout?.weekly_schedule || [],
        trainer_notes: data.workout?.trainer_notes || "",
        nutrition_timing: data.workout?.nutrition_timing || "",
        recovery_tips: data.workout?.recovery_tips || "",
        progression_plan: data.workout?.progression_plan || "",
        source: "auto_from_diet" as const,
        generated_at: new Date().toISOString(),
      };

      await saveLinkedPlans(user.uid, workoutPlan, dietPlan);
      setPlan(dietPlan);
      setShowForm(false);
      toast.success("Diet plan + matching workout plan created!", { id: "gen" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate";
      toast.error(message, { id: "gen" });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Diet Plan</h1>
        {plan && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">
            <Plus className="w-4 h-4" /> New Plan
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-semibold text-gray-900 text-lg">Create Diet Plan</h2>
          <p className="text-sm text-gray-500">A matching workout plan will be auto-generated to support your diet.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Goals</label>
              <input value={goals} onChange={(e) => setGoals(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none"
                placeholder="e.g. weight loss, muscle gain" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none">
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
              <input type="number" value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Weight (kg)</label>
              <input type="number" value={currentWeight} onChange={(e) => setCurrentWeight(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Goal Weight (kg)</label>
              <input type="number" value={goalWeight} onChange={(e) => setGoalWeight(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Activity Level</label>
              <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none">
                <option value="sedentary">Sedentary</option><option value="light">Light</option>
                <option value="moderate">Moderate</option><option value="active">Active</option>
                <option value="very_active">Very Active</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dietary Restrictions</label>
              <input value={restrictions} onChange={(e) => setRestrictions(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none"
                placeholder="e.g. vegetarian, halal, gluten-free" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fitness Level</label>
              <select value={fitnessLevel} onChange={(e) => setFitnessLevel(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none">
                <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <button onClick={handleGenerate} disabled={generating}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {generating ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating Plans (may take 1-2 min)...</> : <><BookOpen className="w-5 h-5" /> Generate Diet + Workout Plan</>}
          </button>
        </div>
      )}

      {plan && (
        <div className="space-y-3">
          {plan.source === "auto_from_workout" && (
            <p className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-xl">Auto-generated to match your workout plan</p>
          )}

          {/* Daily Targets */}
          {plan.daily_targets && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-3">Daily Targets</h2>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { label: "Calories", value: plan.daily_targets.calories, unit: "kcal", color: "text-green-600" },
                  { label: "Protein", value: plan.daily_targets.protein_g, unit: "g", color: "text-blue-600" },
                  { label: "Carbs", value: plan.daily_targets.carbs_g, unit: "g", color: "text-orange-500" },
                  { label: "Fat", value: plan.daily_targets.fat_g, unit: "g", color: "text-yellow-500" },
                  { label: "Fiber", value: plan.daily_targets.fiber_g, unit: "g", color: "text-purple-500" },
                  { label: "Water", value: plan.daily_targets.water_ml, unit: "ml", color: "text-cyan-500" },
                ].map((t) => (
                  <div key={t.label} className="text-center p-2 bg-gray-50 rounded-xl">
                    <p className={`text-lg font-bold ${t.color}`}>{t.value}</p>
                    <p className="text-xs text-gray-400">{t.unit} {t.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meal Days */}
          {plan.days && plan.days.map((day: DietPlanDay) => (
            <div key={day.day} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                    <span className="font-bold text-sm">{day.day_name?.slice(0, 3) || `D${day.day}`}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Day {day.day} — {day.day_name}</p>
                    <p className="text-xs text-gray-400">{day.day_total_calories} kcal total</p>
                  </div>
                </div>
                {expandedDay === day.day ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>

              {expandedDay === day.day && day.meals && (
                <div className="px-6 pb-4 space-y-3">
                  {(["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner"] as const).map((mealKey) => {
                    const meal = day.meals[mealKey];
                    if (!meal) return null;
                    return (
                      <div key={mealKey} className="p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-gray-900">{meal.name || mealKey.replace("_", " ")}</p>
                          <span className="text-xs text-gray-400">{meal.time} | {meal.total_calories} kcal</span>
                        </div>
                        {meal.items && meal.items.map((item, i) => (
                          <p key={i} className="text-sm text-gray-600 ml-2">- {item.food} ({item.quantity}) — {item.calories} kcal</p>
                        ))}
                        {meal.recipe_hint && <p className="text-xs text-green-600 mt-1">{meal.recipe_hint}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {plan.nutritionist_notes && (
            <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
              <p className="text-sm font-semibold text-green-800 mb-1">Nutritionist Notes</p>
              <p className="text-sm text-green-700">{plan.nutritionist_notes}</p>
            </div>
          )}

          {plan.foods_to_emphasize && plan.foods_to_emphasize.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm font-semibold text-gray-800 mb-2">Foods to Emphasize</p>
              <div className="flex flex-wrap gap-2">
                {plan.foods_to_emphasize.map((f, i) => (
                  <span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">{f}</span>
                ))}
              </div>
            </div>
          )}

          {plan.foods_to_avoid && plan.foods_to_avoid.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm font-semibold text-gray-800 mb-2">Foods to Avoid</p>
              <div className="flex flex-wrap gap-2">
                {plan.foods_to_avoid.map((f, i) => (
                  <span key={i} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs">{f}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!plan && !showForm && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No diet plan yet</p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">
            Create Your First Plan
          </button>
        </div>
      )}
    </div>
  );
}
