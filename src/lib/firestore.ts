import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  UserProfile,
  FoodLog,
  DietPlan,
  WorkoutPlan,
} from "@/types";

// User Profile
export async function createUserProfile(
  uid: string,
  data: Partial<UserProfile>
) {
  await setDoc(doc(db, "users", uid, "profile", "data"), {
    ...data,
    uid,
    onboarding_complete: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export async function getUserProfile(uid: string) {
  const snap = await getDoc(doc(db, "users", uid, "profile", "data"));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
) {
  await updateDoc(doc(db, "users", uid, "profile", "data"), {
    ...data,
    updated_at: new Date().toISOString(),
  });
}

// Food Logs
export async function logFood(log: FoodLog) {
  const ref = await addDoc(collection(db, "users", log.userId, "food_logs"), {
    ...log,
    logged_at: new Date().toISOString(),
  });
  return ref.id;
}

export async function getTodaysFoodLogs(uid: string) {
  const today = new Date().toISOString().split("T")[0];
  const q = query(
    collection(db, "users", uid, "food_logs"),
    where("date", "==", today),
    orderBy("logged_at", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FoodLog);
}

export function subscribeTodaysFoodLogs(
  uid: string,
  callback: (logs: FoodLog[]) => void
) {
  const today = new Date().toISOString().split("T")[0];
  const q = query(
    collection(db, "users", uid, "food_logs"),
    where("date", "==", today),
    orderBy("logged_at", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FoodLog));
  });
}

// Diet Plans
export async function saveDietPlan(uid: string, plan: DietPlan) {
  const ref = await addDoc(collection(db, "users", uid, "diet_plans"), {
    ...plan,
    generated_at: new Date().toISOString(),
  });
  return ref.id;
}

export async function getLatestDietPlan(uid: string) {
  const q = query(
    collection(db, "users", uid, "diet_plans"),
    orderBy("generated_at", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as DietPlan;
}

// Workout Plans
export async function saveWorkoutPlan(uid: string, plan: WorkoutPlan) {
  const ref = await addDoc(collection(db, "users", uid, "workout_plans"), {
    ...plan,
    generated_at: new Date().toISOString(),
  });
  return ref.id;
}

export async function getLatestWorkoutPlan(uid: string) {
  const q = query(
    collection(db, "users", uid, "workout_plans"),
    orderBy("generated_at", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as WorkoutPlan;
}

// Weekly calorie data
export async function getWeeklyCalories(uid: string) {
  const days: { date: string; calories: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const q = query(
      collection(db, "users", uid, "food_logs"),
      where("date", "==", dateStr)
    );
    const snap = await getDocs(q);
    const total = snap.docs.reduce(
      (sum, doc) => sum + (doc.data().analysis?.totals?.calories || 0),
      0
    );
    days.push({ date: dateStr, calories: total });
  }
  return days;
}
