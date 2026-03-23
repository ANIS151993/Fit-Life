'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeTodaysFoodLogs, getUserProfile, getWeeklyCalories } from '@/lib/firestore';
import { FoodLog, UserProfile } from '@/types';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import Link from 'next/link';
import { Camera, BookOpen, Dumbbell, TrendingUp, Droplets, Flame } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [weeklyData, setWeeklyData] = useState<{ date: string; calories: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then(p => { setProfile(p); setLoading(false); });
    getWeeklyCalories(user.uid).then(setWeeklyData);
    const unsub = subscribeTodaysFoodLogs(user.uid, setLogs);
    return unsub;
  }, [user]);

  const todayCalories = logs.reduce((s, l) => s + (l.analysis?.totals?.calories || 0), 0);
  const todayProtein  = logs.reduce((s, l) => s + (l.analysis?.totals?.protein_g || 0), 0);
  const todayCarbs    = logs.reduce((s, l) => s + (l.analysis?.totals?.carbs_g || 0), 0);
  const todayFat      = logs.reduce((s, l) => s + (l.analysis?.totals?.fat_g || 0), 0);
  const calorieTarget = ((profile as unknown as Record<string, unknown>)?.daily_calorie_target as number) || 2000;

  const greetName = profile?.name?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="skeleton h-32 w-full" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Greeting ── */}
      <div className="anim-fade-up">
        <h1 className="text-2xl font-bold text-gray-900">{greeting}, {greetName}</h1>
        <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* ── Calorie Ring + Macros ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 card-hover anim-fade-up anim-d1">
          <h2 className="font-semibold text-gray-900 mb-4 text-sm uppercase tracking-wider text-gray-500">Today&apos;s Calories</h2>
          <div className="flex items-center gap-6">
            <ProgressRing value={todayCalories} max={calorieTarget} size={130} strokeWidth={10}
              colorFrom={todayCalories > calorieTarget ? "#f43f5e" : "#059669"}
              colorTo={todayCalories > calorieTarget ? "#fb7185" : "#34d399"}
              label={String(Math.round(todayCalories))} sublabel="kcal" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1.5"><Flame className="w-4 h-4 text-emerald-500" /> Target</span>
                <span className="font-semibold text-gray-900">{calorieTarget} kcal</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-blue-500" /> Consumed</span>
                <span className="font-semibold text-gray-900">{Math.round(todayCalories)} kcal</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1.5"><Droplets className="w-4 h-4 text-cyan-500" /> Remaining</span>
                <span className={`font-semibold ${todayCalories > calorieTarget ? 'text-red-500' : 'text-emerald-600'}`}>
                  {Math.max(0, calorieTarget - Math.round(todayCalories))} kcal
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 card-hover anim-fade-up anim-d2">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-gray-500 mb-4">Macros Today</h2>
          <div className="space-y-4">
            {[
              { label: 'Protein', value: todayProtein, target: 150, color: 'bg-blue-500', bg: 'bg-blue-100', unit: 'g' },
              { label: 'Carbs',   value: todayCarbs,   target: 200, color: 'bg-amber-500', bg: 'bg-amber-100', unit: 'g' },
              { label: 'Fat',     value: todayFat,     target: 65,  color: 'bg-rose-500', bg: 'bg-rose-100', unit: 'g' },
            ].map(m => (
              <div key={m.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-gray-700">{m.label}</span>
                  <span className="text-gray-500">{Math.round(m.value)}{m.unit} <span className="text-gray-300">/</span> {m.target}{m.unit}</span>
                </div>
                <div className={`h-2.5 ${m.bg} rounded-full overflow-hidden`}>
                  <div className={`h-full ${m.color} rounded-full transition-all duration-700 ease-out`}
                    style={{ width: `${Math.min((m.value / m.target) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-3 gap-3 anim-fade-up anim-d3">
        {[
          { href: '/food-log', icon: Camera, label: 'Log Meal', from: 'from-emerald-500', to: 'to-teal-500' },
          { href: '/diet-plan', icon: BookOpen, label: 'Diet Plan', from: 'from-blue-500', to: 'to-indigo-500' },
          { href: '/workouts', icon: Dumbbell, label: 'Workout', from: 'from-purple-500', to: 'to-pink-500' },
        ].map(a => (
          <Link key={a.href} href={a.href}
            className={`bg-gradient-to-br ${a.from} ${a.to} text-white rounded-2xl p-4 flex flex-col items-center gap-2 shadow-lg card-hover`}>
            <a.icon className="w-6 h-6" />
            <span className="text-sm font-semibold">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* ── Today's Meals ── */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 anim-fade-up anim-d4">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-gray-500 mb-4">Today&apos;s Meals</h2>
        {logs.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Camera className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-400 text-sm mb-2">No meals logged today</p>
            <Link href="/food-log" className="text-emerald-600 text-sm font-semibold hover:text-emerald-500">Log your first meal &rarr;</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  log.mealType === 'breakfast' ? 'bg-blue-400' :
                  log.mealType === 'lunch' ? 'bg-emerald-400' :
                  log.mealType === 'dinner' ? 'bg-purple-400' : 'bg-amber-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate text-sm">{log.food_name}</p>
                  <p className="text-xs text-gray-400 capitalize">{log.mealType}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-gray-900 text-sm">{Math.round(log.analysis?.totals?.calories || 0)} kcal</p>
                  <p className="text-xs text-gray-400">{new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Weekly Chart ── */}
      {weeklyData.length > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 anim-fade-up anim-d5">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-gray-500 mb-4">Weekly Trend</h2>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.08)', fontSize: 13 }}
                formatter={(v: unknown) => [`${Math.round(Number(v))} kcal`, 'Calories']} />
              <Area type="monotone" dataKey="calories" stroke="#10b981" strokeWidth={2.5} fill="url(#calGrad)" dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: '#fff' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
