"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeTodaysFoodLogs,
  getUserProfile,
  getWeeklyCalories,
} from "@/lib/firestore";
import { FoodLog, UserProfile } from "@/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";
import Link from "next/link";
import { Camera, BookOpen, Dumbbell } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [weeklyData, setWeeklyData] = useState<
    { date: string; calories: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then((p) => {
      setProfile(p);
      setLoading(false);
    });
    getWeeklyCalories(user.uid).then(setWeeklyData);
    const unsub = subscribeTodaysFoodLogs(user.uid, setLogs);
    return unsub;
  }, [user]);

  const todayCalories = logs.reduce(
    (s, l) => s + (l.analysis?.totals?.calories || 0),
    0
  );
  const todayProtein = logs.reduce(
    (s, l) => s + (l.analysis?.totals?.protein_g || 0),
    0
  );
  const todayCarbs = logs.reduce(
    (s, l) => s + (l.analysis?.totals?.carbs_g || 0),
    0
  );
  const todayFat = logs.reduce(
    (s, l) => s + (l.analysis?.totals?.fat_g || 0),
    0
  );

  const calorieTarget = 2000;
  const caloriePercent = Math.min((todayCalories / calorieTarget) * 100, 100);

  const chartData = [
    { name: "Calories", value: caloriePercent, fill: "#16a34a" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good{" "}
          {new Date().getHours() < 12
            ? "morning"
            : new Date().getHours() < 17
              ? "afternoon"
              : "evening"}
          ,{" "}
          {profile?.name?.split(" ")[0] ||
            user?.displayName?.split(" ")[0] ||
            "there"}
        </h1>
        <p className="text-gray-500">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Calorie Ring + Macros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Calorie Ring */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">
            Today&apos;s Calories
          </h2>
          <div className="flex items-center gap-6">
            <div className="h-32 w-32 relative flex-shrink-0">
              <RadialBarChart
                width={128}
                height={128}
                innerRadius={40}
                outerRadius={60}
                data={chartData}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar dataKey="value" cornerRadius={8} />
              </RadialBarChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">
                  {Math.round(todayCalories)}
                </span>
                <span className="text-xs text-gray-400">kcal</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-500">
                Target: {calorieTarget} kcal
              </div>
              <div className="text-sm text-gray-500">
                Remaining:{" "}
                {Math.max(0, calorieTarget - Math.round(todayCalories))} kcal
              </div>
              <div className="mt-2 h-2 bg-gray-100 rounded-full">
                <div
                  className="h-2 bg-green-500 rounded-full transition-all"
                  style={{ width: `${caloriePercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Macros */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Macros Today</h2>
          <div className="space-y-3">
            {[
              {
                label: "Protein",
                value: todayProtein,
                target: 150,
                color: "bg-blue-500",
                unit: "g",
              },
              {
                label: "Carbs",
                value: todayCarbs,
                target: 200,
                color: "bg-orange-400",
                unit: "g",
              },
              {
                label: "Fat",
                value: todayFat,
                target: 65,
                color: "bg-yellow-400",
                unit: "g",
              },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{m.label}</span>
                  <span className="font-medium">
                    {Math.round(m.value)}
                    {m.unit} / {m.target}
                    {m.unit}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div
                    className={`h-2 ${m.color} rounded-full transition-all`}
                    style={{
                      width: `${Math.min((m.value / m.target) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          href="/food-log"
          className="bg-green-500 text-white rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
        >
          <Camera className="w-6 h-6" />
          <span className="text-sm font-medium">Log Meal</span>
        </Link>
        <Link
          href="/diet-plan"
          className="bg-blue-500 text-white rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
        >
          <BookOpen className="w-6 h-6" />
          <span className="text-sm font-medium">Diet Plan</span>
        </Link>
        <Link
          href="/workouts"
          className="bg-purple-500 text-white rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
        >
          <Dumbbell className="w-6 h-6" />
          <span className="text-sm font-medium">Workout</span>
        </Link>
      </div>

      {/* Today's Meals */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-4">
          Today&apos;s Meals
        </h2>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Camera className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No meals logged today</p>
            <Link
              href="/food-log"
              className="text-green-600 text-sm mt-1 block hover:underline"
            >
              Log your first meal
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
              >
                <div
                  className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    log.mealType === "breakfast"
                      ? "bg-blue-400"
                      : log.mealType === "lunch"
                        ? "bg-green-400"
                        : log.mealType === "dinner"
                          ? "bg-purple-400"
                          : "bg-orange-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 capitalize truncate">
                    {log.food_name || log.mealType}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">
                    {log.mealType}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-gray-900">
                    {Math.round(log.analysis?.totals?.calories || 0)} kcal
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(log.logged_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly Chart */}
      {weeklyData.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Weekly Calories</h2>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={weeklyData}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(d) => d.slice(5)}
              />
              <YAxis hide />
              <Tooltip
                formatter={(v) => [`${Math.round(Number(v))} kcal`, "Calories"]}
              />
              <Line
                type="monotone"
                dataKey="calories"
                stroke="#16a34a"
                strokeWidth={2}
                dot={{ fill: "#16a34a", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
