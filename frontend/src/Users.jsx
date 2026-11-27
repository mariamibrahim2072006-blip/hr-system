import React, { useEffect, useState } from 'react';
import { ShieldCheck, UserPlus, Trash2 } from 'lucide-react';
import { PageHeader, Card, Field, Empty, Alert, Loading, Badge, Modal } from './ui';

const API_URL = 'http://localhost:5000/api';

const getAuthHeaders = (includeJson = false) => ({
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${localStorage.getItem('hr_token')}`,
});

const roleLabels = {
    admin: 'مدير النظام',
    hr: 'الموارد البشرية',
    manager: 'مدير',
    employee: 'موظف',
};

const roleTones = {
    admin: 'blue',
    hr: 'green',
    manager: 'amber',
    employee: 'gray',
};

const emptyForm = {
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'admin',
    employee_id: '',
};

export default function Users() {
    const [users, setUsers] = useState([]);
    const [employees, setEmployees] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState(emptyForm);

    const showSuccess = (text) => {
        setSuccess(text);
        setTimeout(() => setSuccess(''), 3500);
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError('');

            const token = localStorage.getItem('hr_token');
            if (!token) {
                setError('جلسة تسجيل الدخول غير موجودة. من فضلك سجل الدخول مرة أخرى.');
                return;
            }

            const response = await fetch(`${API_URL}/users`, { headers: getAuthHeaders() });
            const data = await response.json();

            if (response.status === 401) {
                setError('انتهت جلسة تسجيل الدخول أو الـ Token غير صالح. من فضلك سجل الدخول مرة أخرى.');
                return;
            }
            if (response.status === 403) {
                setError('ليس لديك صلاحية للوصول إلى مستخدمي النظام.');
                return;
            }
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'فشل تحميل المستخدمين');
            }

            setUsers(Array.isArray(data.users) ? data.users : []);
        } catch (err) {
            console.error('Fetch users error:', err);
            setError(err.message || 'تعذر الاتصال بالخادم');
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await fetch(`${API_URL}/employees`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (response.ok && data.success) {
                setEmployees(Array.isArray(data.employees) ? data.employees : []);
            }
        } catch (err) {
            console.error('Fetch employees error:', err);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchEmployees();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const name = formData.name.trim();
        const username = formData.username.trim();
        const email = formData.email.trim();
        const password = formData.password;

        if (!name) {
            setError('من فضلك أدخل اسم المستخدم.');
            return;
        }
        if (!username) {
            setError('من فضلك أدخل اسم الدخول (Username).');
            return;
        }
        if (!email) {
            setError('من فضلك أدخل البريد الإلكتروني.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('من فضلك أدخل بريدًا إلكترونيًا صحيحًا.');
            return;
        }
        if (!password) {
            setError('من فضلك أدخل كلمة المرور.');
            return;
        }
        if (password.length < 6) {
            setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
            return;
        }
        if (!formData.role) {
            setError('من فضلك اختر الصلاحية.');
            return;
        }
        if (formData.role === 'employee' && !formData.employee_id) {
            setError('من فضلك اختر الموظف المرتبط بهذا الحساب.');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const payload = {
                name,
                username,
                email,
                password,
                role: formData.role,
                employee_id: formData.role === 'employee' ? Number(formData.employee_id) : null,
            };

            const response = await fetch(`${API_URL}/users/add`, {
                method: 'POST',
                headers: getAuthHeaders(true),
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.status === 401) {
                setError('انتهت جلسة تسجيل الدخول أو الـ Token غير صالح.');
                return;
            }
            if (response.status === 403) {
                setError('ليس لديك صلاحية لإضافة مستخدمين.');
                return;
            }
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'فشل إضافة المستخدم');
            }

            showSuccess('تم إضافة المستخدم بنجاح.');
            setFormData(emptyForm);
            setShowForm(false);
            await fetchUsers();
        } catch (err) {
            console.error('Add user error:', err);
            setError(err.message || 'حدث خطأ أثناء إضافة المستخدم');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (user) => {
        if (!window.confirm(`هل أنت متأكد من حذف المستخدم "${user.name || user.username}"؟`)) return;

        setError('');
        setDeletingId(user.id);

        try {
            const response = await fetch(`${API_URL}/users/delete/${user.id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            const data = await response.json();

            if (response.status === 401) {
                setError('انتهت جلسة تسجيل الدخول أو الـ Token غير صالح.');
                return;
            }
            if (response.status === 403) {
                setError('ليس لديك صلاحية لحذف المستخدمين.');
                return;
            }
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'فشل حذف المستخدم');
            }

            showSuccess('تم حذف المستخدم بنجاح.');
            await fetchUsers();
        } catch (err) {
            console.error('Delete user error:', err);
            setError(err.message || 'حدث خطأ أثناء حذف المستخدم');
        } finally {
            setDeletingId(null);
        }
    };

    const getEmployeeName = (employeeId) => {
        if (!employeeId) return '-';
        const employee = employees.find((item) => Number(item.id) === Number(employeeId));
        return employee ? employee.name : `#${employeeId}`;
    };

    return (
        <div>
            <PageHeader
                icon={ShieldCheck}
                title="المستخدمون والصلاحيات"
                desc="حسابات الدخول إلى النظام ودور كل حساب - يظهر هذا القسم لمدير النظام فقط"
            >
                <button type="button" className="btn btn-primary" onClick={() => { setError(''); setShowForm(true); }}>
                    <UserPlus size={15} />
                    إضافة مستخدم
                </button>
            </PageHeader>

            {error && <Alert type="error">{error}</Alert>}
            {success && <Alert type="success">{success}</Alert>}

            <Card
                icon={ShieldCheck}
                title="حسابات النظام"
                desc="كل من يمكنه تسجيل الدخول إلى النظام"
                actions={<span className="pill-count">{users.length} مستخدم</span>}
                flush
            >
                {loading ? (
                    <Loading text="جاري تحميل المستخدمين..." />
                ) : users.length === 0 ? (
                    <Empty
                        icon={ShieldCheck}
                        title="لا يوجد مستخدمون"
                        text="أضف حسابات للمديرين أو موظفي الموارد البشرية من زر إضافة مستخدم بالأعلى."
                    />
                ) : (
                    <div className="tbl-wrap">
                        <table className="tbl">
                            <thead>
                                <tr>
                                    <th className="c" style={{ width: 60 }}>ID</th>
                                    <th>الاسم</th>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th className="c">الصلاحية</th>
                                    <th className="c">الموظف المرتبط</th>
                                    <th className="c" style={{ width: 110 }}>العمليات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td className="c muted">{user.id}</td>
                                        <td className="cell-main nowrap">{user.name || '-'}</td>
                                        <td className="num">{user.username || '-'}</td>
                                        <td className="num">{user.email || '-'}</td>
                                        <td className="c">
                                            <Badge tone={roleTones[user.role] || 'gray'}>
                                                {roleLabels[user.role] || user.role || '-'}
                                            </Badge>
                                        </td>
                                        <td className="c">{getEmployeeName(user.employee_id)}</td>
                                        <td className="c">
                                            <button
                                                type="button"
                                                className="btn btn-danger btn-sm"
                                                disabled={deletingId === user.id}
                                                onClick={() => handleDelete(user)}
                                            >
                                                <Trash2 size={13} />
                                                {deletingId === user.id ? 'جاري...' : 'حذف'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal
                open={showForm}
                onClose={() => !saving && setShowForm(false)}
                title="إضافة مستخدم جديد"
                sub="حساب دخول جديد للنظام مع تحديد صلاحيته"
                footer={
                    <>
                        <button type="submit" form="user-form" className="btn btn-primary" disabled={saving}>
                            {saving ? 'جاري الحفظ...' : 'حفظ المستخدم'}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)} disabled={saving}>
                            إلغاء
                        </button>
                    </>
                }
            >
                <form id="user-form" onSubmit={handleSubmit}>
                    <div className="form-grid mb">
                        <Field label="الاسم" required>
                            <input className="input" name="name" value={formData.name} onChange={handleChange} placeholder="اسم المستخدم" />
                        </Field>
                        <Field label="اسم الدخول (Username)" required>
                            <input className="input ltr" name="username" value={formData.username} onChange={handleChange} placeholder="username" />
                        </Field>
                    </div>
                    <div className="field mb">
                        <label className="field-label">البريد الإلكتروني <span className="req">*</span></label>
                        <input className="input ltr" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="name@example.com" />
                    </div>
                    <div className="form-grid mb">
                        <Field label="كلمة المرور" required hint="6 أحرف على الأقل">
                            <input className="input ltr" type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••" />
                        </Field>
                        <Field label="الصلاحية" required>
                            <select className="select" name="role" value={formData.role} onChange={handleChange}>
                                <option value="admin">مدير النظام</option>
                                <option value="hr">الموارد البشرية</option>
                                <option value="manager">مدير</option>
                                <option value="employee">موظف</option>
                            </select>
                        </Field>
                    </div>
                    {formData.role === 'employee' && (
                        <Field label="الموظف المرتبط" required hint="يربط الحساب بملف موظف من سجل الموظفين">
                            <select className="select" name="employee_id" value={formData.employee_id} onChange={handleChange}>
                                <option value="">اختر الموظف</option>
                                {employees.map((emp) => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                        </Field>
                    )}
                </form>
            </Modal>
        </div>
    );
}
