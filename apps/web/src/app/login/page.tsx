'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Send,
  Shield,
  ShieldCheck,
  Users,
  Cloud,
  Globe,
  ChevronDown,
  Headphones,
  Check,
} from 'lucide-react';
import { login } from '@bcl/auth-client';
import { API_BASE } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import './login.css';

function Crest() {
  return (
    <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden>
      <path
        d="M24 4L40 10V22C40 32 32 40 24 44C16 40 8 32 8 22V10L24 4Z"
        fill="var(--bcl-primary)"
        stroke="#fff"
        strokeWidth="1.5"
      />
      <path d="M24 14V34M16 22H32" stroke="var(--bcl-accent)" strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="M24 18C26 16 29 17 29 20C29 23 24 26 24 26C24 26 19 23 19 20C19 17 22 16 24 18Z"
        fill="#fff"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState('admin@basecodelabs.com');
  const [password, setPassword] = useState('Admin@12345');
  const [totpCode, setTotpCode] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await login(API_BASE, {
        email,
        password,
        totpCode: totpCode || undefined,
      });
      if (result.requires2fa) {
        setNeeds2fa(true);
        return;
      }
      setUser(result.user);
      router.push('/diocese');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        {/* Left branding panel */}
        <aside className="login-hero" aria-label="BCL Diocese branding">
          <div className="login-brand">
            <div className="login-crest">
              <Crest />
            </div>
            <div className="login-brand-text">
              <strong>BCL</strong>
              <span>DIOCESE ERP</span>
            </div>
          </div>
          <p className="login-motto">Faith. Unity. Service.</p>

          <div className="login-hero-copy">
            <h1>Empowering Dioceses. Strengthening Communities.</h1>
            <div className="login-hero-rule" />
            <p>
              A complete digital solution to manage parishes, people, sacraments, ministries and more
              – in one unified platform.
            </p>

            <div className="login-quote">
              <span className="mark" aria-hidden>
                “
              </span>
              <p>Serve the Lord with gladness. — Psalm 100:2</p>
            </div>
          </div>
        </aside>

        {/* Right form panel */}
        <section className="login-panel">
          <div className="login-panel-top">
            <button type="button" className="login-lang" aria-label="Language">
              <Globe size={15} strokeWidth={1.75} />
              English
              <ChevronDown size={14} strokeWidth={1.75} />
            </button>
          </div>

          <div className="login-welcome">
            <div className="login-lock" aria-hidden>
              <Shield size={26} strokeWidth={1.75} />
              <span className="badge">
                <Check size={10} strokeWidth={3} />
              </span>
            </div>
            <h2>Welcome Back!</h2>
            <p>
              {needs2fa
                ? 'Enter the 6-digit authenticator / OTP code to complete secure sign-in.'
                : 'Enter your credentials. For accounts with 2FA, we will ask for a 6-digit OTP next.'}
            </p>
          </div>

          <form className="login-form" onSubmit={onSubmit}>
            <div className="login-field">
              <label htmlFor="email">Email Address</label>
              <div className="login-input">
                <Mail size={18} strokeWidth={1.75} />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <div className="login-input">
                <Lock size={18} strokeWidth={1.75} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
                </button>
              </div>
            </div>

            {needs2fa ? (
              <div className="login-field">
                <label htmlFor="totp">OTP / Authenticator Code</label>
                <div className="login-input">
                  <ShieldCheck size={18} strokeWidth={1.75} />
                  <input
                    id="totp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Enter 6-digit OTP"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    maxLength={6}
                  />
                </div>
              </div>
            ) : null}

            {error ? <p className="login-error">{error}</p> : null}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? (
                needs2fa ? 'Verifying…' : 'Sending…'
              ) : needs2fa ? (
                <>
                  <ShieldCheck size={18} strokeWidth={2} />
                  Verify OTP
                </>
              ) : (
                <>
                  <Send size={17} strokeWidth={2} />
                  Send OTP
                </>
              )}
            </button>

            <p className="login-hint">
              <Shield size={13} strokeWidth={2} />
              {needs2fa
                ? 'Enter the 6-digit code from your authenticator app'
                : 'We will send a 6-digit OTP to your email'}
            </p>
          </form>

          <div className="login-or">OR</div>

          <div className="login-why">
            <Shield size={20} strokeWidth={1.75} />
            <div>
              <strong>Why OTP?</strong>
              <p>
                One-Time Password verification adds an extra layer of security to protect sensitive
                diocese and parish data.
              </p>
            </div>
          </div>

          <div className="login-features">
            <div className="login-feature">
              <div className="icon">
                <ShieldCheck size={18} strokeWidth={1.75} />
              </div>
              <strong>Secure</strong>
              <span>OTP verification for extra security</span>
            </div>
            <div className="login-feature">
              <div className="icon">
                <Users size={18} strokeWidth={1.75} />
              </div>
              <strong>Role Based</strong>
              <span>Access based on your permissions</span>
            </div>
            <div className="login-feature">
              <div className="icon">
                <Cloud size={18} strokeWidth={1.75} />
              </div>
              <strong>Anywhere</strong>
              <span>Access your diocese data from anywhere</span>
            </div>
          </div>

          <div className="login-help">
            <Headphones size={16} strokeWidth={1.75} />
            Need help? Contact your Diocese Administrator.
          </div>
        </section>
      </div>

      <p className="login-copy">© 2026 BaseCode Labs Pvt. Ltd. All rights reserved.</p>
    </div>
  );
}
