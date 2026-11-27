import React, { useEffect, useState } from 'react';
import { CircleDollarSign, Plus, Trash2 } from 'lucide-react';
import { PageHeader, Card, Field, Empty, Alert, Loading, Badge, API_URL } from './ui';

const formatDate = (date) => {
    if (!date) return '-';
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return '-';
    return parsedDate.toLocaleDateString('en-GB');
};

function getToday() {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
}

const TYPE_OPTIONS = ['سلفة مالية', 'إضافة ساعات', 'خصم ساعات', 'جزاء إداري / خصم', 'مكافأة استثنائية'];

const typeTone = (type) => {
    if (type === 'مكافأة استثنائية' || type === 'إضافة ساعات') return 'green';
    if (type === 'سلفة مالية') return 'amber';
    return 'red';
};

export default function LoansAndDeductions() {
    const [records, setRecords] = useState([]);
    const [employees, setEmployees] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const [formData, setFormData] = useState({
        employee_id: '',
        type: 'سلفة مالية',
        value: '',
        details: '',
        date: getToday(),
        notes: '',
    });

    const getHeaders = () => ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('hr_token')}`,
    });

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    const loadEmployees = async () => {
        try {
            const response = await fetch(`${API_URL}/api/employees`, { headers: getHeaders() });
            if (response.status === 401) throw new Error('جلسة الدخول انتهت، برجاء تسجيل الدخول مرة أخرى');
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'حدث خطأ أثناء جلب الموظفين');
            setEmployees(Array.isArray(data) ? data : data.employees || []);
        } catch (error) {
            console.error('LOAD EMPLOYEES ERROR:', error);
            showMessage(error.message || 'تعذر تحميل الموظفين', 'error');
        }
    };

    const loadRecords = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/loans-deductions`, { headers: getHeaders() });
            if (response.status === 401) throw new Error('جلسة الدخول انتهت، برجاء تسجيل الدخول مرة أخرى');
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'حدث خطأ أثناء جلب المعاملات');
            setRecords(Array.isArray(data.records) ? data.records : []);
        } catch (error) {
            console.error('LOAD RECORDS ERROR:', error);
            setRecords([]);
            showMessage(error.message || 'تعذر تحميل المعاملات المالية', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEmployees();
        loadRecords();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((previous) => ({ ...previous, [name]: value }));
    };

    const resetForm = () => {
        setFormData({ employee_id: '', type: 'سلفة مالية', value: '', details: '', date: getToday(), notes: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.employee_id) {
            showMessage('من فضلك اختر الموظف', 'error');
            return;
        }
        if (!formData.value.trim()) {
            showMessage('من فضلك أدخل قيمة المعاملة', 'error');
            return;
        }
        if (!formData.date) {
            showMessage('من فضلك اختر تاريخ المعاملة', 'error');
            return;
        }

        try {
            setSaving(true);

            const response = await fetch(`${API_URL}/api/loans-deductions`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    employee_id: Number(formData.employee_id),
                    type: formData.type,
                    value: formData.value.trim(),
                    details: formData.details.trim() || null,
                    date: formData.date,
                    status: 'نشطة',
                    notes: formData.notes.trim() || null,
                }),
            });

            if (response.status === 401) throw new Error('جلسة الدخول انتهت، برجاء تسجيل الدخول مرة أخرى');
            if (response.status === 403) throw new Error('ليس لديك صلاحية لإضافة هذه المعاملة');

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'حدث خطأ أثناء تسجيل المعاملة');

            showMessage('تم تسجيل المعاملة وحفظها في قاعدة البيانات', 'success');
            resetForm();
            await loadRecords();
        } catch (error) {
            console.error('SAVE TRANSACTION ERROR:', error);
            showMessage(error.message || 'حدث خطأ أثناء حفظ المعاملة', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('هل أنت متأكد من حذف هذه المعاملة؟')) return;

        try {
            const response = await fetch(`${API_URL}/api/loans-deductions/${id}`, {
                method: 'DELETE',
                headers: getHeaders(),
            });

            if (response.status === 401) throw new Error('جلسة الدخول انتهت، برجاء تسجيل الدخول مرة أخرى');
            if (response.status === 403) throw new Error('ليس لديك صلاحية لحذف هذه المعاملة');

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'حدث خطأ أثناء حذف المعاملة');

            showMessage('تم حذف المعاملة من قاعدة البيانات', 'success');
            await loadRecords();
        } catch (error) {
            console.error('DELETE TRANSACTION ERROR:', error);
            showMessage(error.message || 'حدث خطأ أثناء حذف المعاملة', 'error');
        }
    };

    return (
        <div>
            <PageHeader
                icon={CircleDollarSign}
                title="السلف والخصومات"
                desc="تسجيل السلف المالية والجزاءات والمكافآت وساعات الإضافي - تدخل تلقائيًا في حساب المرتبات"
            />

            {message.text && <Alert type={message.type}>{message.text}</Alert>}

            <Card icon={Plus} title="تسجيل معاملة جديدة" desc="اختر الموظف ونوع المعاملة وقيمتها">
                <form onSubmit={handleSubmit}>
                    <div className="form-grid-3">
                        <Field label="الموظف" required>
                            <select className="select" name="employee_id" value={formData.employee_id} onChange={handleChange}>
                                <option value="">اختر الموظف</option>
                                {employees.map((emp) => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="نوع المعاملة" required>
                            <select className="select" name="type" value={formData.type} onChange={handleChange}>
                                {TYPE_OPTIONS.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="القيمة" required hint="مبلغ بالجنيه أو عدد ساعات حسب النوع">
                            <input className="input ltr" name="value" value={formData.value} onChange={handleChange} placeholder="0" />
                        </Field>
                        <Field label="التاريخ" required>
                            <input className="input" type="date" name="date" value={formData.date} onChange={handleChange} />
                        </Field>
                        <Field label="التفاصيل" hint="اختياري - سبب المعاملة">
                            <input className="input" name="details" value={formData.details} onChange={handleChange} placeholder="مثال: سلفة على الراتب" />
                        </Field>
                        <Field label="ملاحظات" hint="اختياري">
                            <input className="input" name="notes" value={formData.notes} onChange={handleChange} placeholder="ملاحظات إضافية" />
                        </Field>
                    </div>
                    <div className="mt">
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            <Plus size={15} />
                            {saving ? 'جاري الحفظ...' : 'تسجيل المعاملة'}
                        </button>
                    </div>
                </form>
            </Card>

            <Card
                icon={CircleDollarSign}
                title="سجل المعاملات"
                desc="كل السلف والخصومات والمكافآت المسجلة"
                actions={<span className="pill-count">{records.length} سجل</span>}
                flush
            >
                {loading ? (
                    <Loading text="جاري تحميل المعاملات..." />
                ) : records.length === 0 ? (
                    <Empty
                        icon={CircleDollarSign}
                        title="لا توجد معاملات مسجلة"
                        text="سجل أول سلفة أو خصم أو مكافأة من النموذج بالأعلى، وستظهر هنا وفي كشوف المرتبات."
                    />
                ) : (
                    <div className="tbl-wrap">
                        <table className="tbl">
                            <thead>
                                <tr>
                                    <th>الموظف</th>
                                    <th className="c">النوع</th>
                                    <th>القيمة</th>
                                    <th>التفاصيل</th>
                                    <th>التاريخ</th>
                                    <th className="c">الحالة</th>
                                    <th>ملاحظات</th>
                                    <th className="c">العمليات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((record) => (
                                    <tr key={record.id}>
                                        <td className="cell-main nowrap">{record.employee_name || record.name || `#${record.employee_id}`}</td>
                                        <td className="c"><Badge tone={typeTone(record.type)}>{record.type}</Badge></td>
                                        <td className="nowrap strong">{record.value}</td>
                                        <td>{record.details || '-'}</td>
                                        <td className="nowrap">{formatDate(record.date)}</td>
                                        <td className="c"><Badge tone="blue">{record.status || 'نشطة'}</Badge></td>
                                        <td>{record.notes || '-'}</td>
                                        <td className="c">
                                            <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(record.id)}>
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
