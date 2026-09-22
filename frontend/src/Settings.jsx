import React, { useState, useEffect } from 'react';

export default function Settings() {
    // إعدادات الشركة المحفوظة في الذاكرة الدائمة لضمان عدم حدوث أي أخطاء سيرفر
    const [settings, setSettings] = useState(() => {
        const saved = localStorage.getItem('hr_company_settings');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error(e); }
        }
        return {
            companyName: 'Pioneers Integrated Programming Solutions',
            officialCurrency: 'USD ($)',
            workHoursPerDay: '8 ساعات',
            defaultLateDeduction: 'ساعة عن كل تأخير',
            overtimeRate: '1.5 ضعف',
            weekly_holiday_1: 'الجمعة',
            weekly_holiday_2: 'السبت'
        };
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
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    return (
        <div style={{ padding: '24px', fontFamily: 'Tahoma, Arial, sans-serif', direction: 'rtl', background: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>

            {/* عنوان الصفحة العصري */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>الإعدادات العامة وسياسات الشركة</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>إدارة بيانات المؤسسة، سياسات العمل الرسمية، ومعدلات الخصم والإجازات</p>
                </div>
                {message.text && (
                    <div style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', background: message.type === 'success' ? '#dcfce7' : '#fee2e2', color: message.type === 'success' ? '#166534' : '#991b1b' }}>
                        {message.text}
                    </div>
                )}
            </div>

            {/* نموذج الإعدادات الشامل */}
            <form onSubmit={handleSave} style={{ background: '#ffffff', padding: '30px', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', maxWidth: '900px', margin: '0 auto' }}>

                {/* القسم الأول: بيانات الشركة */}
                <h4 style={{ margin: '0 0 20px 0', fontSize: '15px', color: '#0284c7', borderBottom: '2px solid #f0f9ff', paddingBottom: '10px', fontWeight: 'bold' }}>أولاً: بيانات المؤسسة والعملة الرسمية</h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'center', marginBottom: '20px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>اسم الشركة / المؤسسة</label>
                    <input
                        type="text"
                        name="companyName"
                        value={settings.companyName}
                        onChange={handleChange}
                        style={{ padding: '10px 12px', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontSize: '13px', background: '#f8fafc', boxSizing: 'border-box' }}
                        required
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'center', marginBottom: '30px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>العملة الرسمية للنظام المالي</label>
                    <select
                        name="officialCurrency"
                        value={settings.officialCurrency}
                        onChange={handleChange}
                        style={{ padding: '10px 12px', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontSize: '13px', background: '#f8fafc', boxSizing: 'border-box' }}
                    >
                        <option value="USD ($)">دولار أمريكي (USD $)</option>
                        <option value="EGP (ج.م)">جنيه مصري (EGP ج.م)</option>
                        <option value="SAR (ر.س)">ريال سعودي (SAR ر.س)</option>
                    </select>
                </div>

                {/* القسم الثاني: سياسات العمل والخصومات */}
                <h4 style={{ margin: '0 0 20px 0', fontSize: '15px', color: '#0284c7', borderBottom: '2px solid #f0f9ff', paddingBottom: '10px', fontWeight: 'bold' }}>ثانياً: سياسات العمل والدوام الافتراضي</h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'center', marginBottom: '20px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>ساعات العمل الرسمية اليومية</label>
                    <input
                        type="text"
                        name="workHoursPerDay"
                        value={settings.workHoursPerDay}
                        onChange={handleChange}
                        style={{ padding: '10px 12px', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontSize: '13px', background: '#f8fafc', boxSizing: 'border-box' }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'center', marginBottom: '20px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>سياسة خصم التأخير الافتراضية</label>
                    <input
                        type="text"
                        name="defaultLateDeduction"
                        value={settings.defaultLateDeduction}
                        onChange={handleChange}
                        style={{ padding: '10px 12px', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontSize: '13px', background: '#f8fafc', boxSizing: 'border-box' }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'center', marginBottom: '30px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>معدل أجر الساعة الإضافية</label>
                    <input
                        type="text"
                        name="overtimeRate"
                        value={settings.overtimeRate}
                        onChange={handleChange}
                        style={{ padding: '10px 12px', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontSize: '13px', background: '#f8fafc', boxSizing: 'border-box' }}
                    />
                </div>

                {/* القسم الثالث: العطلات الرسمية */}
                <h4 style={{ margin: '0 0 20px 0', fontSize: '15px', color: '#0284c7', borderBottom: '2px solid #f0f9ff', paddingBottom: '10px', fontWeight: 'bold' }}>ثالثاً: العطلات والإجازات الأسبوعية الرسمية</h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'center', marginBottom: '20px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>يوم الإجازة الرسمي 1</label>
                    <select
                        name="weekly_holiday_1"
                        value={settings.weekly_holiday_1}
                        onChange={handleChange}
                        style={{ padding: '10px 12px', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontSize: '13px', background: '#f8fafc', boxSizing: 'border-box' }}
                    >
                        <option value="الجمعة">الجمعة</option>
                        <option value="السبت">السبت</option>
                        <option value="الأحد">الأحد</option>
                    </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'center', marginBottom: '30px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>يوم الإجازة الرسمي 2</label>
                    <select
                        name="weekly_holiday_2"
                        value={settings.weekly_holiday_2}
                        onChange={handleChange}
                        style={{ padding: '10px 12px', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontSize: '13px', background: '#f8fafc', boxSizing: 'border-box' }}
                    >
                        <option value="السبت">السبت</option>
                        <option value="الجمعة">الجمعة</option>
                        <option value="لا يوجد">لا يوجد</option>
                    </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <button
                        type="submit"
                        style={{ background: '#0284c7', color: '#fff', padding: '12px 32px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                    >
                        حفظ التغييرات الشاملة
                    </button>
                </div>

            </form>
        </div>
    );
}