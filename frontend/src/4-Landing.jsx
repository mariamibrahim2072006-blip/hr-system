import React from 'react';
import { ShieldCheck, UserRound, Building2, CalendarCheck, Wallet, Users } from 'lucide-react';

/* Landing: pick a portal - Management or Employees. */

const css = `
.land {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 18px;
    background:
        radial-gradient(900px 500px at 85% -10%, rgba(59, 130, 246, 0.28), transparent 60%),
        radial-gradient(700px 500px at 10% 110%, rgba(14, 165, 233, 0.20), transparent 55%),
        linear-gradient(160deg, #081a33 0%, #0b2447 55%, #10315e 100%);
    font-family: var(--font);
    direction: rtl;
}
.land-inner { width: 100%; max-width: 860px; }
.land-brand { text-align: center; margin-bottom: 34px; }
.land-logo {
    width: 64px; height: 64px; border-radius: 18px; margin: 0 auto 14px;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 14px 34px rgba(37, 99, 235, 0.45);
    color: #fff;
}
.land-title { margin: 0; color: #fff; font-size: 30px; font-weight: 900; letter-spacing: 1px; }
.land-sub { margin: 8px 0 0; color: #a9c0e4; font-size: 14px; font-weight: 600; line-height: 1.8; }
.land-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.land-card {
    background: rgba(255, 255, 255, 0.97);
    border: none;
    border-radius: 20px;
    padding: 28px 24px;
    text-align: start;
    cursor: pointer;
    box-shadow: 0 20px 50px rgba(2, 8, 23, 0.35);
    transition: transform 0.16s ease, box-shadow 0.16s ease;
    font-family: var(--font);
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.land-card:hover { transform: translateY(-4px); box-shadow: 0 28px 60px rgba(2, 8, 23, 0.45); }
.land-card-icon {
    width: 52px; height: 52px; border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 10px;
}
.land-card-icon.blue { background: #eff6ff; color: #1d4ed8; }
.land-card-icon.green { background: #ecfdf5; color: #047857; }
.land-card-title { margin: 0; font-size: 19px; font-weight: 900; color: #0f172a; }
.land-card-en { font-size: 11px; font-weight: 800; color: #94a3b8; letter-spacing: 0.6px; text-transform: uppercase; }
.land-card-desc { margin: 8px 0 0; font-size: 13px; color: #64748b; font-weight: 600; line-height: 1.8; }
.land-card-cta { margin-top: 16px; display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 800; color: #2563eb; }
.land-card.green-card .land-card-cta { color: #059669; }
.land-feats { display: flex; justify-content: center; gap: 22px; flex-wrap: wrap; margin-top: 30px; }
.land-feat { display: flex; align-items: center; gap: 7px; color: #8fa9d1; font-size: 12px; font-weight: 700; }
.land-foot { text-align: center; margin-top: 26px; color: #5f789f; font-size: 11px; font-weight: 600; }
@media (max-width: 640px) {
    .land-cards { grid-template-columns: 1fr; }
    .land-title { font-size: 24px; }
}
`;

export default function Landing({ onSelect }) {
    return (
        <div className="land">
            <style>{css}</style>
            <div className="land-inner">
                <div className="land-brand">
                    <div className="land-logo">
                        <Building2 size={30} strokeWidth={2.2} />
                    </div>
                    <h1 className="land-title">PIONEERS HRMS</h1>
                    <p className="land-sub">
                        نظام إدارة الموارد البشرية · Human Resources Management System
                    </p>
                </div>

                <div className="land-cards">
                    <button type="button" className="land-card" onClick={() => onSelect('admin')}>
                        <span className="land-card-icon blue">
                            <ShieldCheck size={26} strokeWidth={2.1} />
                        </span>
                        <h2 className="land-card-title">دخول الإدارة</h2>
                        <span className="land-card-en">Management sign in</span>
                        <p className="land-card-desc">
                            لمديري النظام والموارد البشرية: إدارة الموظفين والحضور والمرتبات والإجازات والتقارير من مكان واحد.
                        </p>
                        <span className="land-card-cta">تسجيل الدخول ←</span>
                    </button>

                    <button type="button" className="land-card green-card" onClick={() => onSelect('employee')}>
                        <span className="land-card-icon green">
                            <UserRound size={26} strokeWidth={2.1} />
                        </span>
                        <h2 className="land-card-title">بوابة الموظفين</h2>
                        <span className="land-card-en">Employee portal</span>
                        <p className="land-card-desc">
                            للموظفين: متابعة الحضور والمرتب وطلبات الإجازات والعطلات الرسمية، أو إنشاء حساب جديد.
                        </p>
                        <span className="land-card-cta">دخول / حساب جديد ←</span>
                    </button>
                </div>

                <div className="land-feats">
                    <span className="land-feat"><Users size={14} /> الموظفون</span>
                    <span className="land-feat"><CalendarCheck size={14} /> الحضور</span>
                    <span className="land-feat"><Wallet size={14} /> المرتبات</span>
                </div>

                <p className="land-foot">PIONEERS HRMS · جميع الحقوق محفوظة</p>
            </div>
        </div>
    );
}
