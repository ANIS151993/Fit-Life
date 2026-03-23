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
import { Camera, Loader2, AlertTriangle, CheckCircle, Zap, Clock, Upload, Utensils, TrendingUp, Apple } from "lucide-react";
import Image from "next/image";
import { ProgressRing } from "@/components/ui/ProgressRing";

const N8N_BASE = "https://n8n.marcbd.site/webhook";
const N8N_FOOD_FAST = `${N8N_BASE}/fitlife/analyze-food-fast`;
const N8N_FOOD_FREE = `${N8N_BASE}/fitlife/analyze-food`;
const N8N_POLL = `${N8N_BASE}/fitlife/food-result`;

const mealIcons: Record<string, string> = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍎" };

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

  const analyzeFast = useCallback(async () => {
    if (!user || !base64Image) return;
    setAnalyzing(true);
    setResult(null);
    setAnalyzeStatus("Analyzing with Gemini AI...");
    toast.loading("Quick analysis in progress (~10-20s)...", { id: "analyze" });
    try {
      const jobId = crypto.randomUUID();
      const submitRes = await fetch(N8N_FOOD_FAST, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Image, userId: user.uid, mealType, jobId }),
      });
      if (!submitRes.ok) throw new Error("Failed to submit image");
      setAnalyzeStatus("Gemini AI analyzing... (~10-20s)");
      const data = await new Promise<AnalysisResponse>((resolve, reject) => {
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          if (attempts > 40) { clearInterval(interval); reject(new Error("Analysis timed out")); return; }
          try {
            const res = await fetch(`${N8N_POLL}?jobId=${encodeURIComponent(jobId)}`);
            const d = await res.json();
            if (d.status === "done") { clearInterval(interval); resolve(d as AnalysisResponse); }
            else setAnalyzeStatus(`Gemini analyzing... (${attempts * 3}s)`);
          } catch { /* ignore */ }
        }, 3000);
        pollRef.current = interval;
      });
      if (!data.success && !data.analysis) throw new Error(data.error || "Analysis failed");
      await saveAndFinish(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Analysis failed", { id: "analyze" });
    } finally { setAnalyzing(false); setAnalyzeStatus(""); }
  }, [user, base64Image, mealType, saveAndFinish]);

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
  const todayProtein = logs.reduce((s, l) => s + (l.analysis?.totals?.protein_g || 0), 0);
  const todayCarbs = logs.reduce((s, l) => s + (l.analysis?.totals?.carbs_g || 0), 0);
  const todayFat = logs.reduce((s, l) => s + (l.analysis?.totals?.fat_g || 0), 0);
  const targetCalories = activeDiet?.daily_targets?.calories || 2000;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="anim-fade-up">
        <h1 className="text-2xl font-bold text-gray-900">Log Meal</h1>
        <p className="text-sm text-gray-500 mt-1">Snap a photo for instant AI nutrition analysis</p>
      </div>

      {/* Today's Progress Bar */}
      <div className="anim-fade-up anim-d1 glass rounded-2xl p-5">
        <div className="flex items-center gap-5">
          <ProgressRing value={todayCalories} max={targetCalories} size={80} strokeWidth={7} label={`${Math.round(todayCalories)}`} sublabel="kcal" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-medium">Daily Progress</span>
              <span className="font-semibold text-gray-900">{Math.round(todayCalories)} / {targetCalories} kcal</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Protein", value: todayProtein, color: "bg-macro-protein" },
                { label: "Carbs", value: todayCarbs, color: "bg-macro-carbs" },
                { label: "Fat", value: todayFat, color: "bg-macro-fat" },
              ].map(m => (
                <div key={m.label} className="text-center">
                  <p className="text-xs text-gray-500">{m.label}</p>
                  <p className="text-sm font-bold text-gray-800">{Math.round(m.value)}g</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Meal Type Selector */}
      <div className="anim-fade-up anim-d2">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Meal Type</label>
        <div className="flex gap-2">
          {(["breakfast", "lunch", "dinner", "snack"] as const).map((t) => (
            <button key={t} onClick={() => setMealType(t)}
              className={`flex-1 py-3 rounded-xl text-sm font-medium capitalize transition-all flex flex-col items-center gap-1 ${
                mealType === t
                  ? "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-md shadow-brand-500/25 scale-[1.02]"
                  : "glass text-gray-600 hover:bg-white/80"
              }`}>
              <span className="text-lg">{mealIcons[t]}</span>
              <span>{t}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Image Upload Zone */}
      <div className="anim-fade-up anim-d3">
        <label className="block cursor-pointer group">
          <div className={`rounded-2xl overflow-hidden transition-all duration-300 ${
            analyzing
              ? "border-2 border-brand-400 bg-brand-50/50 shadow-lg shadow-brand-500/10"
              : preview
                ? "border-2 border-brand-200 bg-white shadow-sm"
                : "border-2 border-dashed border-gray-200 glass hover:border-brand-400 hover:shadow-md hover:shadow-brand-500/5"
          }`}>
            {analyzing ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-brand-200 border-t-brand-500 animate-spin" />
                  <Utensils className="w-6 h-6 text-brand-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center">
                  <p className="text-brand-700 font-semibold">{analyzeStatus || "Analyzing..."}</p>
                  <div className="mt-3 flex gap-1 justify-center">
                    {[0,1,2,3,4].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            ) : preview ? (
              <div className="relative">
                <Image src={preview} alt="Meal preview" width={600} height={400}
                  className="w-full h-64 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end p-4">
                  <p className="text-white/80 text-sm font-medium">Tap to change photo</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-12 px-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-100 to-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Camera className="w-10 h-10 text-brand-500" />
                </div>
                <div className="text-center">
                  <p className="text-gray-700 font-semibold">Take or upload a meal photo</p>
                  <p className="text-sm text-gray-400 mt-1">Our AI will analyze calories, macros, and vitamins</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Upload className="w-3.5 h-3.5" />
                  <span>JPG, PNG, HEIC supported</span>
                </div>
              </div>
            )}
          </div>
          <input type="file" accept="image/*" capture="environment" onChange={handleImageSelect} className="hidden" disabled={analyzing} />
        </label>
      </div>

      {/* Analysis Buttons */}
      {imageReady && !analyzing && !result && (
        <div className="grid grid-cols-2 gap-3 anim-fade-up">
          <button onClick={analyzeFast}
            className="relative py-5 bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 text-white rounded-2xl font-semibold transition-all hover:shadow-xl hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98] overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite]" />
            <div className="relative flex flex-col items-center gap-1.5">
              <Zap className="w-7 h-7" />
              <span className="text-base">Quick Analysis</span>
              <span className="text-xs opacity-75">Gemini AI ~ 10-20s</span>
            </div>
          </button>
          <button onClick={analyzeFree}
            className="relative py-5 bg-gradient-to-br from-brand-600 via-emerald-600 to-teal-600 text-white rounded-2xl font-semibold transition-all hover:shadow-xl hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite]" />
            <div className="relative flex flex-col items-center gap-1.5">
              <Clock className="w-7 h-7" />
              <span className="text-base">Free Analysis</span>
              <span className="text-xs opacity-75">Local AI ~ 1-3 min</span>
            </div>
          </button>
        </div>
      )}

      {/* Analysis Result */}
      {result && result.analysis && (
        <div className="space-y-4 anim-fade-up">
          {/* AI Guidance Card */}
          {result.ai_guidance && (
            <div className={`rounded-2xl p-5 border transition-all ${
              result.ai_guidance.color === "green" ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200" :
              result.ai_guidance.color === "yellow" ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200" :
              result.ai_guidance.color === "orange" ? "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200" :
              "bg-gradient-to-r from-red-50 to-rose-50 border-red-200"
            }`}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  result.ai_guidance.score >= 6
                    ? "bg-green-100 text-green-600"
                    : "bg-orange-100 text-orange-600"
                }`}>
                  {result.ai_guidance.score >= 6 ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900">Quality Score</p>
                    <span className={`text-lg font-extrabold ${
                      result.ai_guidance.score >= 7 ? "text-green-600" : result.ai_guidance.score >= 5 ? "text-yellow-600" : "text-red-600"
                    }`}>{result.ai_guidance.score}/10</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1 leading-relaxed">{result.ai_guidance.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Plan Alignment */}
          {result.plan_alignment && result.plan_alignment.suggestions.length > 0 && (
            <div className="rounded-2xl p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <p className="font-bold text-blue-900">Plan Alignment</p>
              </div>
              <div className="space-y-1.5">
                {result.plan_alignment.suggestions.map((s: string, i: number) => (
                  <p key={i} className="text-sm text-blue-800 flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">&#8226;</span>{s}
                  </p>
                ))}
              </div>
              {result.plan_alignment.remaining_today && (
                <div className="mt-4 pt-3 border-t border-blue-200/60 grid grid-cols-4 gap-2">
                  {[
                    { l: "Calories", v: result.plan_alignment.remaining_today.calories, u: "kcal" },
                    { l: "Protein", v: result.plan_alignment.remaining_today.protein_g, u: "g" },
                    { l: "Carbs", v: result.plan_alignment.remaining_today.carbs_g, u: "g" },
                    { l: "Fat", v: result.plan_alignment.remaining_today.fat_g, u: "g" },
                  ].map(r => (
                    <div key={r.l} className="text-center">
                      <p className="text-xs text-blue-500">{r.l} left</p>
                      <p className="text-sm font-bold text-blue-800">{Math.round(r.v)}{r.u}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Nutrition Breakdown */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Apple className="w-5 h-5 text-brand-500" />
              Nutrition Breakdown
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: "Calories", value: result.analysis.totals?.calories, unit: "kcal", from: "from-emerald-400", to: "to-green-500" },
                { label: "Protein", value: result.analysis.totals?.protein_g, unit: "g", from: "from-blue-400", to: "to-blue-500" },
                { label: "Carbs", value: result.analysis.totals?.carbs_g, unit: "g", from: "from-amber-400", to: "to-orange-500" },
                { label: "Fat", value: result.analysis.totals?.fat_g, unit: "g", from: "from-rose-400", to: "to-red-500" },
                { label: "Fiber", value: result.analysis.totals?.fiber_g, unit: "g", from: "from-violet-400", to: "to-purple-500" },
              ].map((n) => (
                <div key={n.label} className="text-center p-3 rounded-xl bg-gray-50/80 hover:bg-white transition-colors">
                  <p className={`text-xl font-extrabold bg-gradient-to-br ${n.from} ${n.to} bg-clip-text text-transparent`}>
                    {Math.round(n.value || 0)}
                  </p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">{n.unit}</p>
                  <p className="text-xs text-gray-500 font-medium">{n.label}</p>
                </div>
              ))}
            </div>
            {result.analysis.food_items && result.analysis.food_items.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-3">Detected Items</p>
                <div className="space-y-2">
                  {result.analysis.food_items.map((item: { name: string; quantity_g: number; calories: number }, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50/80 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-100/50 flex items-center justify-center text-brand-600 text-sm font-bold">
                          {i + 1}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-800">{item.name}</span>
                          <span className="text-xs text-gray-400 ml-2">{item.quantity_g}g</span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-600">{item.calories} kcal</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Today's Meals */}
      {logs.length > 0 && (
        <div className="anim-fade-up anim-d4 glass rounded-2xl p-6">
          <h3 className="font-bold text-gray-900 mb-4">Today&apos;s Meals <span className="text-sm font-normal text-gray-400">({logs.length})</span></h3>
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/60 transition-colors group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                  log.mealType === "breakfast" ? "bg-blue-100" :
                  log.mealType === "lunch" ? "bg-green-100" :
                  log.mealType === "dinner" ? "bg-purple-100" : "bg-orange-100"
                }`}>
                  {mealIcons[log.mealType] || "🍽️"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{log.food_name}</p>
                  <p className="text-xs text-gray-400 capitalize">{log.mealType} &middot; {new Date(log.logged_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900">{Math.round(log.analysis?.totals?.calories || 0)}</p>
                  <p className="text-xs text-gray-400">kcal</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
