'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  Users,
  Cloud,
  Globe,
  ChevronDown,
  Headphones,
  Check,
  ArrowLeft,
  LogIn,
} from 'lucide-react';
import {
  createTrustedDevice,
  login,
  resendLoginOtp,
  verifyLoginOtp,
} from '@bcl/auth-client';
import { API_BASE } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import './login.css';

type Step = 'credentials' | 'otp' | 'trust';

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

function OtpInputs({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  const setDigit = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, '');
    if (!cleaned) {
      const next = digits.map((d, i) => (i === index ? '' : d)).join('');
      onChange(next);
      return;
    }
    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, 6).split('');
      const next = Array.from({ length: 6 }, (_, i) => pasted[i] || '');
      onChange(next.join(''));
      const focusAt = Math.min(pasted.length, 5);
      refs.current[focusAt]?.focus();
      return;
    }
    const next = digits.map((d, i) => (i === index ? cleaned : d)).join('');
    onChange(next);
    if (index < 5) refs.current[index + 1]?.focus();
  };

  return (
    <div className="login-otp-row" role="group" aria-label="One-time password">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="login-otp-cell"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          autoFocus={i === 0}
          maxLength={6}
          value={d}
          disabled={disabled}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i] && i > 0) {
              refs.current[i - 1]?.focus();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            setDigit(i, e.clipboardData.getData('text'));
          }}
        />
      ))}
    </div>
  );
}

