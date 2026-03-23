"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProfile, updateUserProfile } from "@/lib/firestore";
import { UserProfile } from "@/types";
import toast from "react-hot-toast";
import { User, Save, Loader2, LogOut, Mail, Ruler, Weight, Target, Activity, Shield, Heart } from "lucide-react";
import { Footer } from "@/components/ui/Footer";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then((p) => {
      if (p) setProfile(p);
      else setProfile({ name: user.displayName || "", email: user.email || "" });
      setLoading(false);
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        ...profile,
        onboarding_complete: true,
      } as Partial<UserProfile>);
      toast.success("Profile saved!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="glass rounded-2xl p-8 flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-brand-200 border-t-brand-500 animate-spin" />
          <p className="text-sm text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="anim-fade-up">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your personal information</p>
      </div>

      {/* Profile Card */}
      <div className="glass rounded-2xl p-6 anim-fade-up anim-d1">
        {/* Avatar Section */}
        <div className="flex items-center gap-5 mb-8 pb-6 border-b border-gray-100">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <span className="text-3xl font-bold text-white">
                {(profile.name || user?.displayName || "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-400 border-2 border-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-xl">{profile.name || user?.displayName || "User"}</p>
            <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5" />
              {profile.email || user?.email}
            </p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
              <User className="w-3.5 h-3.5 text-gray-400" /> Full Name
            </label>
            <input value={profile.name || ""} onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80" />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
              <Heart className="w-3.5 h-3.5 text-gray-400" /> Age
            </label>
            <input type="number" value={profile.age || ""} onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80" />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
              <User className="w-3.5 h-3.5 text-gray-400" /> Gender
            </label>
            <select value={profile.gender || "male"} onChange={(e) => setProfile({ ...profile, gender: e.target.value as UserProfile["gender"] })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80">
              <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
              <Ruler className="w-3.5 h-3.5 text-gray-400" /> Height (cm)
            </label>
            <input type="number" value={profile.height_cm || ""} onChange={(e) => setProfile({ ...profile, height_cm: Number(e.target.value) })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80" />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
              <Weight className="w-3.5 h-3.5 text-gray-400" /> Current Weight (kg)
            </label>
            <input type="number" value={profile.current_weight_kg || ""} onChange={(e) => setProfile({ ...profile, current_weight_kg: Number(e.target.value) })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80" />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
              <Target className="w-3.5 h-3.5 text-gray-400" /> Goal Weight (kg)
            </label>
            <input type="number" value={profile.goal_weight_kg || ""} onChange={(e) => setProfile({ ...profile, goal_weight_kg: Number(e.target.value) })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80" />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
              <Activity className="w-3.5 h-3.5 text-gray-400" /> Activity Level
            </label>
            <select value={profile.activity_level || "moderate"}
              onChange={(e) => setProfile({ ...profile, activity_level: e.target.value as UserProfile["activity_level"] })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80">
              <option value="sedentary">Sedentary</option><option value="light">Light</option>
              <option value="moderate">Moderate</option><option value="active">Active</option>
              <option value="very_active">Very Active</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
              <Target className="w-3.5 h-3.5 text-gray-400" /> Goals
            </label>
            <input value={profile.goals?.join(", ") || ""} onChange={(e) => setProfile({ ...profile, goals: e.target.value.split(",").map((s) => s.trim()) })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80"
              placeholder="e.g. weight loss, muscle gain" />
          </div>
        </div>

        <div className="mt-5">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
            <Shield className="w-3.5 h-3.5 text-gray-400" /> Dietary Restrictions
          </label>
          <input value={profile.dietary_restrictions?.join(", ") || ""}
            onChange={(e) => setProfile({ ...profile, dietary_restrictions: e.target.value.split(",").map((s) => s.trim()) })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80"
            placeholder="e.g. vegetarian, halal, gluten-free" />
        </div>

        <div className="mt-5">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
            <Heart className="w-3.5 h-3.5 text-gray-400" /> Medical Notes
          </label>
          <textarea value={profile.medical_notes || ""}
            onChange={(e) => setProfile({ ...profile, medical_notes: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all bg-white/80 resize-none"
            rows={3} placeholder="Any medical conditions or allergies..." />
        </div>

        {/* Save Button */}
        <button onClick={handleSave} disabled={saving}
          className="w-full mt-6 py-3.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-brand-500/25 disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]">
          {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</> : <><Save className="w-5 h-5" /> Save Profile</>}
        </button>
      </div>

      {/* Sign Out */}
      <button onClick={logout}
        className="w-full py-3.5 glass rounded-xl font-semibold text-red-500 hover:bg-red-50/50 transition-all flex items-center justify-center gap-2 anim-fade-up anim-d2">
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>

      <Footer />
    </div>
  );
}
