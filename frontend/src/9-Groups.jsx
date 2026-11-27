import React, { useState, useEffect } from 'react';
import { Layers3, Save, Trash2 } from 'lucide-react';
import { PageHeader, Card, Field, Empty, Alert, Badge } from './ui';

const PERMISSION_ROWS = [
    { key: 'employees', label: 'إدارة الموظفين' },
    { key: 'settings', label: 'الإعدادات العامة والسياسات' },
    { key: 'attendance', label: 'إدارة الحضور والورديات' },
    { key: 'salaries', label: 'تقرير الرواتب والماليات' },
];

const emptyPermissions = () => ({
    employees: { view: false, edit: false, delete: false, add: false, all: false },
    settings: { view: false, edit: false, delete: false, add: false, all: false },
    attendance: { view: false, edit: false, delete: false, add: false, all: false },
    salaries: { view: false, edit: false, delete: false, add: false, all: false },
});

export default function Groups() {
    // Groups persist in browser storage so they are never lost.
    const [groupsList, setGroupsList] = useState(() => {
        const saved = localStorage.getItem('hr_user_groups');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error(e); }
        }
        return [
            { id: 1, name: 'مدير النظام (Admin)', permissionsCount: 'صلاحيات كاملة' },
            { id: 2, name: 'موظف شؤون إدارية', permissionsCount: 'عرض وتعديل' },
        ];
    });

    useEffect(() => {
        localStorage.setItem('hr_user_groups', JSON.stringify(groupsList));
    }, [groupsList]);

    const [groupName, setGroupName] = useState('');
    const [permissions, setPermissions] = useState(emptyPermissions);
    const [message, setMessage] = useState({ text: '', type: '' });

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    const handleCheckboxChange = (row, field) => {
        const updated = { ...permissions };
        if (field === 'all') {
            const val = !updated[row].all;
            updated[row] = { view: val, edit: val, delete: val, add: val, all: val };
        } else {
            updated[row] = { ...updated[row], [field]: !updated[row][field] };
            updated[row].all = updated[row].view && updated[row].edit && updated[row].delete && updated[row].add;
        }
        setPermissions(updated);
    };

    const handleSelectAllGlobal = () => {
        const updated = {};
        PERMISSION_ROWS.forEach(({ key }) => {
            updated[key] = { view: true, edit: true, delete: true, add: true, all: true };
        });
        setPermissions(updated);
        showMessage('تم تحديد كافة الصلاحيات بنجاح');
    };

    const handlePrivateCustom = () => {
        setPermissions(emptyPermissions());
        showMessage('تم إعادة ضبط الصلاحيات للتخصيص اليدوي');
    };

    const handleSave = (e) => {
        e.preventDefault();
        if (!groupName.trim()) {
            showMessage('من فضلك أدخل اسم المجموعة', 'error');
            return;
        }

        const newGroup = {
            id: Date.now(),
            name: groupName,
            permissionsCount: 'صلاحيات مخصصة',
        };

        setGroupsList([newGroup, ...groupsList]);
        showMessage('تم إضافة وحفظ مجموعة الصلاحيات بنجاح في النظام');
        setGroupName('');
        setPermissions(emptyPermissions());
    };

    const handleDeleteGroup = (id) => {
        if (!window.confirm('هل أنت متأكد من حذف هذه المجموعة؟')) return;
        setGroupsList(groupsList.filter((g) => g.id !== id));
        showMessage('تم حذف المجموعة بنجاح');
    };

    return (
        <div>
            <PageHeader
                icon={Layers3}
                title="مجموعات المستخدمين والصلاحيات"
                desc="إنشاء مسميات وظيفية وتحديد ما يمكن لكل مجموعة رؤيته أو تعديله في النظام"
            />

            {message.text && <Alert type={message.type}>{message.text}</Alert>}

            <Card icon={Layers3} title="إضافة مجموعة جديدة" desc="سمّ المجموعة ثم حدد صلاحياتها على كل قسم من أقسام النظام">
                <form onSubmit={handleSave}>
                    <div className="toolbar mb">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={handlePrivateCustom}>
                            إلغاء كل التحديدات
                        </button>
                        <button type="button" className="btn btn-soft btn-sm" onClick={handleSelectAllGlobal}>
                            منح كل الصلاحيات
                        </button>
                    </div>

                    <div className="form-grid mb">
                        <Field label="اسم المجموعة" required hint="مثال: محاسب أول، مشرف إداري...">
                            <input
                                className="input"
                                type="text"
                                placeholder="أدخل اسم المجموعة"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                            />
                        </Field>
                    </div>

                    <div className="tbl-wrap">
                        <table className="tbl">
                            <thead>
                                <tr>
                                    <th>أقسام النظام</th>
                                    <th className="c">عرض</th>
                                    <th className="c">تعديل</th>
                                    <th className="c">حذف</th>
                                    <th className="c">إضافة</th>
                                    <th className="c">الكل</th>
                                </tr>
                            </thead>
                            <tbody>
                                {PERMISSION_ROWS.map((row) => (
                                    <tr key={row.key}>
                                        <td className="cell-main">{row.label}</td>
                                        {['view', 'edit', 'delete', 'add', 'all'].map((field) => (
                                            <td className="c" key={field}>
                                                <input
                                                    type="checkbox"
                                                    checked={permissions[row.key][field]}
                                                    onChange={() => handleCheckboxChange(row.key, field)}
                                                    style={{ width: 17, height: 17, cursor: 'pointer', accentColor: '#2563eb' }}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt">
                        <button type="submit" className="btn btn-success">
                            <Save size={15} />
                            حفظ المجموعة
                        </button>
                    </div>
                </form>
            </Card>

            <Card
                icon={Layers3}
                title="المجموعات المسجلة"
                desc="المجموعات النشطة حاليًا في النظام"
                actions={<span className="pill-count">{groupsList.length} مجموعة</span>}
                flush
            >
                {groupsList.length === 0 ? (
                    <Empty
                        icon={Layers3}
                        title="لا توجد مجموعات"
                        text="أنشئ أول مجموعة صلاحيات من النموذج بالأعلى لتنظيم وصول المستخدمين إلى أقسام النظام."
                    />
                ) : (
                    <div className="tbl-wrap">
                        <table className="tbl">
                            <thead>
                                <tr>
                                    <th>اسم المجموعة</th>
                                    <th>نوع الصلاحيات</th>
                                    <th className="c" style={{ width: 120 }}>العمليات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupsList.map((grp) => (
                                    <tr key={grp.id}>
                                        <td className="cell-main">{grp.name}</td>
                                        <td><Badge tone="blue">{grp.permissionsCount}</Badge></td>
                                        <td className="c">
                                            <button
                                                type="button"
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleDeleteGroup(grp.id)}
                                            >
                                                <Trash2 size={13} />
                                                حذف
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