function formatCountdown(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [emailMasked, setEmailMasked] = useState('');
  const [expiresIn, setExpiresIn] = useState(300);
  const [resendIn, setResendIn] = useState(0);
  const [trustDevice, setTrustDevice] = useState(true);
  const [trustDays, setTrustDays] = useState(30);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (step !== 'otp' || expiresIn <= 0) return;
    const t = setInterval(() => setExpiresIn((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [step, expiresIn]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const goDashboard = useCallback(() => {
    router.push('/diocese');
  }, [router]);

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await login(API_BASE, { email, password });
      if (result.status === 'otp_required') {
        setChallengeToken(result.challengeToken);
        setEmailMasked(result.emailMasked);
        setExpiresIn(result.expiresIn || 300);
        setResendIn(result.resendAvailableIn || 60);
        setOtp('');
        setStep('otp');
        return;
      }
      setUser(result.user);
      goDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await verifyLoginOtp(API_BASE, {
        challengeToken,
        otp,
        trustDevice: false,
      });
      if (result.status !== 'authenticated') return;
      setUser(result.user);
      setTrustDays(result.trustDurationDays || 30);
      setTrustDevice(true);
      setStep('trust');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (resendIn > 0 || !challengeToken) return;
    setLoading(true);
    setError('');
    try {
      const data = await resendLoginOtp(API_BASE, challengeToken);
      setChallengeToken(data.challengeToken);
      setEmailMasked(data.emailMasked);
      setExpiresIn(data.expiresIn || 300);
      setResendIn(data.resendAvailableIn || 60);
      setOtp('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend code');
    } finally {
      setLoading(false);
    }
  }

  async function onContinueTrusted() {
    setLoading(true);
    setError('');
    try {
      if (trustDevice) {
        await createTrustedDevice(API_BASE);
      }
      goDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save trusted device');
      // Still allow dashboard if trust fails
      goDashboard();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell">
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

        <section className="login-panel">
          <div className="login-panel-top">
            <button type="button" className="login-lang" aria-label="Language">
              <Globe size={15} strokeWidth={1.75} />
              English
              <ChevronDown size={14} strokeWidth={1.75} />
            </button>
          </div>

          {step === 'credentials' ? (
            <>
              <div className="login-welcome">
                <div className="login-lock" aria-hidden>
                  <Shield size={26} strokeWidth={1.75} />
                  <span className="badge">
                    <Check size={10} strokeWidth={3} />
                  </span>
                </div>
                <h2>Welcome Back!</h2>
                <p>Enter your credentials to continue.</p>
              </div>

              <form className="login-form" onSubmit={onSignIn}>
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
                      {showPassword ? (
                        <EyeOff size={18} strokeWidth={1.75} />
                      ) : (
                        <Eye size={18} strokeWidth={1.75} />
                      )}
                    </button>
                  </div>
                </div>

                {error ? <p className="login-error">{error}</p> : null}

                <button type="submit" className="login-submit" disabled={loading}>
                  {loading ? (
                    'Signing in…'
                  ) : (
                    <>
                      <LogIn size={17} strokeWidth={2} />
                      Sign In
                    </>
                  )}
                </button>

                <p className="login-hint">
                  <Shield size={13} strokeWidth={2} />
                  Secure login · OTP required on new devices
                </p>
              </form>
            </>
          ) : null}

          {step === 'otp' ? (
            <>
              <div className="login-welcome">
                <div className="login-lock" aria-hidden>
                  <ShieldCheck size={26} strokeWidth={1.75} />
                  <span className="badge">
                    <Check size={10} strokeWidth={3} />
                  </span>
                </div>
                <h2>Verify Your Identity</h2>
                <p>
                  We&apos;ve sent a 6-digit verification code to{' '}
                  <strong>{emailMasked || 'your email'}</strong>
                </p>
              </div>

              <form className="login-form" onSubmit={onVerifyOtp}>
                <OtpInputs value={otp} onChange={setOtp} disabled={loading} />
                <p className="login-otp-expiry">
                  Code expires in <strong>{formatCountdown(expiresIn)}</strong>
                </p>

                {error ? <p className="login-error">{error}</p> : null}

                <button
                  type="submit"
                  className="login-submit"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? (
                    'Verifying…'
                  ) : (
                    <>
                      <ShieldCheck size={18} strokeWidth={2} />
                      Verify &amp; Continue
                    </>
                  )}
                </button>

                <div className="login-resend">
                  <span>Didn&apos;t receive the code?</span>
                  <button
                    type="button"
                    onClick={onResend}
                    disabled={loading || resendIn > 0}
                  >
                    {resendIn > 0 ? `Resend OTP (${resendIn}s)` : 'Resend OTP'}
                  </button>
                </div>

                <button
                  type="button"
                  className="login-back"
                  onClick={() => {
                    setStep('credentials');
                    setOtp('');
                    setError('');
                    setChallengeToken('');
                  }}
                >
                  <ArrowLeft size={14} /> Back to Login
                </button>
              </form>
            </>
          ) : null}

          {step === 'trust' ? (
            <>
              <div className="login-welcome">
                <div className="login-lock" aria-hidden>
                  <Check size={26} strokeWidth={2} />
                  <span className="badge">
                    <Check size={10} strokeWidth={3} />
                  </span>
                </div>
                <h2>Device Verified ✓</h2>
                <p>Do you want to trust this device?</p>
              </div>

              <div className="login-trust-card">
                <label className="login-trust-check">
                  <input
                    type="checkbox"
                    checked={trustDevice}
                    onChange={(e) => setTrustDevice(e.target.checked)}
                  />
                  <span>
                    Don&apos;t ask for OTP on this device for the next {trustDays} days
                  </span>
                </label>
                <p className="login-trust-note">
                  {trustDevice
                    ? `You won't be asked for an OTP on this device for ${trustDays} days.`
                    : 'OTP verification is required again on the next login.'}
                </p>
              </div>

              {error ? <p className="login-error">{error}</p> : null}

              <button
                type="button"
                className="login-submit"
                disabled={loading}
                onClick={onContinueTrusted}
              >
                {loading ? 'Continuing…' : 'Continue to Dashboard'}
              </button>
            </>
          ) : null}

          {step === 'credentials' ? (
            <>
              <div className="login-or">OR</div>
              <div className="login-why">
                <Shield size={20} strokeWidth={1.75} />
                <div>
                  <strong>Trusted devices</strong>
                  <p>
                    New devices need a one-time email code. Devices you trust skip OTP for{' '}
                    {trustDays} days.
                  </p>
                </div>
              </div>

              <div className="login-features">
                <div className="login-feature">
                  <div className="icon">
                    <ShieldCheck size={18} strokeWidth={1.75} />
                  </div>
                  <strong>Secure</strong>
                  <span>Email OTP on unrecognized devices</span>
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
            </>
          ) : null}

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
