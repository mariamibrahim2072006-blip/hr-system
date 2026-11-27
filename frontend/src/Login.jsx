import React, { useState } from 'react';
import { ShieldCheck, UserRound, Eye, EyeOff, ArrowRight, Building2 } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || (window.location.hostname === 'hr-system-frontend-pi.vercel.app' ? 'https://hr-system-backend-eight.vercel.app' : window.location.origin)).replace(/\/api\/?$|\/$/, '');

const css = `
.auth {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 28px 16px;
    background:
        radial-gradient(800px 420px at 88% -8%, rgba(59, 130, 246, 0.25), transparent 60%),
        linear-gradient(160deg, #081a33 0%, #0b2447 60%, #10315e 100%);
    font-family: var(--font);
    direction: rtl;
}
.auth-card {
    width: 100%;
    max-width: 430px;
    background: #fff;
    border-radius: 20px;
    padding: 34px 30px 26px;
    box-shadow: 0 24px 60px rgba(2, 8, 23, 0.4);
}
.auth-head { text-align: center; margin-bottom: 24px; }
.auth-badge {
    width: 54px; height: 54px; border-radius: 15px; margin: 0 auto 12px;
    display: flex; align-items: center; justify-content: center;
}
.auth-badge.blue { background: #eff6ff; color: #1d4ed8; }
.auth-badge.green { background: #ecfdf5; color: #047857; }
.auth-title { margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; }
.auth-sub { margin: 6px 0 0; font-size: 12px; color: #64748b; font-weight: 600; line-height: 1.7; }
.auth-error {
    background: #fee2e2; color: #991b1b; border: 1px solid #fecaca;
    border-radius: 10px; padding: 10px 13px; font-size: 12px; font-weight: 700;
    margin-bottom: 16px; line-height: 1.7;
}
.auth-pass-wrap { position: relative; }
.auth-pass-toggle {
    position: absolute; inset-inline-end: 8px; top: 50%; transform: translateY(-50%);
    border: none; background: transparent; color: #94a3b8; cursor: pointer;
    display: flex; align-items: center; padding: 6px;
}
.auth-hint {
    margin-top: 14px; text-align: center; color: #64748b; font-size: 12px;
    background: #f8fafc; border: 1px solid #eef2f7; border-radius: 10px; padding: 9px 12px;
    direction: ltr; font-weight: 600;
}
.auth-links { margin-top: 18px; display: flex; flex-direction: column; gap: 8px; align-items: center; }
.auth-link {
    border: none; background: transparent; color: #2563eb; cursor: pointer;
    font-size: 13px; font-weight: 800; font-family: var(--font);
}
.auth-link.muted { color: #64748b; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; }
.auth-foot { text-align: center; margin-top: 20px; color: #94a3b8; font-size: 11px; font-weight: 600; }
.auth-brand { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 18px; color: #1e293b; font-weight: 900; font-size: 13px; letter-spacing: 0.6px; }
`;

