import React, { useEffect, useState } from 'react';
import { CalendarDays, Plus, Check, X, Trash2 } from 'lucide-react';
import { PageHeader, Card, Field, Empty, Alert, Loading, Badge, Modal, API_URL, getToday } from './ui';

const getToken = () => localStorage.getItem('hr_token');
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const formatDate = (value) => {
    if (!value) return '-';
    const dateOnly = String(value).split('T')[0];
    const parts = dateOnly.split('-');
    if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    }
    return dateOnly;
};

const LEAVE_TYPES = ['إجازة سنوية', 'إجازة مرضية', 'إجازة عارضة', 'إجازة بدون راتب', 'إجازة رسمية'];

const statusTone = (status) => {
    if (status === 'مقبول') return 'green';
    if (status === 'مرفوض') return 'red';
    return 'amber';
};

export default function Holidays() {
    const [leaves, setLeaves] = useState([]);
    const [employees, setEmployees] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const [form, setForm] = useState({
        employee_id: '',
        type: 'إجازة سنوية',
        start_date: getToday(),
        end_date: getToday(),
        reason: '',
    });

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3500);
    };

    const readResponse = async (response) => {
        const text = await response.text();
        if (!text) return {};
        try {
            return JSON.parse(text);
        } catch {
            return { message: text };
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await fetch(`${API_URL}/api/employees`, { headers: authHeaders() });
            if (response.status === 401) {
                showMessage('انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.', 'error');
                return;
            }
            const data = await readResponse(response);
            if (!response.ok || data.success === false) throw new Error(data.message || 'فشل تحميل الموظفين');
            const list = Array.isArray(data) ? data : data.employees || data.data || [];
            setEmployees(list);
        } catch (error) {
            console.error('Employees error:', error);
            showMessage(error.message || 'فشل تحميل الموظفين', 'error');
        }
    };

    const fetchLeaves = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/leaves`, { headers: authHeaders() });
            if (response.status === 401) {
                showMessage('انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.', 'error');
                return;
            }
            const data = await readResponse(response);
            if (!response.ok || data.success === false) throw new Error(data.message || 'فشل تحميل الإجازات');
            const list = Array.isArray(data) ? data : data.leaves || data.data || [];
            setLeaves(list);
        } catch (error) {
            console.error('Leaves error:', error);
            showMessage(error.message || 'فشل تحميل الإجازات', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
        fetchLeaves();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const employeeId = form.employee_id;
        const leaveType = form.type;
        const startDate = form.start_date;
        const endDate = form.end_date;
        const reason = form.reason.trim();

        if (!employeeId) {
            showMessage('من فضلك اختر الموظف', 'error');
            return;
        }
        if (!startDate || !endDate) {
            showMessage('من فضلك اختر تاريخ البداية والنهاية', 'error');
            return;
        }
        if (endDate < startDate) {
            showMessage('تاريخ النهاية يجب أن يكون بعد تاريخ البداية', 'error');
            return;
        }

        const selectedEmployee = employees.find((employee) => Number(employee.id) === Number(employeeId));
        if (!selectedEmployee) {
            showMessage('الموظف المختار غير موجود في قائمة الموظفين', 'error');
            return;
        }

        setSaving(true);

        try {
            const employeeName = String(selectedEmployee.name || '').trim();

            const payload = {
                employee_id: Number(employeeId),
                employeeId: Number(employeeId),
                employee_name: employeeName,
                employeeName: employeeName,
                type: leaveType,
                leave_type: leaveType,
                start_date: startDate,
                startDate: startDate,
                end_date: endDate,
                endDate: endDate,
                reason: reason,
            };

            const response = await fetch(`${API_URL}/api/leaves`, {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.status === 401) {
                showMessage('انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.', 'error');
                return;
            }

            const data = await readResponse(response);
            if (!response.ok || data.success === false) {
                throw new Error(data.message || data.error || 'فشل حفظ طلب الإجازة');
            }

            showMessage('تم تسجيل طلب الإجازة بنجاح');
            setIsModalOpen(false);
            setForm({ employee_id: '', type: 'إجازة سنوية', start_date: getToday(), end_date: getToday(), reason: '' });
            await fetchLeaves();
        } catch (error) {
            console.error('Leave submit error:', error);
            showMessage(error.message || 'حدث خطأ أثناء حفظ الإجازة', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (id, status) => {
        try {
            const response = await fetch(`${API_URL}/api/leaves/${id}/status`, {
                method: 'PUT',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });

            if (response.status === 401) {
                showMessage('انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.', 'error');
                return;
            }

            const data = await readResponse(response);
            if (!response.ok || data.success === false) {
                throw new Error(data.message || data.error || 'فشل تحديث حالة الإجازة');
            }

            await fetchLeaves();
            showMessage(`تم تحديث حالة الإجازة إلى (${status}) بنجاح`);
        } catch (error) {
            console.error('Leave status error:', error);
            showMessage(error.message || 'حدث خطأ أثناء تحديث الحالة', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('هل أنت متأكد من حذف طلب الإجازة؟')) return;

        try {
            const response = await fetch(`${API_URL}/api/leaves/${id}`, {
                method: 'DELETE',
                headers: authHeaders(),
            });

            if (response.status === 401) {
                showMessage('انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.', 'error');
                return;
            }

            const data = await readResponse(response);
            if (!response.ok || data.success === false) {
                throw new Error(data.message || data.error || 'فشل حذف الإجازة');
            }

            showMessage('تم حذف طلب الإجازة بنجاح');
            await fetchLeaves();
        } catch (error) {
            console.error('Leave delete error:', error);
            showMessage(error.message || 'حدث خطأ أثناء حذف الإجازة', 'error');
        }
    };

    const getEmployeeName = (leave) => {
        if (leave.employee_name) return leave.employee_name;
        if (leave.employeeName) return leave.employeeName;
        const employee = employees.find(
            (item) => Number(item.id) === Number(leave.employee_id ?? leave.employeeId)
        );
        return employee?.name || '-';
    };

    const getType = (leave) => leave.type || leave.leave_type || '-';
    const getStartDate = (leave) => leave.start_date || leave.startDate || '-';
    const getEndDate = (leave) => leave.end_date || leave.endDate || '-';
    const getStatus = (leave) => leave.status || 'معلق';

    const pendingCount = leaves.filter((l) => getStatus(l) === 'معلق').length;

    return (
        <div>
            <PageHeader
                icon={CalendarDays}
                title="الإجازات والعطلات"
                desc="طلبات إجازات الموظفين - راجعها ووافق عليها أو ارفضها من مكان واحد"
            >
                <button type="button" className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                    <Plus size={15} />
                    تسجيل طلب إجازة
                </button>
            </PageHeader>

            {message.text && <Alert type={message.type}>{message.text}</Alert>}

            <Card
                icon={CalendarDays}
                title="طلبات الإجازات"
                desc={pendingCount > 0 ? `لديك ${pendingCount} طلب بانتظار المراجعة` : 'كل الطلبات مسجلة هنا'}
                actions={<span className="pill-count">{leaves.length} طلب</span>}
                flush
            >
                {loading ? (
                    <Loading text="جاري تحميل طلبات الإجازات..." />
                ) : leaves.length === 0 ? (
                    <Empty
                        icon={CalendarDays}
                        title="لا توجد طلبات إجازات"
                        text="عندما يقدم موظف طلب إجازة من بوابة الموظفين سيظهر هنا للمراجعة، أو سجل طلبًا بنفسك من الزر بالأعلى."
                        action={
                            <button type="button" className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                                <Plus size={15} />
                                تسجيل طلب إجازة
                            </button>
                        }
                    />
                ) : (
                    <div className="tbl-wrap">
                        <table className="tbl">
                            <thead>
                                <tr>
                                    <th>اسم الموظف</th>
                                    <th>نوع الإجازة</th>
                                    <th>من</th>
                                    <th>إلى</th>
                                    <th>السبب</th>
                                    <th className="c">الحالة</th>
                                    <th className="c">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaves.map((leave) => {
                                    const status = getStatus(leave);
                                    const id = leave.id ?? leave.leave_id;
                                    return (
                                        <tr key={id}>
                                            <td className="cell-main nowrap">{getEmployeeName(leave)}</td>
                                            <td>{getType(leave)}</td>
                                            <td className="nowrap">{formatDate(getStartDate(leave))}</td>
                                            <td className="nowrap">{formatDate(getEndDate(leave))}</td>
                                            <td>{leave.reason || '-'}</td>
                                            <td className="c"><Badge tone={statusTone(status)}>{status}</Badge></td>
                                            <td className="c">
                                                <div className="row-actions">
                                                    {status !== 'مقبول' && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-success btn-sm"
                                                            onClick={() => handleStatusChange(id, 'مقبول')}
                                                        >
                                                            <Check size={13} />
                                                            قبول
                                                        </button>
                                                    )}
                                                    {status !== 'مرفوض' && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => handleStatusChange(id, 'مرفوض')}
                                                        >
                                                            <X size={13} />
                                                            رفض
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => handleDelete(id)}
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal
                open={isModalOpen}
                onClose={() => !saving && setIsModalOpen(false)}
                title="تسجيل طلب إجازة"
                sub="تسجيل إجازة لموظف من الإدارة"
                footer={
                    <>
                        <button type="submit" form="leave-form" className="btn btn-primary" disabled={saving}>
                            {saving ? 'جاري الحفظ...' : 'حفظ الطلب'}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)} disabled={saving}>
                            إلغاء
                        </button>
                    </>
                }
            >
                <form id="leave-form" onSubmit={handleSubmit}>
                    <div className="field mb">
                        <label className="field-label">الموظف <span className="req">*</span></label>
                        <select
                            className="select"
                            value={form.employee_id}
                            onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                        >
                            <option value="">اختر الموظف</option>
                            {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="field mb">
                        <label className="field-label">نوع الإجازة</label>
                        <select
                            className="select"
                            value={form.type}
                            onChange={(e) => setForm({ ...form, type: e.target.value })}
                        >
                            {LEAVE_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-grid mb">
                        <Field label="من تاريخ" required>
                            <input
                                className="input"
                                type="date"
                                value={form.start_date}
                                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                            />
                        </Field>
                        <Field label="إلى تاريخ" required>
                            <input
                                className="input"
                                type="date"
                                value={form.end_date}
                                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                            />
                        </Field>
                    </div>

                    <Field label="السبب" hint="اختياري">
                        <textarea
                            className="textarea"
                            value={form.reason}
                            onChange={(e) => setForm({ ...form, reason: e.target.value })}
                            placeholder="سبب طلب الإجازة..."
                        />
                    </Field>
                </form>
            </Modal>
        </div>
    );
}
