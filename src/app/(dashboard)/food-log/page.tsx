"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { logFood, subscribeTodaysFoodLogs, getActivePlans, getTodayNutritionTotals } from "@/lib/firestore";
import { FoodLog, FoodAnalysisResult, DietPlan, WorkoutPlan } from "@/types";
import toast from "react-hot-toast";
import { Camera, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import Image from "next/image";

const N8N_FOOD = "https://n8n.marcbd.site/webhook/fitlife/analyze-food";

export default function FoodLogPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [activeDiet, setActiveDiet] = useState<DietPlan | null>(null);
  const [, setActiveWorkout] = useState<WorkoutPlan | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<FoodAnalysisResult | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeTodaysFoodLogs(user.uid, setLogs);
    getActivePlans(user.uid).then(({ diet, workout }) => {
      setActiveDiet(diet);
      setActiveWorkout(workout);
    });
    return unsub;
  }, [user]);

  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Convert to base64
    setAnalyzing(true);
    setResult(null);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => {
          const b64 = (r.result as string).split(",")[1];
          resolve(b64);
        };
        r.readAsDataURL(file);
      });

      toast.loading("Analyzing your meal with AI... (1-3 min)", { id: "analyze" });

      // Call n8n directly from browser (bypasses Cloudflare edge 30s timeout)
      const res = await fetch(N8N_FOOD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          userId: user.uid,
          mealType,
        }),
      });

      const rawText = await res.text();
      let data;
      try {
        const parsed = JSON.parse(rawText);
        data = Array.isArray(parsed) ? parsed[0] : parsed;
      } catch {
        throw new Error("Failed to parse AI response");
      }

      if (!data.success && !data.analysis) {
        throw new Error(data.error || "Analysis failed");
      }

      // Build plan alignment info
      let planAlignment = undefined;
      if (activeDiet?.daily_targets && data.analysis?.totals) {
        const todayTotals = await getTodayNutritionTotals(user.uid);
        const targets = activeDiet.daily_targets;
        const remaining = {
          calories: Math.max(0, targets.calories - todayTotals.calories - (data.analysis.totals.calories || 0)),
          protein_g: Math.max(0, targets.protein_g - todayTotals.protein_g - (data.analysis.totals.protein_g || 0)),
          carbs_g: Math.max(0, targets.carbs_g - todayTotals.carbs_g - (data.analysis.totals.carbs_g || 0)),
          fat_g: Math.max(0, targets.fat_g - todayTotals.fat_g - (data.analysis.totals.fat_g || 0)),
        };

        const suggestions: string[] = [];
        const afterCalories = todayTotals.calories + (data.analysis.totals.calories || 0);
        if (afterCalories > targets.calories) {
          suggestions.push(`This meal puts you ${Math.round(afterCalories - targets.calories)} kcal over your daily target.`);
        }
        if (todayTotals.protein_g + (data.analysis.totals.protein_g || 0) < targets.protein_g * 0.3 && mealType === "dinner") {
          suggestions.push("You are low on protein today. Consider adding a protein-rich food.");
        }
        if (data.analysis.meal_quality_score < 5) {
          suggestions.push("This meal scores low. Consider swapping for healthier alternatives from your diet plan.");
        }

        // Check against foods to avoid
        if (activeDiet.foods_to_avoid?.length) {
          const foodNames = data.analysis.food_items?.map((f: { name?: string }) => f.name?.toLowerCase()) || [];
          activeDiet.foods_to_avoid.forEach((avoid) => {
            if (foodNames.some((n: string) => n.includes(avoid.toLowerCase()))) {
              suggestions.push(`"${avoid}" is on your foods-to-avoid list.`);
            }
          });
        }

        planAlignment = {
          matches_diet: afterCalories <= targets.calories * 1.1,
          matches_workout_nutrition: true,
          suggestions,
          remaining_today: remaining,
        };
      }

      const analysisResult = { ...data, plan_alignment: planAlignment };
      setResult(analysisResult);

      // Save to Firestore
      const foodName = data.analysis?.food_items?.[0]?.name || mealType;
      await logFood({
        userId: user.uid,
        date: new Date().toISOString().split("T")[0],
        mealType,
        food_name: foodName,
        analysis: data.analysis,
        ai_guidance: data.ai_guidance,
        logged_at: new Date().toISOString(),
      });

      toast.success("Meal analyzed and logged!", { id: "analyze" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      toast.error(message, { id: "analyze" });
    } finally {
      setAnalyzing(false);
    }
  }, [user, mealType, activeDiet]);

  const todayCalories = logs.reduce((s, l) => s + (l.analysis?.totals?.calories || 0), 0);
  const targetCalories = activeDiet?.daily_targets?.calories || 2000;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Log Meal</h1>

      {/* Quick Stats */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Today&apos;s calories</p>
          <p className="text-2xl font-bold text-gray-900">{Math.round(todayCalories)} <span className="text-sm text-gray-400 font-normal">/ {targetCalories} kcal</span></p>
        </div>
        <div className="h-12 w-12">
          <svg viewBox="0 0 36 36">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="#e5e7eb" strokeWidth="3" />
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke={todayCalories > targetCalories ? "#ef4444" : "#16a34a"} strokeWidth="3"
              strokeDasharray={`${Math.min((todayCalories / targetCalories) * 100, 100)}, 100`} />
          </svg>
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type</label>
          <div className="flex gap-2">
            {(["breakfast", "lunch", "dinner", "snack"] as const).map((t) => (
              <button key={t} onClick={() => setMealType(t)}
                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                  mealType === t ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <label className="block cursor-pointer">
          <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
            analyzing ? "border-green-300 bg-green-50" : "border-gray-200 hover:border-green-400 hover:bg-green-50"
          }`}>
            {analyzing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
                <p className="text-green-600 font-medium">Analyzing your meal with AI...</p>
                <p className="text-xs text-gray-400">This may take 1-3 minutes on first analysis</p>
              </div>
            ) : preview ? (
              <div className="flex flex-col items-center gap-3">
                <Image src={preview} alt="Meal preview" width={192} height={192} className="w-48 h-48 object-cover rounded-xl" />
                <p className="text-sm text-gray-500">Tap to upload a new photo</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Camera className="w-12 h-12 text-gray-300" />
                <p className="text-gray-500 font-medium">Take or upload a photo of your meal</p>
                <p className="text-xs text-gray-400">AI will analyze nutrition, calories, and check against your plans</p>
              </div>
            )}
          </div>
          <input type="file" accept="image/*" capture="environment" onChange={handleImageSelect}
            className="hidden" disabled={analyzing} />
        </label>
      </div>

      {/* Analysis Result */}
      {result && result.analysis && (
        <div className="space-y-3">
          {/* AI Guidance */}
          {result.ai_guidance && (
            <div className={`rounded-2xl p-4 border ${
              result.ai_guidance.color === "green" ? "bg-green-50 border-green-200" :
              result.ai_guidance.color === "yellow" ? "bg-yellow-50 border-yellow-200" :
              result.ai_guidance.color === "orange" ? "bg-orange-50 border-orange-200" :
              "bg-red-50 border-red-200"
            }`}>
              <div className="flex items-start gap-3">
                {result.ai_guidance.score >= 6 ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                )}
                <div>
                  <p className="font-medium text-gray-900">Score: {result.ai_guidance.score}/10</p>
                  <p className="text-sm text-gray-700 mt-1">{result.ai_guidance.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Plan Alignment */}
          {result.plan_alignment && result.plan_alignment.suggestions.length > 0 && (
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
              <p className="font-medium text-blue-800 mb-2">Plan Alignment Suggestions</p>
              {result.plan_alignment.suggestions.map((s: string, i: number) => (
                <p key={i} className="text-sm text-blue-700 flex items-start gap-2">
                  <span className="mt-1">-</span> {s}
                </p>
              ))}
              {result.plan_alignment.remaining_today && (
                <div className="mt-3 flex gap-3 text-xs text-blue-600">
                  <span>Remaining: {Math.round(result.plan_alignment.remaining_today.calories)} kcal</span>
                  <span>{Math.round(result.plan_alignment.remaining_today.protein_g)}g protein</span>
                  <span>{Math.round(result.plan_alignment.remaining_today.carbs_g)}g carbs</span>
                  <span>{Math.round(result.plan_alignment.remaining_today.fat_g)}g fat</span>
                </div>
              )}
            </div>
          )}

          {/* Nutrition Breakdown */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Nutrition Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Calories", value: result.analysis.totals?.calories, unit: "kcal", color: "text-green-600" },
                { label: "Protein", value: result.analysis.totals?.protein_g, unit: "g", color: "text-blue-600" },
                { label: "Carbs", value: result.analysis.totals?.carbs_g, unit: "g", color: "text-orange-500" },
                { label: "Fat", value: result.analysis.totals?.fat_g, unit: "g", color: "text-yellow-500" },
                { label: "Fiber", value: result.analysis.totals?.fiber_g, unit: "g", color: "text-purple-500" },
              ].map((n) => (
                <div key={n.label} className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className={`text-xl font-bold ${n.color}`}>{Math.round(n.value || 0)}</p>
                  <p className="text-xs text-gray-400">{n.unit} {n.label}</p>
                </div>
              ))}
            </div>

            {result.analysis.food_items && result.analysis.food_items.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Detected Items</p>
                {result.analysis.food_items.map((item: { name: string; quantity_g: number; calories: number }, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700">{item.name} ({item.quantity_g}g)</span>
                    <span className="text-sm text-gray-500">{item.calories} kcal</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Today's Log */}
      {logs.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3">Today&apos;s Meals ({logs.length})</h3>
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  log.mealType === "breakfast" ? "bg-blue-400" :
                  log.mealType === "lunch" ? "bg-green-400" :
                  log.mealType === "dinner" ? "bg-purple-400" : "bg-orange-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{log.food_name}</p>
                  <p className="text-xs text-gray-400 capitalize">{log.mealType}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-gray-900">{Math.round(log.analysis?.totals?.calories || 0)} kcal</p>
                  {log.ai_guidance && (
                    <div className={`w-2 h-2 rounded-full ml-auto mt-1 ${
                      log.ai_guidance.color === "green" ? "bg-green-400" :
                      log.ai_guidance.color === "yellow" ? "bg-yellow-400" :
                      log.ai_guidance.color === "orange" ? "bg-orange-400" : "bg-red-400"
                    }`} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
