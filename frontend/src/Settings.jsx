import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Building2, Clock3, CalendarDays } from "lucide-react";
import { PageHeader, Card, Field, Alert } from './ui';

const DEFAULTS = {
    companyName: 'Pioneers Integrated Programming Solutions',
    officialCurrency: 'USD ($)',
    workHoursPerDay: '8 ساعات',
    defaultLateDeduction: 'ساعة عن كل تأخير',
    overtimeRate: '1.5 ضعف',
    weekly_holiday_1: 'الجمعة',
    weekly_holiday_2: 'السبت',
};

export default function Settings() {
    // Company policies are stored locally to avoid any server errors.
    const [settings, setSettings] = useState(() => {
        const saved = localStorage.getItem('hr_company_settings');
        if (saved) {
            try { return { ...DEFAULTS, ...JSON.parse(saved) }; } catch (e) { console.error(e); }
        }
        return DEFAULTS;
    });

    useEffect(() => {
        localStorage.setItem('hr_company_settings', JSON.stringify(settings));
    }, [settings]);

    const [message, setMessage] = useState({ text: '', type: '' });

    const handleChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleSave = (e) => {
        e.preventDefault();
        setMessage({ text: 'تم حفظ إعدادات السياسة العامة للشركة بنجاح وتحديث النظام', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3500);
    };

    return (
        <div>
            <PageHeader
                icon={SettingsIcon}
                title="الإعدادات العامة وسياسات الشركة"
                desc="بيانات المؤسسة وسياسات الدوام والخصومات والإجازات الأسبوعية - تحفظ على هذا الجهاز"
            />

            {message.text && <Alert type={message.type}>{message.text}</Alert>}

            <form onSubmit={handleSave}>
                <Card icon={Building2} title="بيانات المؤسسة والعملة" desc="تظهر في التقارير وكشوف الرواتب">
                    <div className="form-grid">
                        <Field label="اسم الشركة / المؤسسة" required>
                            <input className="input" type="text" name="companyName" value={settings.companyName} onChange={handleChange} required />
                        </Field>
                        <Field label="العملة الرسمية للنظام المالي">
                            <select className="select" name="officialCurrency" value={settings.officialCurrency} onChange={handleChange}>
                                <option value="USD ($)">دولار أمريكي (USD $)</option>
                                <option value="EGP (ج.م)">جنيه مصري (EGP ج.م)</option>
                                <option value="SAR (ر.س)">ريال سعودي (SAR ر.س)</option>
                            </select>
                        </Field>
                    </div>
                </Card>

                <Card icon={Clock3} title="سياسات العمل والدوام" desc="القيم الافتراضية المستخدمة في حساب الحضور والمرتبات">
                    <div className="form-grid-3">
                        <Field label="ساعات العمل اليومية">
                            <input className="input" type="text" name="workHoursPerDay" value={settings.workHoursPerDay} onChange={handleChange} />
                        </Field>
                        <Field label="سياسة خصم التأخير">
                            <input className="input" type="text" name="defaultLateDeduction" value={settings.defaultLateDeduction} onChange={handleChange} />
                        </Field>
                        <Field label="أجر الساعة الإضافية">
                            <input className="input" type="text" name="overtimeRate" value={settings.overtimeRate} onChange={handleChange} />
                        </Field>
                    </div>
                </Card>

                <Card icon={CalendarDays} title="العطلات الأسبوعية الرسمية" desc="أيام الراحة الأسبوعية للموظفين">
                    <div className="form-grid">
                        <Field label="يوم الإجازة الرسمي 1">
                            <select className="select" name="weekly_holiday_1" value={settings.weekly_holiday_1} onChange={handleChange}>
                                <option value="الجمعة">الجمعة</option>
                                <option value="السبت">السبت</option>
                                <option value="الأحد">الأحد</option>
                            </select>
                        </Field>
                        <Field label="يوم الإجازة الرسمي 2">
                            <select className="select" name="weekly_holiday_2" value={settings.weekly_holiday_2} onChange={handleChange}>
                                <option value="السبت">السبت</option>
                                <option value="الجمعة">الجمعة</option>
                                <option value="لا يوجد">لا يوجد</option>
                            </select>
                        </Field>
                    </div>
                    <div className="mt">
                        <button type="submit" className="btn btn-primary">
                            <Save size={15} />
                            حفظ كل الإعدادات
                        </button>
                    </div>
                </Card>
            </form>
        </div>
    );
}
