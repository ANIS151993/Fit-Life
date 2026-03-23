'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { Footer } from '@/components/ui/Footer';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try { await register(email, password, name); toast.success('Account created!'); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 text-center max-w-md">
          <div className="text-5xl font-extrabold text-white mb-6 tracking-tight">
            <span className="text-emerald-200">Fit</span>Life
          </div>
          <p className="text-emerald-100 text-lg leading-relaxed mb-8">
            Start your transformation today. AI-powered nutrition and fitness coaching — completely free.
          </p>
          <div className="space-y-3 text-left">
            {['Instant meal photo analysis', 'Personalized 7-day diet plans', 'Custom workout programs', 'Track calories & macros'].map(f => (
              <div key={f} className="flex items-center gap-3 text-emerald-100">
                <div className="w-6 h-6 rounded-full bg-emerald-400/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md anim-fade-up">
            <div className="text-center mb-8 lg:hidden">
              <Logo size="lg" link={false} />
            </div>
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
                <p className="text-gray-500 mt-1 text-sm">Join FitLife — it&apos;s completely free</p>
              </div>

              <button onClick={loginWithGoogle}
                className="w-full py-3 px-4 bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center gap-3 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all font-medium text-gray-700 mb-6 card-hover">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center text-sm"><span className="px-3 bg-white text-gray-400">or sign up with email</span></div>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none input-enhanced text-gray-900" placeholder="Your full name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none input-enhanced text-gray-900" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none input-enhanced pr-12 text-gray-900" placeholder="At least 6 characters" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 bg-emerald-600 text-white rounded-2xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200/50 hover:shadow-xl hover:shadow-emerald-200/50">
                  {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating account...</> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              <p className="text-center text-gray-500 mt-6 text-sm">
                Already have an account?{' '}<Link href="/login" className="text-emerald-600 font-semibold hover:text-emerald-500 transition-colors">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}
