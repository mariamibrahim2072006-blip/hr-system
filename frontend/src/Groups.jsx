import React, { useState, useEffect } from 'react';

export default function Groups() {
    // جلب المجموعات المحفوظة مسبقاً من ذاكرة المتصفح لضمان عدم ضياعها
    const [groupsList, setGroupsList] = useState(() => {
        const saved = localStorage.getItem('hr_user_groups');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error(e); }
        }
        return [
            { id: 1, name: 'مدير النظام (Admin)', permissionsCount: 'صلاحيات كاملة' },
            { id: 2, name: 'موظف شؤون إدارية', permissionsCount: 'عرض وتعديل' }
        ];
    });

    useEffect(() => {
        localStorage.setItem('hr_user_groups', JSON.stringify(groupsList));
    }, [groupsList]);

    const [groupName, setGroupName] = useState('');
    const [permissions, setPermissions] = useState({
        employees: { view: false, edit: false, delete: false, add: false, all: false },
        settings: { view: false, edit: false, delete: false, add: false, all: false },
        attendance: { view: false, edit: false, delete: false, add: false, all: false },
        salaries: { view: false, edit: false, delete: false, add: false, all: false }
    });
    const [message, setMessage] = useState({ text: '', type: '' });

    const handleCheckboxChange = (row, field) => {
        const updated = { ...permissions };
        if (field === 'all') {
            const val = !updated[row].all;
            updated[row] = { view: val, edit: val, delete: val, add: val, all: val };
        } else {
            updated[row][field] = !updated[row][field];
            updated[row].all = updated[row].view && updated[row].edit && updated[row].delete && updated[row].add;
        }
        setPermissions(updated);
    };

    const handleSelectAllGlobal = () => {
        const updated = {};
        const keys = ['employees', 'settings', 'attendance', 'salaries'];
        keys.forEach(k => {
            updated[k] = { view: true, edit: true, delete: true, add: true, all: true };
        });
        setPermissions(updated);
        setMessage({ text: 'تم تحديد كافة الصلاحيات بنجاح', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    const handlePrivateCustom = () => {
        const updated = {};
        const keys = ['employees', 'settings', 'attendance', 'salaries'];
        keys.forEach(k => {
            updated[k] = { view: false, edit: false, delete: false, add: false, all: false };
        });
        setPermissions(updated);
        setMessage({ text: 'تم إعادة ضبط الصلاحيات للتخصيص اليدوي', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    const handleSave = (e) => {
        e.preventDefault();
        if (!groupName.trim()) {
            setMessage({ text: 'من فضلك أدخل اسم المجموعة', type: 'error' });
            return;
        }

        const newGroup = {
            id: Date.now(),
            name: groupName,
            permissionsCount: 'صلاحيات مخصصة'
        };

        setGroupsList([newGroup, ...groupsList]);
        setMessage({ text: 'تم إضافة وحفظ مجموعة الصلاحيات بنجاح في النظام', type: 'success' });
        setGroupName('');
        handlePrivateCustom();
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    const handleDeleteGroup = (id) => {
        if (!window.confirm('هل أنت متأكد من حذف هذه المجموعة؟')) return;
        setGroupsList(groupsList.filter(g => g.id !== id));
        setMessage({ text: 'تم حذف المجموعة بنجاح', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    return (
        <div style={{ padding: '24px', fontFamily: 'Tahoma, Arial, sans-serif', direction: 'rtl', background: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>

            {/* العنوان التوضيحي */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>مجموعات المستخدمين والصلاحيات</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>إنشاء مسميات وظيفية وتحديد صلاحيات الوصول بدقة لكل قسم في النظام</p>
                </div>
                {message.text && (
                    <div style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', background: message.type === 'success' ? '#dcfce7' : '#fee2e2', color: message.type === 'success' ? '#166534' : '#991b1b' }}>
                        {message.text}
                    </div>
                )}
            </div>

            {/* نموذج إضافة مجموعة جديدة */}
            <form onSubmit={handleSave} style={{ background: '#ffffff', padding: '24px', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#0284c7', borderBottom: '2px solid #f0f9ff', paddingBottom: '10px', fontWeight: 'bold' }}>إضافة مجموعة جديدة وتحديد الصلاحيات</h4>

                {/* أزرار التحكم العلوية */}
                <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <button type="button" onClick={handlePrivateCustom} style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '8px 20px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}>Private custom (إلغاء التحديد)</button>
                    <button type="button" onClick={handleSelectAllGlobal} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}>منح كل الصلاحيات</button>
                </div>

                {/* خانة اسم المجموعة وزر الحفظ */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '15px', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="أدخل اسم المجموعة (مثال: محاسب أول، مشرف إداري...)"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        style={{ padding: '10px 14px', width: '320px', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontSize: '13px', background: '#f8fafc', boxSizing: 'border-box' }}
                    />
                    <button type="submit" style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '10px 28px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>حفظ المجموعة (SAVE)</button>
                </div>

                {/* جدول الصلاحيات */}
                <div style={{ width: '100%', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9', color: '#475569' }}>
                                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0', width: '200px' }}>أقسام النظام (الصفحة)</th>
                                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0', textAlign: 'center', width: '90px' }}>عرض</th>
                                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0', textAlign: 'center', width: '90px' }}>تعديل</th>
                                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0', textAlign: 'center', width: '90px' }}>حذف</th>
                                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0', textAlign: 'center', width: '90px' }}>إضافة</th>
                                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0', textAlign: 'center', width: '80px' }}>الكل</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { key: 'employees', label: 'إدارة الموظفين' },
                                { key: 'settings', label: 'الإعدادات العامة والسياسات' },
                                { key: 'attendance', label: 'إدارة الحضور والورديات' },
                                { key: 'salaries', label: 'تقرير الرواتب والماليات' }
                            ].map((row, idx) => (
                                <tr key={row.key} style={{ background: idx % 2 === 0 ? '#ffffff' : '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1e293b' }}>{row.label}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <input type="checkbox" checked={permissions[row.key].view} onChange={() => handleCheckboxChange(row.key, 'view')} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <input type="checkbox" checked={permissions[row.key].edit} onChange={() => handleCheckboxChange(row.key, 'edit')} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <input type="checkbox" checked={permissions[row.key].delete} onChange={() => handleCheckboxChange(row.key, 'delete')} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <input type="checkbox" checked={permissions[row.key].add} onChange={() => handleCheckboxChange(row.key, 'add')} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <input type="checkbox" checked={permissions[row.key].all} onChange={() => handleCheckboxChange(row.key, 'all')} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </form>

            {/* جدول عرض المجموعات النشطة حالياً في النظام */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#1e293b', fontWeight: 'bold', textAlign: 'right' }}>المجموعات النشطة المسجلة في النظام</h4>

                <div style={{ width: '100%', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9', color: '#475569' }}>
                                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0', textAlign: 'center', width: '80px' }}>ID</th>
                                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0' }}>اسم مجموعة المستخدمين</th>
                                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0' }}>نوع الصلاحيات</th>
                                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0', textAlign: 'center', width: '120px' }}>العمليات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupsList.length > 0 ? (
                                groupsList.map((grp, idx) => (
                                    <tr key={grp.id || idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b' }}>{grp.id}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1e293b' }}>{grp.name}</td>
                                        <td style={{ padding: '12px 16px', color: '#0284c7', fontWeight: '500' }}>{grp.permissionsCount}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => handleDeleteGroup(grp.id)}
                                                style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '5px 14px', cursor: 'pointer', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}
                                            >
                                                حذف
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>لا توجد مجموعات مسجلة حالياً</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}