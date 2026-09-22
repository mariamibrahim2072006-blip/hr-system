
import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'https://hr-system-backend-eight.vercel.app/api';

export default function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [showPassword, setShowPassword] =
        useState(false);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();

        setError('');

        const cleanEmail = email.trim();

        if (!cleanEmail) {
            setError(
                'من فضلك أدخل البريد الإلكتروني.'
            );
            return;
        }

        if (!password) {
            setError(
                'من فضلك أدخل كلمة المرور.'
            );
            return;
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                cleanEmail
            )
        ) {
            setError(
                'من فضلك أدخل بريدًا إلكترونيًا صحيحًا.'
            );
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                `${API_URL}/login`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json'
                    },
                    body: JSON.stringify({
                        email: cleanEmail,
                        password
                    })
                }
            );

            let data = {};

            try {
                data =
                    await response.json();
            } catch {
                data = {};
            }

            if (
                response.ok &&
                data.success &&
                data.user &&
                data.token
            ) {
                // حفظ بيانات تسجيل الدخول الحقيقية
                // القادمة من قاعدة البيانات
                localStorage.setItem(
                    'hr_token',
                    data.token
                );

                localStorage.setItem(
                    'hr_user',
                    JSON.stringify(
                        data.user
                    )
                );

                // إرسال بيانات المستخدم
                // إلى التطبيق الرئيسي
                onLogin(data.user);

                return;
            }

            if (response.status === 401) {
                setError(
                    data.message ||
                    'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
                );
                return;
            }

            if (response.status === 403) {
                setError(
                    data.message ||
                    'ليس لديك صلاحية للدخول إلى النظام.'
                );
                return;
            }

            if (response.status >= 500) {
                setError(
                    'حدث خطأ في الخادم. حاول مرة أخرى.'
                );
                return;
            }

            setError(
                data.message ||
                'تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.'
            );
        } catch (err) {
            console.error(
                'Login error:',
                err
            );

            setError(
                'تعذر الاتصال بالخادم. تأكد من تشغيل الـ Backend ثم حاول مرة أخرى.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#f8fafc',
                padding: '20px',
                boxSizing: 'border-box',
                fontFamily:
                    'Tahoma, Arial, sans-serif',
                direction: 'ltr'
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '410px',
                    background: '#ffffff',
                    border:
                        '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding:
                        '42px 38px',
                    boxSizing: 'border-box',
                    boxShadow:
                        '0 8px 30px rgba(15, 23, 42, 0.06)'
                }}
            >
                {/* =====================
                    LOGO / TITLE
                ====================== */}

                <div
                    style={{
                        textAlign: 'center',
                        marginBottom: '38px'
                    }}
                >
                    <h1
                        style={{
                            margin: 0,
                            color: '#0284c7',
                            fontSize: '24px',
                            fontWeight: '700',
                            letterSpacing:
                                '0.5px'
                        }}
                    >
                        PIONEERS HRMS
                    </h1>

                    <p
                        style={{
                            margin:
                                '8px 0 0',
                            color: '#64748b',
                            fontSize: '12px'
                        }}
                    >
                        Human Resources
                        Management System
                    </p>
                </div>

                {/* =====================
                    FORM
                ====================== */}

                <form
                    onSubmit={handleLogin}
                    noValidate
                >
                    {/* EMAIL */}

                    <div
                        style={{
                            marginBottom:
                                '24px'
                        }}
                    >
                        <label
                            htmlFor="login-email"
                            style={{
                                display:
                                    'block',
                                marginBottom:
                                    '8px',
                                color:
                                    '#334155',
                                fontSize:
                                    '12px',
                                fontWeight:
                                    '600',
                                textAlign:
                                    'left'
                            }}
                        >
                            EMAIL
                        </label>

                        <input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(
                                    e.target
                                        .value
                                );

                                if (error) {
                                    setError(
                                        ''
                                    );
                                }
                            }}
                            placeholder="Enter your email"
                            autoComplete="username"
                            disabled={loading}
                            style={{
                                width: '100%',
                                height: '44px',
                                padding:
                                    '0 12px',
                                boxSizing:
                                    'border-box',
                                border:
                                    '1px solid #cbd5e1',
                                borderRadius:
                                    '6px',
                                outline: 'none',
                                background:
                                    loading
                                        ? '#f1f5f9'
                                        : '#ffffff',
                                color:
                                    '#1e293b',
                                fontSize:
                                    '13px',
                                direction:
                                    'ltr'
                            }}
                        />
                    </div>

                    {/* PASSWORD */}

                    <div
                        style={{
                            marginBottom:
                                '24px'
                        }}
                    >
                        <label
                            htmlFor="login-password"
                            style={{
                                display:
                                    'block',
                                marginBottom:
                                    '8px',
                                color:
                                    '#334155',
                                fontSize:
                                    '12px',
                                fontWeight:
                                    '600',
                                textAlign:
                                    'left'
                            }}
                        >
                            PASSWORD
                        </label>

                        <div
                            style={{
                                position:
                                    'relative'
                            }}
                        >
                            <input
                                id="login-password"
                                type={
                                    showPassword
                                        ? 'text'
                                        : 'password'
                                }
                                value={
                                    password
                                }
                                onChange={(
                                    e
                                ) => {
                                    setPassword(
                                        e.target
                                            .value
                                    );

                                    if (error) {
                                        setError(
                                            ''
                                        );
                                    }
                                }}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                disabled={
                                    loading
                                }
                                style={{
                                    width:
                                        '100%',
                                    height:
                                        '44px',
                                    padding:
                                        '0 45px 0 12px',
                                    boxSizing:
                                        'border-box',
                                    border:
                                        '1px solid #cbd5e1',
                                    borderRadius:
                                        '6px',
                                    outline:
                                        'none',
                                    background:
                                        loading
                                            ? '#f1f5f9'
                                            : '#ffffff',
                                    color:
                                        '#1e293b',
                                    fontSize:
                                        '13px',
                                    direction:
                                        'ltr'
                                }}
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    setShowPassword(
                                        (prev) =>
                                            !prev
                                    )
                                }
                                disabled={
                                    loading
                                }
                                aria-label={
                                    showPassword
                                        ? 'Hide password'
                                        : 'Show password'
                                }
                                style={{
                                    position:
                                        'absolute',
                                    right:
                                        '10px',
                                    top:
                                        '50%',
                                    transform:
                                        'translateY(-50%)',
                                    border:
                                        'none',
                                    background:
                                        'transparent',
                                    color:
                                        '#64748b',
                                    cursor:
                                        loading
                                            ? 'not-allowed'
                                            : 'pointer',
                                    fontSize:
                                        '12px',
                                    padding:
                                        '5px'
                                }}
                            >
                                {showPassword
                                    ? 'Hide'
                                    : 'Show'}
                            </button>
                        </div>
                    </div>

                    {/* ERROR */}

                    {error && (
                        <div
                            role="alert"
                            style={{
                                marginBottom:
                                    '20px',
                                padding:
                                    '10px 12px',
                                background:
                                    '#fef2f2',
                                border:
                                    '1px solid #fecaca',
                                borderRadius:
                                    '6px',
                                color:
                                    '#b91c1c',
                                fontSize:
                                    '12px',
                                lineHeight:
                                    '1.6',
                                textAlign:
                                    'center'
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {/* LOGIN BUTTON */}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            height: '44px',
                            background:
                                loading
                                    ? '#94a3b8'
                                    : '#0284c7',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius:
                                '6px',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: loading
                                ? 'not-allowed'
                                : 'pointer',
                            transition:
                                'background 0.2s ease',
                            boxShadow:
                                '0 3px 8px rgba(2, 132, 199, 0.18)'
                        }}
                    >
                        {loading
                            ? 'جاري التحقق...'
                            : 'Sign in'}
                    </button>
                </form>

                {/* FOOTER */}

                <div
                    style={{
                        marginTop: '28px',
                        paddingTop: '16px',
                        borderTop:
                            '1px solid #f1f5f9',
                        textAlign:
                            'center',
                        color: '#94a3b8',
                        fontSize: '10px'
                    }}
                >
                    PIONEERS HRMS
                </div>
            </div>
        </div>
    );
}