export default function Login({ onLogin, portal = 'employee', onBack }) {
    const [mode, setMode] = useState('login');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const isAdmin = portal === 'admin';

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        const cleanEmail = email.trim();

        if (!cleanEmail) {
            setError('من فضلك أدخل البريد الإلكتروني.');
            return;
        }

        if (mode === 'signup' && !fullName.trim()) {
            setError('من فضلك أدخل الاسم.');
            return;
        }

        if (!password) {
            setError('من فضلك أدخل كلمة المرور.');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            setError('من فضلك أدخل بريدًا إلكترونيًا صحيحًا.');
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(`${API_URL}${mode === 'signup' ? '/api/register' : '/api/login'}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: cleanEmail,
                    password,
                    name: fullName.trim()
                })
            });

            let data = {};
            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (response.ok && data.success && data.user && data.token) {
                if (portal === 'admin' && data.user.role === 'employee') {
                    setError('هذا الحساب حساب موظف. استخدم زر دخول الموظفين من الصفحة الرئيسية.');
                    return;
                }
                localStorage.setItem('hr_token', data.token);
                localStorage.setItem('hr_user', JSON.stringify(data.user));
                onLogin(data.user);
                return;
            }

            if (response.status === 401) {
                setError(data.message || 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
                return;
            }

            if (response.status === 403) {
                setError(data.message || 'ليس لديك صلاحية للدخول إلى النظام.');
                return;
            }

            if (response.status >= 500) {
                setError('حدث خطأ في الخادم. حاول مرة أخرى.');
                return;
            }

            setError(data.message || 'تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.');
        } catch (err) {
            console.error('Login error:', err);
            setError('تعذر الاتصال بالخادم. تأكد من تشغيل الـ Backend ثم حاول مرة أخرى.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth">
            <style>{css}</style>
            <div className="auth-card">
                <div className="auth-brand">
                    <Building2 size={17} />
                    PIONEERS HRMS
                </div>

                <div className="auth-head">
                    <div className={`auth-badge ${isAdmin ? 'blue' : 'green'}`}>
                        {isAdmin ? <ShieldCheck size={26} strokeWidth={2.1} /> : <UserRound size={26} strokeWidth={2.1} />}
                    </div>
                    <h1 className="auth-title">
                        {isAdmin ? 'دخول الإدارة' : mode === 'signup' ? 'إنشاء حساب موظف' : 'بوابة الموظفين'}
                    </h1>
                    <p className="auth-sub">
                        {isAdmin
                            ? 'Management sign in - حسابات المديرين والموارد البشرية فقط'
                            : mode === 'signup'
                                ? 'Employee sign up - أنشئ حسابك لمتابعة الحضور والمرتب والإجازات'
                                : 'Employee sign in - ادخل بحسابك أو أنشئ حسابًا جديدًا'}
                    </p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleLogin} noValidate>
                    {mode === 'signup' && (
                        <div className="field" style={{ marginBottom: '14px' }}>
                            <label className="field-label" htmlFor="signup-name">الاسم الكامل</label>
                            <input
                                id="signup-name"
                                className="input"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="اكتب اسمك الكامل"
                                disabled={loading}
                            />
                        </div>
                    )}

                    <div className="field" style={{ marginBottom: '14px' }}>
                        <label className="field-label" htmlFor="login-email">البريد الإلكتروني</label>
                        <input
                            id="login-email"
                            className="input ltr"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder="name@example.com"
                            disabled={loading}
                            autoComplete="email"
                        />
                    </div>

                    <div className="field" style={{ marginBottom: '18px' }}>
                        <label className="field-label" htmlFor="login-password">كلمة المرور</label>
                        <div className="auth-pass-wrap">
                            <input
                                id="login-password"
                                className="input ltr"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (error) setError('');
                                }}
                                placeholder="••••••••"
                                disabled={loading}
                                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                                style={{ paddingInlineEnd: '40px' }}
                            />
                            <button
                                type="button"
                                className="auth-pass-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                            >
                                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                        {loading
                            ? 'جاري تسجيل الدخول...'
                            : mode === 'signup'
                                ? 'إنشاء الحساب'
                                : 'تسجيل الدخول'}
                    </button>
                </form>

                {isAdmin && mode === 'login' && (
                    <div className="auth-hint">
                        Admin email: <b style={{ color: '#0f172a' }}>owner@pioneers.local</b> (or admin@pioneers.local)
                    </div>
                )}

                <div className="auth-links">
                    {!isAdmin && (
                        <button
                            type="button"
                            className="auth-link"
                            onClick={() => {
                                setMode(mode === 'login' ? 'signup' : 'login');
                                setError('');
                            }}
                        >
                            {mode === 'login' ? 'ليس لديك حساب؟ إنشاء حساب موظف جديد' : 'لديك حساب بالفعل؟ تسجيل الدخول'}
                        </button>
                    )}
                    {onBack && (
                        <button type="button" className="auth-link muted" onClick={onBack}>
                            <ArrowRight size={14} />
                            العودة للصفحة الرئيسية
                        </button>
                    )}
                </div>

                <p className="auth-foot">PIONEERS HRMS · {isAdmin ? 'Management' : 'Employee Portal'}</p>
            </div>
        </div>
    );
}
