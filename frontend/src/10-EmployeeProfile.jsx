import React, { useEffect, useState } from 'react';
import { Users, Search, Trash2, UserPlus } from 'lucide-react';
import { PageHeader, Card, Empty, Alert, Loading, API_URL, extractArray } from './ui';

const departmentsList = [
    { id: 1, name: 'قسم تطوير البرمجيات (Software Development)' },
    { id: 2, name: 'قسم الموارد البشرية (HR)' },
    { id: 3, name: 'قسم التسويق والمبيعات' },
];

const getDepartmentName = (departmentId) => {
    if (!departmentId) return 'غير محدد';
    const dept = departmentsList.find((item) => Number(item.id) === Number(departmentId));
    return dept ? dept.name : 'غير محدد';
};

export default function EmployeeProfile({ onNavigate }) {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState('');

    const getToken = () => localStorage.getItem('hr_token');

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await fetch(`${API_URL}/api/employees`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'حدث خطأ أثناء جلب الموظفين');
            }

            setEmployees(extractArray(data, ['employees']));
        } catch (err) {
            console.error('FETCH EMPLOYEES ERROR:', err);
            setError(err.message || 'تعذر الاتصال بالسيرفر');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;

        try {
            setError('');
            const response = await fetch(`${API_URL}/api/employees/delete/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${getToken()}` },
            });

            let data = {};
            try { data = await response.json(); } catch { data = {}; }

            if (!response.ok) {
                throw new Error(data.message || data.error || 'حدث خطأ أثناء حذف الموظف');
            }

            setMessage({ text: 'تم حذف الموظف بنجاح', type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 3500);
            await fetchEmployees();
        } catch (err) {
            console.error('DELETE EMPLOYEE ERROR:', err);
            setError(err.message || 'حدث خطأ أثناء حذف الموظف');
        }
    };

    const formatDate = (date) => {
        if (!date) return '-';
        const value = String(date).slice(0, 10);
        if (value === '0000-00-00') return '-';
        return value;
    };

    const filteredEmployees = employees.filter((emp) => {
        const matchesSearch =
            (emp.name && emp.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (emp.phone && emp.phone.includes(searchTerm));
        const matchesDept = selectedDept ? Number(emp.department_id) === Number(selectedDept) : true;
        return matchesSearch && matchesDept;
    });

    return (
        <div>
            <PageHeader
                icon={Users}
                title="سجل الموظفين"
                desc="كل الموظفين المسجلين في النظام مع بيانات التواصل والقسم والراتب ومواعيد العمل"
            >
                {onNavigate && (
                    <button type="button" className="btn btn-primary" onClick={() => onNavigate('addEmployee')}>
                        <UserPlus size={15} />
                        إضافة موظف
                    </button>
                )}
            </PageHeader>

            {message.text && <Alert type={message.type}>{message.text}</Alert>}
            {error && <Alert type="error">{error}</Alert>}

            <Card flush>
                <div className="card-body" style={{ borderBottom: '1px solid var(--line-soft)' }}>
                    <div className="toolbar">
                        <div className="search-box grow">
                            <span className="search-box-icon"><Search size={15} /></span>
                            <input
                                className="input"
                                type="text"
                                placeholder="ابحث بالاسم أو رقم الهاتف..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="select"
                            style={{ width: 'auto', minWidth: 200 }}
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                        >
                            <option value="">جميع الأقسام</option>
                            {departmentsList.map((dept) => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                        <span className="pill-count">الظاهر: {filteredEmployees.length} من {employees.length}</span>
                    </div>
                </div>

                {loading ? (
                    <Loading text="جاري تحميل الموظفين..." />
                ) : filteredEmployees.length === 0 ? (
                    <Empty
                        icon={Users}
                        title={employees.length === 0 ? 'لا يوجد موظفون بعد' : 'لا توجد نتائج مطابقة'}
                        text={
                            employees.length === 0
                                ? 'ابدأ بإضافة أول موظف من زر "إضافة موظف" بالأعلى. بعد الإضافة ستظهر بياناته هنا.'
                                : 'جرّب كلمة بحث مختلفة أو غيّر القسم المحدد.'
                        }
                        action={
                            employees.length === 0 && onNavigate ? (
                                <button type="button" className="btn btn-primary" onClick={() => onNavigate('addEmployee')}>
                                    <UserPlus size={15} />
                                    إضافة أول موظف
                                </button>
                            ) : null
                        }
                    />
                ) : (
                    <div className="tbl-wrap">
                        <table className="tbl">
                            <thead>
                                <tr>
                                    <th>الاسم</th>
                                    <th>الهاتف</th>
                                    <th>القسم</th>
                                    <th>الجنسية</th>
                                    <th>تاريخ التعاقد</th>
                                    <th>الراتب</th>
                                    <th>الحضور والانصراف</th>
                                    <th className="c">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.map((employee) => (
                                    <tr key={employee.id}>
                                        <td className="cell-main nowrap">{employee.name || '-'}</td>
                                        <td className="num nowrap">{employee.phone || '-'}</td>
                                        <td>{getDepartmentName(employee.department_id)}</td>
                                        <td>{employee.nationality || '-'}</td>
                                        <td className="nowrap">{formatDate(employee.contract_date)}</td>
                                        <td className="nowrap" style={{ color: 'var(--success-ink)', fontWeight: 800 }}>
                                            {Number(employee.salary || 0).toLocaleString('en-US')} ج.م
                                        </td>
                                        <td className="num nowrap">
                                            {employee.attendance_time ? String(employee.attendance_time).slice(0, 5) : '--:--'}
                                            {' ← '}
                                            {employee.departure_time ? String(employee.departure_time).slice(0, 5) : '--:--'}
                                        </td>
                                        <td className="c">
                                            <button
                                                type="button"
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleDelete(employee.id)}
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
