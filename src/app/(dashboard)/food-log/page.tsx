"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { logFood, subscribeTodaysFoodLogs, getActivePlans, getTodayNutritionTotals } from "@/lib/firestore";
import { FoodLog, FoodAnalysis, AIGuidance, DietPlan, WorkoutPlan } from "@/types";

interface AnalysisResponse {
  status: string;
  success?: boolean;
  error?: string;
  userId?: string;
  mealType?: string;
  analysis?: FoodAnalysis;
  ai_guidance?: AIGuidance;
  analyzed_at?: string;
  plan_alignment?: { matches_diet: boolean; matches_workout_nutrition: boolean; suggestions: string[]; remaining_today: { calories: number; protein_g: number; carbs_g: number; fat_g: number } };
}
import toast from "react-hot-toast";
import { Camera, Loader2, AlertTriangle, CheckCircle, Zap, Clock } from "lucide-react";
import Image from "next/image";

const N8N_BASE = "https://n8n.marcbd.site/webhook";
const N8N_FOOD_FAST = `${N8N_BASE}/fitlife/analyze-food-fast`;
const N8N_FOOD_FREE = `${N8N_BASE}/fitlife/analyze-food`;
const N8N_POLL = `${N8N_BASE}/fitlife/food-result`;

export default function FoodLogPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [activeDiet, setActiveDiet] = useState<DietPlan | null>(null);
  const [, setActiveWorkout] = useState<WorkoutPlan | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStatus, setAnalyzeStatus] = useState("");
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");
  const [preview, setPreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeTodaysFoodLogs(user.uid, setLogs);
    getActivePlans(user.uid).then(({ diet, workout }) => {
      setActiveDiet(diet);
      setActiveWorkout(workout);
    });
    return () => {
      unsub();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setImageReady(false);

    const previewReader = new FileReader();
    previewReader.onload = (ev) => setPreview(ev.target?.result as string);
    previewReader.readAsDataURL(file);

    const b64Reader = new FileReader();
    b64Reader.onload = () => {
      const b64 = (b64Reader.result as string).split(",")[1];
      setBase64Image(b64);
      setImageReady(true);
    };
    b64Reader.readAsDataURL(file);
  }, []);

  const buildPlanAlignment = useCallback(async (analysis: FoodAnalysis) => {
    if (!user || !activeDiet?.daily_targets || !analysis?.totals) return undefined;
    const todayTotals = await getTodayNutritionTotals(user.uid);
    const targets = activeDiet.daily_targets;
    const remaining = {
      calories: Math.max(0, targets.calories - todayTotals.calories - (analysis.totals.calories || 0)),
      protein_g: Math.max(0, targets.protein_g - todayTotals.protein_g - (analysis.totals.protein_g || 0)),
      carbs_g: Math.max(0, targets.carbs_g - todayTotals.carbs_g - (analysis.totals.carbs_g || 0)),
      fat_g: Math.max(0, targets.fat_g - todayTotals.fat_g - (analysis.totals.fat_g || 0)),
    };
    const suggestions: string[] = [];
    const afterCal = todayTotals.calories + (analysis.totals.calories || 0);
    if (afterCal > targets.calories) suggestions.push(`This meal puts you ${Math.round(afterCal - targets.calories)} kcal over your daily target.`);
    if (analysis.meal_quality_score < 5) suggestions.push("This meal scores low. Consider healthier alternatives from your diet plan.");
    if (activeDiet.foods_to_avoid?.length) {
      const foodNames = (analysis.food_items?.map((f: { name?: string }) => f.name?.toLowerCase()).filter(Boolean) as string[]) || [];
      activeDiet.foods_to_avoid.forEach((avoid) => { if (foodNames.some((n) => n.includes(avoid.toLowerCase()))) suggestions.push(`"${avoid}" is on your foods-to-avoid list.`); });
    }
    return { matches_diet: afterCal <= targets.calories * 1.1, matches_workout_nutrition: true, suggestions, remaining_today: remaining };
  }, [user, activeDiet]);

  const saveAndFinish = useCallback(async (data: AnalysisResponse) => {
    if (!user || !data.analysis) return;
    const planAlignment = await buildPlanAlignment(data.analysis);
    const fullResult = { ...data, plan_alignment: planAlignment };
    setResult(fullResult);
    const foodName = data.analysis.food_items?.[0]?.name || mealType;
    await logFood({
      userId: user.uid, date: new Date().toISOString().split("T")[0], mealType,
      food_name: foodName, analysis: data.analysis, ai_guidance: data.ai_guidance!,
      logged_at: new Date().toISOString(),
    });
    toast.success("Meal analyzed and logged!", { id: "analyze" });
  }, [user, mealType, buildPlanAlignment]);

  // Gemini (Fast) analysis - synchronous response
  const analyzeFast = useCallback(async () => {
    if (!user || !base64Image) return;
    setAnalyzing(true);
    setResult(null);
    setAnalyzeStatus("Analyzing with Gemini AI...");
    toast.loading("Quick analysis in progress...", { id: "analyze" });
    try {
      const res = await fetch(N8N_FOOD_FAST, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Image, userId: user.uid, mealType }),
      });
      const raw = await res.text();
      let data: AnalysisResponse;
      try { const parsed = JSON.parse(raw); data = Array.isArray(parsed) ? parsed[0] : parsed; }
      catch { throw new Error("Failed to parse response"); }
      if (!data.success) throw new Error(data.error || "Analysis failed");
      await saveAndFinish(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Analysis failed", { id: "analyze" });
    } finally { setAnalyzing(false); setAnalyzeStatus(""); }
  }, [user, base64Image, mealType, saveAndFinish]);

  // Ollama (Free) analysis - async with polling
  const analyzeFree = useCallback(async () => {
    if (!user || !base64Image) return;
    setAnalyzing(true);
    setResult(null);
    setAnalyzeStatus("Sending image to local AI...");
    toast.loading("Free analysis started (1-3 min)...", { id: "analyze" });
    try {
      const jobId = crypto.randomUUID();
      const submitRes = await fetch(N8N_FOOD_FREE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Image, userId: user.uid, mealType, jobId }),
      });
      if (!submitRes.ok) throw new Error("Failed to submit image");
      setAnalyzeStatus("Local AI is analyzing... (1-3 min)");

      // Poll for result
      const data = await new Promise<AnalysisResponse>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 60;
        const interval = setInterval(async () => {
          attempts++;
          if (attempts > maxAttempts) { clearInterval(interval); reject(new Error("Analysis timed out")); return; }
          try {
            const res = await fetch(`${N8N_POLL}?jobId=${encodeURIComponent(jobId)}`);
            const d = await res.json();
            if (d.status === "done") { clearInterval(interval); resolve(d as AnalysisResponse); }
            else setAnalyzeStatus(`Local AI analyzing... (${attempts * 5}s)`);
          } catch { /* ignore */ }
        }, 5000);
        pollRef.current = interval;
      });
      if (!data.success && !data.analysis) throw new Error(data.error || "Analysis failed");
      await saveAndFinish(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Analysis failed", { id: "analyze" });
    } finally { setAnalyzing(false); setAnalyzeStatus(""); }
  }, [user, base64Image, mealType, saveAndFinish]);

  const todayCalories = logs.reduce((s, l) => s + (l.analysis?.totals?.calories || 0), 0);
  const targetCalories = activeDiet?.daily_targets?.calories || 2000;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Log Meal</h1>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Today&apos;s calories</p>
          <p className="text-2xl font-bold text-gray-900">{Math.round(todayCalories)} <span className="text-sm text-gray-400 font-normal">/ {targetCalories} kcal</span></p>
        </div>
        <div className="h-12 w-12">
          <svg viewBox="0 0 36 36">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={todayCalories > targetCalories ? "#ef4444" : "#16a34a"} strokeWidth="3" strokeDasharray={`${Math.min((todayCalories / targetCalories) * 100, 100)}, 100`} />
          </svg>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type</label>
          <div className="flex gap-2">
            {(["breakfast", "lunch", "dinner", "snack"] as const).map((t) => (
              <button key={t} onClick={() => setMealType(t)}
                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${mealType === t ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <label className="block cursor-pointer">
          <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${analyzing ? "border-green-300 bg-green-50" : "border-gray-200 hover:border-green-400 hover:bg-green-50"}`}>
            {analyzing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
                <p className="text-green-600 font-medium">{analyzeStatus || "Analyzing..."}</p>
              </div>
            ) : preview ? (
              <div className="flex flex-col items-center gap-3">
                <Image src={preview} alt="Meal preview" width={192} height={192} className="w-48 h-48 object-cover rounded-xl" />
                <p className="text-sm text-gray-500">Tap to change photo</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Camera className="w-12 h-12 text-gray-300" />
                <p className="text-gray-500 font-medium">Take or upload a photo of your meal</p>
                <p className="text-xs text-gray-400">Then choose Quick or Free analysis below</p>
              </div>
            )}
          </div>
          <input type="file" accept="image/*" capture="environment" onChange={handleImageSelect} className="hidden" disabled={analyzing} />
        </label>

        {imageReady && !analyzing && !result && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={analyzeFast}
              className="py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex flex-col items-center gap-1 shadow-lg">
              <Zap className="w-6 h-6" />
              <span>Quick Analysis</span>
              <span className="text-xs opacity-80">Gemini AI ~ 10s</span>
            </button>
            <button onClick={analyzeFree}
              className="py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all flex flex-col items-center gap-1 shadow-lg">
              <Clock className="w-6 h-6" />
              <span>Free Analysis</span>
              <span className="text-xs opacity-80">Local AI ~ 1-3 min</span>
            </button>
          </div>
        )}
      </div>

      {result && result.analysis && (
        <div className="space-y-3">
          {result.ai_guidance && (
            <div className={`rounded-2xl p-4 border ${
              result.ai_guidance.color === "green" ? "bg-green-50 border-green-200" :
              result.ai_guidance.color === "yellow" ? "bg-yellow-50 border-yellow-200" :
              result.ai_guidance.color === "orange" ? "bg-orange-50 border-orange-200" : "bg-red-50 border-red-200"
            }`}>
              <div className="flex items-start gap-3">
                {result.ai_guidance.score >= 6 ? <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />}
                <div>
                  <p className="font-medium text-gray-900">Score: {result.ai_guidance.score}/10</p>
                  <p className="text-sm text-gray-700 mt-1">{result.ai_guidance.message}</p>
                </div>
              </div>
            </div>
          )}

          {result.plan_alignment && result.plan_alignment.suggestions.length > 0 && (
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
              <p className="font-medium text-blue-800 mb-2">Plan Alignment</p>
              {result.plan_alignment.suggestions.map((s: string, i: number) => (
                <p key={i} className="text-sm text-blue-700">- {s}</p>
              ))}
              {result.plan_alignment.remaining_today && (
                <div className="mt-3 flex gap-3 text-xs text-blue-600">
                  <span>Remaining: {Math.round(result.plan_alignment.remaining_today.calories)} kcal</span>
                  <span>{Math.round(result.plan_alignment.remaining_today.protein_g)}g P</span>
                  <span>{Math.round(result.plan_alignment.remaining_today.carbs_g)}g C</span>
                  <span>{Math.round(result.plan_alignment.remaining_today.fat_g)}g F</span>
                </div>
              )}
            </div>
          )}

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

      {logs.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3">Today&apos;s Meals ({logs.length})</h3>
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${log.mealType === "breakfast" ? "bg-blue-400" : log.mealType === "lunch" ? "bg-green-400" : log.mealType === "dinner" ? "bg-purple-400" : "bg-orange-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{log.food_name}</p>
                  <p className="text-xs text-gray-400 capitalize">{log.mealType}</p>
                </div>
                <p className="font-semibold text-gray-900 flex-shrink-0">{Math.round(log.analysis?.totals?.calories || 0)} kcal</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
