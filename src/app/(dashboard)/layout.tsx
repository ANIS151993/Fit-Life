"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Home, Camera, BookOpen, Dumbbell, User, LogOut } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/food-log", label: "Log Meal", icon: Camera },
  { href: "/diet-plan", label: "Diet Plan", icon: BookOpen },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/profile", label: "Profile", icon: User },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">&#x1F957;</span>
            <span className="font-bold text-gray-900 text-lg">FitLife</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">
              {user?.displayName || user?.email}
            </span>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* Bottom Navigation (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-10">
        <div className="flex items-center justify-around py-2">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center py-1 px-3 transition-colors ${
                pathname === href ? "text-green-600" : "text-gray-400"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs mt-0.5">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
