import Link from "next/link";
import { Camera, Sparkles, BarChart3, Dumbbell, Salad, ArrowRight, Star, Shield, Zap } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Footer } from "@/components/ui/Footer";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50 overflow-hidden">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size="md" link={false} />
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-emerald-700 transition-colors">Sign In</Link>
            <Link href="/register" className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="anim-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100/80 text-emerald-700 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
              <Sparkles className="w-4 h-4" /> Powered by AI
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6">
              <span className="gradient-text-hero">Your Personal</span>
              <br />
              <span className="text-gray-900">AI Nutrition Coach</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
              Snap a photo of any meal for instant nutrition analysis. Get personalized diet plans and workout guides — all powered by artificial intelligence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-semibold text-lg hover:bg-emerald-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                Start Free <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-700 rounded-2xl font-semibold text-lg border-2 border-gray-200 hover:border-emerald-300 hover:text-emerald-700 transition-all">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-8 bg-white/60 backdrop-blur-sm border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-8 text-center anim-fade-up anim-d2">
          {[
            { val: "AI", sub: "Powered Analysis" },
            { val: "24/7", sub: "Always Available" },
            { val: "$0", sub: "Free to Use" },
          ].map((s) => (
            <div key={s.sub}>
              <p className="text-2xl md:text-3xl font-extrabold gradient-text">{s.val}</p>
              <p className="text-xs md:text-sm text-gray-400 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 anim-fade-up anim-d2">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Everything You Need</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Three powerful features to transform your health journey, all in one app.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Camera, title: "Meal Analysis", desc: "Snap a photo and get instant calories, macros, vitamins, and a health score powered by AI.", color: "from-emerald-500 to-teal-500", delay: "anim-d3" },
              { icon: Salad, title: "AI Diet Plans", desc: "Personalized 7-day meal plans crafted by AI based on your goals, preferences, and body metrics.", color: "from-blue-500 to-indigo-500", delay: "anim-d4" },
              { icon: Dumbbell, title: "Workout Programs", desc: "Custom exercise routines with sets, reps, form tips, and progression — tailored to your level.", color: "from-purple-500 to-pink-500", delay: "anim-d5" },
            ].map((f) => (
              <div key={f.title} className={`anim-fade-up ${f.delay} card-hover bg-white rounded-3xl p-8 border border-gray-100 shadow-sm`}>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 shadow-lg`}>
                  <f.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-6 bg-gradient-to-b from-white to-emerald-50/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14 anim-fade-up">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-gray-500">Three simple steps to better nutrition.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Snap or Upload", desc: "Take a photo of your meal or upload from gallery.", icon: Camera },
              { step: "02", title: "AI Analyzes", desc: "Our AI identifies foods and calculates nutrition instantly.", icon: Sparkles },
              { step: "03", title: "Track & Improve", desc: "Log meals, follow your diet plan, and hit your goals.", icon: BarChart3 },
            ].map((s, i) => (
              <div key={s.step} className={`anim-fade-up anim-d${i + 3} text-center`}>
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
                  <s.icon className="w-7 h-7" />
                </div>
                <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2">Step {s.step}</p>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why FitLife ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 anim-fade-up">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why FitLife?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 anim-fade-up anim-d3">
            {[
              { icon: Zap, title: "Instant Results", desc: "Get nutrition data in seconds, not minutes. Our AI works fast." },
              { icon: Shield, title: "Privacy First", desc: "Your data stays yours. Secure Firebase infrastructure." },
              { icon: Star, title: "Completely Free", desc: "No subscriptions. No hidden fees. AI-powered health for everyone." },
            ].map((f) => (
              <div key={f.title} className="flex gap-4 items-start p-5 bg-white rounded-2xl border border-gray-100 shadow-sm card-hover">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center anim-fade-up">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 relative z-10">Start Your Health Journey</h2>
            <p className="text-emerald-100 mb-8 relative z-10">Join FitLife today and let AI guide your nutrition and fitness.</p>
            <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-emerald-700 rounded-2xl font-bold text-lg hover:bg-emerald-50 transition-all shadow-lg relative z-10">
              Get Started Free <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Logo size="sm" link={false} />
            <div className="flex gap-6 text-sm text-gray-500">
              <Link href="/login" className="hover:text-emerald-600 transition-colors">Sign In</Link>
              <Link href="/register" className="hover:text-emerald-600 transition-colors">Get Started</Link>
              <a href="https://marcbd.site" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 transition-colors">Portfolio</a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-100 text-center text-sm text-gray-400">
            <p>
              &copy; {new Date().getFullYear()}{" "}
              <a href="https://marcbd.site" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-600 hover:text-emerald-500 transition-colors">
                Md Anisur Rahman Chowdhury
              </a>
              , Gannon University. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
