"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProfile, updateUserProfile } from "@/lib/firestore";
import { UserProfile } from "@/types";
import toast from "react-hot-toast";
import { User, Save, Loader2 } from "lucide-react";

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
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <User className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-lg">{profile.name || user?.displayName || "User"}</p>
            <p className="text-sm text-gray-500">{profile.email || user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input value={profile.name || ""} onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
            <input type="number" value={profile.age || ""} onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select value={profile.gender || "male"} onChange={(e) => setProfile({ ...profile, gender: e.target.value as UserProfile["gender"] })}
              className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none">
              <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
            <input type="number" value={profile.height_cm || ""} onChange={(e) => setProfile({ ...profile, height_cm: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Weight (kg)</label>
            <input type="number" value={profile.current_weight_kg || ""} onChange={(e) => setProfile({ ...profile, current_weight_kg: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal Weight (kg)</label>
            <input type="number" value={profile.goal_weight_kg || ""} onChange={(e) => setProfile({ ...profile, goal_weight_kg: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activity Level</label>
            <select value={profile.activity_level || "moderate"}
              onChange={(e) => setProfile({ ...profile, activity_level: e.target.value as UserProfile["activity_level"] })}
              className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none">
              <option value="sedentary">Sedentary</option><option value="light">Light</option>
              <option value="moderate">Moderate</option><option value="active">Active</option>
              <option value="very_active">Very Active</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goals</label>
            <input value={profile.goals?.join(", ") || ""} onChange={(e) => setProfile({ ...profile, goals: e.target.value.split(",").map((s) => s.trim()) })}
              className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="e.g. weight loss, muscle gain" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dietary Restrictions</label>
          <input value={profile.dietary_restrictions?.join(", ") || ""}
            onChange={(e) => setProfile({ ...profile, dietary_restrictions: e.target.value.split(",").map((s) => s.trim()) })}
            className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none"
            placeholder="e.g. vegetarian, halal, gluten-free" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Medical Notes</label>
          <textarea value={profile.medical_notes || ""}
            onChange={(e) => setProfile({ ...profile, medical_notes: e.target.value })}
            className="w-full px-3 py-2 border rounded-xl text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none"
            rows={3} placeholder="Any medical conditions or allergies..." />
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</> : <><Save className="w-5 h-5" /> Save Profile</>}
        </button>
      </div>

      <button onClick={logout}
        className="w-full py-3 border-2 border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors">
        Sign Out
      </button>
    </div>
  );
}
