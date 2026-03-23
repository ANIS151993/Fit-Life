'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { Footer } from '@/components/ui/Footer';
import { Home, Camera, BookOpen, Dumbbell, User, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/food-log', label: 'Log Meal', icon: Camera },
  { href: '/diet-plan', label: 'Diet Plan', icon: BookOpen },
  { href: '/workouts', label: 'Workouts', icon: Dumbbell },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [sideOpen, setSideOpen] = useState(false);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0fdf4]">
      <div className="flex flex-col items-center gap-4 anim-fade-up">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm text-gray-400">Loading FitLife...</p>
      </div>
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f0fdf4]">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col bg-white border-r border-gray-100 z-30">
        <div className="p-6 border-b border-gray-100">
          <Logo size="md" />
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}>
                <Icon className={`w-5 h-5 ${active ? 'text-emerald-600' : ''}`} />
                {label}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {(user.displayName || user.email || 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.displayName || 'User'}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 glass">
        <div className="px-4 py-3 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xs">
              {(user.displayName || user.email || 'U')[0].toUpperCase()}
            </div>
            <button onClick={() => setSideOpen(!sideOpen)} className="p-1.5 text-gray-500">
              {sideOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Side Menu ── */}
      {sideOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSideOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-2xl anim-slide-right">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <Logo size="sm" />
              <button onClick={() => setSideOpen(false)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <nav className="p-4 space-y-1">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link key={href} href={href} onClick={() => setSideOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                      active ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'
                    }`}>
                    <Icon className="w-5 h-5" /> {label}
                  </Link>
                );
              })}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
              <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="md:ml-64 min-h-screen">
        <div className="pt-16 md:pt-0 pb-24 md:pb-6">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
            <div className="anim-fade-up">{children}</div>
          </div>
          <Footer className="md:block hidden" />
        </div>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-gray-200/50">
        <div className="flex items-center justify-around py-2 px-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={`nav-pill flex flex-col items-center py-1.5 px-3 rounded-xl transition-all ${
                  active ? 'nav-pill-active text-emerald-600' : 'text-gray-400'
                }`}>
                <Icon className={`w-5 h-5 ${active ? 'text-emerald-600' : ''}`} />
                <span className="text-[10px] mt-0.5 font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
