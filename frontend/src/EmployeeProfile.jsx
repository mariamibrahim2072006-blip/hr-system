import React, { useEffect, useState } from 'react';

const API_URL = 'http://localhost:5000';

const departmentsList = [
    { id: 1, name: 'قسم تطوير البرمجيات (Software Development)' },
    { id: 2, name: 'قسم الموارد البشرية (HR)' },
    { id: 3, name: 'قسم التسويق والمبيعات' }
];

const getDepartmentName = (departmentId) => {
    if (!departmentId) return 'غير محدد';
    const dept = departmentsList.find(
        (item) => Number(item.id) === Number(departmentId)
    );
    return dept ? dept.name.split(' ')[0] + ' ' + (dept.name.split(' ')[1] || '') : 'غير محدد';
};

export default function EmployeeProfile({ onEditEmployee }) {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });

    // Search and Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState('');

    const getToken = () => localStorage.getItem('hr_token');

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await fetch(`${API_URL}/api/employees`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || data.error || 'حدث خطأ أثناء جلب الموظفين'
                );
            }

            if (Array.isArray(data)) {
                setEmployees(data);
            } else if (Array.isArray(data.employees)) {
                setEmployees(data.employees);
            } else if (Array.isArray(data.data)) {
                setEmployees(data.data);
            } else {
                setEmployees([]);
            }
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
        const confirmed = window.confirm('هل أنت متأكد من حذف هذا الموظف؟');
        if (!confirmed) return;

        try {
            setError('');
            const response = await fetch(`${API_URL}/api/employees/delete/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                },
            });

            let data = {};
            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (!response.ok) {
                throw new Error(data.message || data.error || 'حدث خطأ أثناء حذف الموظف');
            }

            setMessage({ text: 'تم حذف الموظف بنجاح', type: 'success' });
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

    // Filter employees based on Search term and Department
    const filteredEmployees = employees.filter((emp) => {
        const matchesSearch =
            (emp.name && emp.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (emp.phone && emp.phone.includes(searchTerm));

        const matchesDept = selectedDept
            ? Number(emp.department_id) === Number(selectedDept)
            : true;

        return matchesSearch && matchesDept;
    });

    const inputStyle = {
        padding: '10px 14px',
        textAlign: 'right',
        border: '1px solid #cbd5e1',
        borderRadius: '7px',
        outline: 'none',
        fontSize: '13px',
        background: '#fff',
        boxSizing: 'border-box'
    };

    return (
        <div
            style={{
                padding: '24px',
                direction: 'rtl',
                fontFamily: 'Tahoma, Arial, sans-serif',
                background: '#f8fafc',
                minHeight: '100vh',
                boxSizing: 'border-box'
            }}
        >
            {/* PAGE HEADER */}
            <div
                style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '16px 24px',
                    marginBottom: '24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}
            >
                <div>
                    <h2
                        style={{
                            margin: 0,
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: '#1e293b'
                        }}
                    >
                        إدارة الموظفين
                    </h2>
                    <p
                        style={{
                            margin: '4px 0 0',
                            fontSize: '12px',
                            color: '#64748b'
                        }}
                    >
                        عرض ومتابعة بيانات جميع الموظفين المسجلين في النظام
                    </p>
                </div>

                {message.text && (
                    <div
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                            color: message.type === 'success' ? '#166534' : '#991b1b'
                        }}
                    >
                        {message.text}
                    </div>
                )}
            </div>

            {/* ERROR */}
            {error && (
                <div
                    style={{
                        background: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #fecaca',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '18px',
                        fontSize: '13px',
                        fontWeight: 'bold'
                    }}
                >
                    {error}
                </div>
            )}

            {/* SEARCH & FILTER BAR */}
            <div
                style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '16px 20px',
                    marginBottom: '20px',
                    display: 'flex',
                    gap: '15px',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                }}
            >
                <div style={{ flex: '1', minWidth: '240px' }}>
                    <input
                        type="text"
                        placeholder="ابحث بالاسم أو رقم الهاتف..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ ...inputStyle, width: '100%' }}
                    />
                </div>

                <div style={{ minWidth: '220px' }}>
                    <select
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        style={{ ...inputStyle, width: '100%' }}
                    >
                        <option value="">جميع الأقسام الإدارية</option>
                        {departmentsList.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                                {dept.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* EMPLOYEES TABLE */}
            <div
                style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                        gap: '15px'
                    }}
                >
                    <h4
                        style={{
                            margin: 0,
                            fontSize: '15px',
                            color: '#1e293b',
                            fontWeight: 'bold'
                        }}
                    >
                        قائمة الموظفين
                    </h4>

                    <span
                        style={{
                            background: '#e0f2fe',
                            color: '#0369a1',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}
                    >
                        إجمالي الظاهر: {filteredEmployees.length} من {employees.length}
                    </span>
                </div>

                {loading ? (
                    <div
                        style={{
                            padding: '40px',
                            textAlign: 'center',
                            color: '#64748b',
                            fontSize: '13px'
                        }}
                    >
                        جاري تحميل الموظفين...
                    </div>
                ) : filteredEmployees.length === 0 ? (
                    <div
                        style={{
                            padding: '40px',
                            textAlign: 'center',
                            color: '#64748b',
                            fontSize: '13px'
                        }}
                    >
                        لا توجد نتائج مطابقة للبحث
                    </div>
                ) : (
                    <div style={{ width: '100%', overflowX: 'auto' }}>
                        <table
                            style={{
                                width: '100%',
                                minWidth: '1100px',
                                borderCollapse: 'collapse',
                                textAlign: 'right',
                                fontSize: '13px'
                            }}
                        >
                            <thead>
                                <tr
                                    style={{
                                        background: '#f1f5f9',
                                        color: '#475569'
                                    }}
                                >
                                    <th style={{ padding: '12px 14px', borderBottom: '2px solid #e2e8f0' }}>الاسم</th>
                                    <th style={{ padding: '12px 14px', borderBottom: '2px solid #e2e8f0' }}>الهاتف</th>
                                    <th style={{ padding: '12px 14px', borderBottom: '2px solid #e2e8f0' }}>القسم</th>
                                    <th style={{ padding: '12px 14px', borderBottom: '2px solid #e2e8f0' }}>الجنسية</th>
                                    <th style={{ padding: '12px 14px', borderBottom: '2px solid #e2e8f0' }}>تاريخ التعاقد</th>
                                    <th style={{ padding: '12px 14px', borderBottom: '2px solid #e2e8f0' }}>الراتب</th>
                                    <th style={{ padding: '12px 14px', borderBottom: '2px solid #e2e8f0' }}>الحضور والانصراف</th>
                                    <th style={{ padding: '12px 14px', borderBottom: '2px solid #e2e8f0', textAlign: 'center', width: '120px' }}>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.map((employee, idx) => (
                                    <tr
                                        key={employee.id}
                                        style={{
                                            background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                                            borderBottom: '1px solid #f1f5f9'
                                        }}
                                    >
                                        <td style={{ padding: '12px 14px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap' }}>
                                            {employee.name || '-'}
                                        </td>
                                        <td style={{ padding: '12px 14px', color: '#475569', direction: 'ltr', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            {employee.phone || '-'}
                                        </td>
                                        <td style={{ padding: '12px 14px', color: '#0284c7', fontWeight: '600' }}>
                                            {getDepartmentName(employee.department_id)}
                                        </td>
                                        <td style={{ padding: '12px 14px', color: '#475569' }}>
                                            {employee.nationality || '-'}
                                        </td>
                                        <td style={{ padding: '12px 14px', color: '#475569', whiteSpace: 'nowrap' }}>
                                            {formatDate(employee.contract_date)}
                                        </td>
                                        <td style={{ padding: '12px 14px', color: '#16a34a', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                            {Number(employee.salary || 0).toLocaleString('en-US')} ج.م
                                        </td>
                                        <td style={{ padding: '12px 14px', color: '#475569', fontWeight: '600', direction: 'ltr', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            {employee.attendance_time ? String(employee.attendance_time).slice(0, 5) : '--:--'} {' ➔ '}
                                            {employee.departure_time ? String(employee.departure_time).slice(0, 5) : '--:--'}
                                        </td>
                                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(employee.id)}
                                                style={{
                                                    background: '#fee2e2',
                                                    color: '#991b1b',
                                                    border: '1px solid #fecaca',
                                                    padding: '5px 14px',
                                                    cursor: 'pointer',
                                                    borderRadius: '5px',
                                                    fontSize: '12px',
                                                    fontWeight: '600'
                                                }}
                                            >
                                                حذف
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}