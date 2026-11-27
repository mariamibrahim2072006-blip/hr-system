import React, { useState, useEffect } from 'react';
import { Building2, Plus, Trash2 } from 'lucide-react';
import { PageHeader, Card, Field, Empty, Alert, Badge, API_URL, authHeaders } from './ui';

export default function Departments() {
    const [departments, setDepartments] = useState([]);
    const [deptName, setDeptName] = useState('');
    const [managerName, setManagerName] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });

    const loadDepartments = async () => {
        try {
            const response = await fetch(`${API_URL}/api/departments`, { headers: authHeaders() });
            const data = await response.json().catch(() => []);
            if (response.ok) {
                setDepartments(Array.isArray(data) ? data : data.departments || []);
            }
        } catch (error) {
            console.error('LOAD DEPARTMENTS ERROR:', error);
        }
    };

    useEffect(() => {
        loadDepartments();
    }, []);

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3500);
    };

    const handleAddDepartment = async (e) => {
        e.preventDefault();
        if (!deptName.trim()) {
            showMessage('من فضلك أدخل اسم القسم', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/departments`, {
                method: 'POST',
                headers: authHeaders(true),
                body: JSON.stringify({
                    name: deptName.trim(),
                    manager: managerName.trim() || 'غير محدد',
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || 'حدث خطأ أثناء حفظ القسم');
            }

            showMessage('تم إضافة القسم بنجاح', 'success');
            setDeptName('');
            setManagerName('');
            loadDepartments();
        } catch (error) {
            showMessage(error.message || 'تعذر حفظ القسم', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا القسم؟')) return;

        try {
            const response = await fetch(`${API_URL}/api/departments/${id}`, {
                method: 'DELETE',
                headers: authHeaders(),
            });

            if (!response.ok) {
                throw new Error('حدث خطأ أثناء حذف القسم');
            }

            setDepartments(departments.filter((d) => (d.id || d._id) !== id));
            showMessage('تم حذف القسم بنجاح', 'success');
        } catch (error) {
            showMessage(error.message || 'تعذر حذف القسم', 'error');
        }
    };

    return (
        <div>
            <PageHeader
                icon={Building2}
                title="إدارة الأقسام"
                desc="الأقسام الإدارية للشركة ومسؤولوها، وتظهر عند تسجيل الموظفين"
            />

            {message.text && <Alert type={message.type}>{message.text}</Alert>}

            <Card icon={Plus} title="إضافة قسم جديد" desc="أدخل اسم القسم ويمكنك تحديد مسؤوله الآن أو لاحقًا">
                <form onSubmit={handleAddDepartment}>
                    <div className="form-grid">
                        <Field label="اسم القسم" required>
                            <input
                                className="input"
                                type="text"
                                placeholder="مثال: قسم تقنية المعلومات"
                                value={deptName}
                                onChange={(e) => setDeptName(e.target.value)}
                            />
                        </Field>
                        <Field label="مسؤول القسم" hint="اختياري - اسم الشخص المسؤول عن القسم">
                            <input
                                className="input"
                                type="text"
                                placeholder="اسم المسؤول"
                                value={managerName}
                                onChange={(e) => setManagerName(e.target.value)}
                            />
                        </Field>
                    </div>
                    <div className="mt">
                        <button type="submit" className="btn btn-primary">
                            <Plus size={15} />
                            حفظ القسم
                        </button>
                    </div>
                </form>
            </Card>

            <Card
                icon={Building2}
                title="الأقسام المسجلة"
                desc="كل الأقسام المحفوظة في النظام"
                actions={<span className="pill-count">{departments.length} قسم</span>}
                flush
            >
                {departments.length === 0 ? (
                    <Empty
                        icon={Building2}
                        title="لا توجد أقسام بعد"
                        text="ابدأ بإضافة أول قسم من النموذج بالأعلى، مثل: الموارد البشرية أو تقنية المعلومات. ستظهر الأقسام هنا وفي شاشة إضافة الموظف."
                    />
                ) : (
                    <div className="tbl-wrap">
                        <table className="tbl">
                            <thead>
                                <tr>
                                    <th className="c" style={{ width: 60 }}>#</th>
                                    <th>اسم القسم</th>
                                    <th>مسؤول القسم</th>
                                    <th className="c" style={{ width: 120 }}>العمليات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {departments.map((dept, idx) => (
                                    <tr key={dept.id || dept._id}>
                                        <td className="c muted">{idx + 1}</td>
                                        <td className="cell-main">{dept.name}</td>
                                        <td>{dept.manager || <span className="muted">غير محدد</span>}</td>
                                        <td className="c">
                                            <button
                                                type="button"
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleDelete(dept.id || dept._id)}
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
