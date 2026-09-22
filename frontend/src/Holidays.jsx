
import React, { useEffect, useState } from 'react';

const API_URL = 'http://localhost:5000';

const getToken = () => localStorage.getItem('hr_token');

const authHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
});

const getToday = () => new Date().toISOString().split('T')[0];

// =========================================================
// Format DB date safely without timezone conversion
// =========================================================

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

export default function Holidays() {
    const [leaves, setLeaves] = useState([]);
    const [employees, setEmployees] = useState([]);

    const [loading, setLoading] = useState(true);
    const [loadingEmployees, setLoadingEmployees] = useState(true);
    const [saving, setSaving] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);

    const [message, setMessage] = useState({
        text: '',
        type: '',
    });

    const [form, setForm] = useState({
        employee_id: '',
        type: 'إجازة سنوية',
        start_date: getToday(),
        end_date: getToday(),
        reason: '',
    });

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });

        setTimeout(() => {
            setMessage({ text: '', type: '' });
        }, 3500);
    };

    // =========================================================
    // Safe JSON
    // =========================================================

    const readResponse = async (response) => {
        const text = await response.text();

        if (!text) {
            return {};
        }

        try {
            return JSON.parse(text);
        } catch {
            return {
                message: text,
            };
        }
    };

    // =========================================================
    // Employees
    // =========================================================

    const fetchEmployees = async () => {
        setLoadingEmployees(true);

        try {
            const response = await fetch(`${API_URL}/api/employees`, {
                headers: authHeaders(),
            });

            if (response.status === 401) {
                showMessage(
                    'انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.',
                    'error'
                );
                return;
            }

            const data = await readResponse(response);

            if (!response.ok || data.success === false) {
                throw new Error(
                    data.message || 'فشل تحميل الموظفين'
                );
            }

            const list = Array.isArray(data)
                ? data
                : data.employees || data.data || [];

            setEmployees(list);
        } catch (error) {
            console.error('Employees error:', error);

            showMessage(
                error.message || 'حدث خطأ أثناء تحميل الموظفين',
                'error'
            );
        } finally {
            setLoadingEmployees(false);
        }
    };

    // =========================================================
    // Leaves
    // =========================================================

    const fetchLeaves = async () => {
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/leaves`, {
                headers: authHeaders(),
            });

            if (response.status === 401) {
                showMessage(
                    'انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.',
                    'error'
                );
                return;
            }

            const data = await readResponse(response);

            if (!response.ok || data.success === false) {
                throw new Error(
                    data.message || 'فشل تحميل الإجازات'
                );
            }

            const list = Array.isArray(data)
                ? data
                : data.leaves || data.data || [];

            setLeaves(list);
        } catch (error) {
            console.error('Leaves error:', error);

            showMessage(
                error.message || 'حدث خطأ أثناء تحميل الإجازات',
                'error'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
        fetchLeaves();
    }, []);

    // =========================================================
    // Reset Form
    // =========================================================

    const resetForm = () => {
        setForm({
            employee_id: '',
            type: 'إجازة سنوية',
            start_date: getToday(),
            end_date: getToday(),
            reason: '',
        });
    };

    // =========================================================
    // Add Leave
    // =========================================================

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (saving) {
            return;
        }

        const employeeId = String(
            form.employee_id || ''
        ).trim();

        const startDate = String(
            form.start_date || ''
        ).trim();

        const endDate = String(
            form.end_date || ''
        ).trim();

        const leaveType = String(
            form.type || ''
        ).trim();

        const reason = String(
            form.reason || ''
        ).trim();

        // -----------------------------------------
        // Frontend validation
        // -----------------------------------------

        if (!employeeId) {
            showMessage(
                'اختاري الموظف أولًا',
                'error'
            );
            return;
        }

        if (!startDate) {
            showMessage(
                'حددي تاريخ بداية الإجازة',
                'error'
            );
            return;
        }

        if (!endDate) {
            showMessage(
                'حددي تاريخ نهاية الإجازة',
                'error'
            );
            return;
        }

        if (endDate < startDate) {
            showMessage(
                'تاريخ نهاية الإجازة لا يمكن أن يكون قبل تاريخ البداية',
                'error'
            );
            return;
        }

        if (!leaveType) {
            showMessage(
                'اختاري نوع الإجازة',
                'error'
            );
            return;
        }

        // -----------------------------------------
        // Get actual employee
        // -----------------------------------------

        const selectedEmployee = employees.find(
            (employee) =>
                Number(employee.id) === Number(employeeId)
        );

        if (!selectedEmployee) {
            showMessage(
                'الموظف المختار غير موجود في قائمة الموظفين',
                'error'
            );
            return;
        }

        setSaving(true);

        try {
            const employeeName = String(
                selectedEmployee.name || ''
            ).trim();

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

            console.log(
                'Submitting leave request:',
                payload
            );

            const response = await fetch(
                `${API_URL}/api/leaves`,
                {
                    method: 'POST',
                    headers: {
                        ...authHeaders(),
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (response.status === 401) {
                showMessage(
                    'انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.',
                    'error'
                );
                return;
            }

            const data = await readResponse(response);

            console.log(
                'Leave API response:',
                response.status,
                data
            );

            if (!response.ok || data.success === false) {
                throw new Error(
                    data.message ||
                    data.error ||
                    'فشل تسجيل الإجازة'
                );
            }

            await fetchLeaves();

            setIsModalOpen(false);
            resetForm();

            showMessage(
                'تم تسجيل طلب الإجازة وحفظه في قاعدة البيانات بنجاح'
            );
        } catch (error) {
            console.error(
                'Add leave error:',
                error
            );

            showMessage(
                error.message ||
                'حدث خطأ أثناء تسجيل الإجازة',
                'error'
            );
        } finally {
            setSaving(false);
        }
    };

    // =========================================================
    // Change Status
    // =========================================================

    const handleStatusChange = async (id, status) => {
        try {
            const response = await fetch(
                `${API_URL}/api/leaves/${id}/status`,
                {
                    method: 'PUT',
                    headers: {
                        ...authHeaders(),
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status }),
                }
            );

            if (response.status === 401) {
                showMessage(
                    'انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.',
                    'error'
                );
                return;
            }

            const data = await readResponse(response);

            if (!response.ok || data.success === false) {
                throw new Error(
                    data.message ||
                    data.error ||
                    'فشل تحديث حالة الإجازة'
                );
            }

            await fetchLeaves();

            showMessage(
                `تم تحديث حالة الإجازة إلى (${status}) بنجاح`
            );
        } catch (error) {
            console.error(
                'Leave status error:',
                error
            );

            showMessage(
                error.message ||
                'حدث خطأ أثناء تحديث الحالة',
                'error'
            );
        }
    };

    // =========================================================
    // Delete
    // =========================================================

    const handleDelete = async (id) => {
        if (
            !window.confirm(
                'هل أنت متأكد من حذف طلب الإجازة نهائيًا؟'
            )
        ) {
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/api/leaves/${id}`,
                {
                    method: 'DELETE',
                    headers: authHeaders(),
                }
            );

            if (response.status === 401) {
                showMessage(
                    'انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.',
                    'error'
                );
                return;
            }

            const data = await readResponse(response);

            if (!response.ok || data.success === false) {
                throw new Error(
                    data.message ||
                    data.error ||
                    'فشل حذف الإجازة'
                );
            }

            await fetchLeaves();

            showMessage(
                'تم حذف طلب الإجازة بنجاح'
            );
        } catch (error) {
            console.error(
                'Delete leave error:',
                error
            );

            showMessage(
                error.message ||
                'حدث خطأ أثناء حذف الإجازة',
                'error'
            );
        }
    };

    // =========================================================
    // Helpers
    // =========================================================

    const getEmployeeName = (leave) => {
        if (leave.employee_name) {
            return leave.employee_name;
        }

        if (leave.employeeName) {
            return leave.employeeName;
        }

        const employee = employees.find(
            (item) =>
                Number(item.id) ===
                Number(
                    leave.employee_id ??
                    leave.employeeId
                )
        );

        return employee?.name || '-';
    };

    const getType = (leave) =>
        leave.type ||
        leave.leave_type ||
        '-';

    const getStartDate = (leave) =>
        formatDate(
            leave.start_date ||
            leave.startDate
        );

    const getEndDate = (leave) =>
        formatDate(
            leave.end_date ||
            leave.endDate
        );

    const getReason = (leave) =>
        leave.reason || '-';

    const getStatus = (leave) =>
        leave.status || 'معلق';

    const statusStyle = (status) => {
        if (status === 'مقبول') {
            return {
                background: '#dcfce7',
                color: '#166534',
            };
        }

        if (status === 'مرفوض') {
            return {
                background: '#fee2e2',
                color: '#991b1b',
            };
        }

        return {
            background: '#fef3c7',
            color: '#b45309',
        };
    };

    return (
        <div
            style={{
                padding: '24px',
                direction: 'rtl',
                fontFamily: 'Tahoma, Arial, sans-serif',
                background: '#f8fafc',
                minHeight: '100vh',
                boxSizing: 'border-box',
            }}
        >
            {/* Header */}

            <div
                style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '18px 22px',
                    marginBottom: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                }}
            >
                <div>
                    <h2
                        style={{
                            margin: 0,
                            color: '#1e293b',
                            fontSize: '18px',
                        }}
                    >
                        إدارة الإجازات
                    </h2>

                    <p
                        style={{
                            margin: '5px 0 0',
                            color: '#64748b',
                            fontSize: '12px',
                        }}
                    >
                        تسجيل ومراجعة واعتماد طلبات الإجازات
                    </p>
                </div>

                {message.text && (
                    <span
                        style={{
                            padding: '8px 14px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            background:
                                message.type === 'error'
                                    ? '#fee2e2'
                                    : '#dcfce7',
                            color:
                                message.type === 'error'
                                    ? '#991b1b'
                                    : '#166534',
                        }}
                    >
                        {message.text}
                    </span>
                )}
            </div>

            {/* Content */}

            <div
                style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '20px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                        flexWrap: 'wrap',
                        gap: '10px',
                    }}
                >
                    <div>
                        <h4
                            style={{
                                margin: 0,
                                color: '#1e293b',
                                fontSize: '15px',
                            }}
                        >
                            طلبات الإجازات
                        </h4>

                        <p
                            style={{
                                margin: '5px 0 0',
                                color: '#64748b',
                                fontSize: '11px',
                            }}
                        >
                            البيانات المعروضة من قاعدة البيانات مباشرة
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            resetForm();
                            setMessage({
                                text: '',
                                type: '',
                            });
                            setIsModalOpen(true);
                        }}
                        style={{
                            background: '#0284c7',
                            color: '#fff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '12px',
                        }}
                    >
                        + تسجيل إجازة جديدة
                    </button>
                </div>

                <div
                    style={{
                        overflowX: 'auto',
                        width: '100%',
                    }}
                >
                    <table
                        style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '13px',
                            textAlign: 'right',
                        }}
                    >
                        <thead>
                            <tr
                                style={{
                                    background: '#f1f5f9',
                                    color: '#475569',
                                }}
                            >
                                <th style={thStyle}>
                                    اسم الموظف
                                </th>

                                <th style={thStyle}>
                                    نوع الإجازة
                                </th>

                                <th style={thStyle}>
                                    من
                                </th>

                                <th style={thStyle}>
                                    إلى
                                </th>

                                <th style={thStyle}>
                                    السبب
                                </th>

                                <th style={thStyle}>
                                    الحالة
                                </th>

                                <th
                                    style={{
                                        ...thStyle,
                                        textAlign: 'center',
                                    }}
                                >
                                    الإجراءات
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan="7"
                                        style={emptyStyle}
                                    >
                                        جاري تحميل طلبات الإجازات...
                                    </td>
                                </tr>
                            ) : leaves.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="7"
                                        style={emptyStyle}
                                    >
                                        لا توجد طلبات إجازات مسجلة حاليًا
                                    </td>
                                </tr>
                            ) : (
                                leaves.map((leave) => {
                                    const status =
                                        getStatus(leave);

                                    return (
                                        <tr
                                            key={leave.id}
                                            style={{
                                                borderBottom:
                                                    '1px solid #f1f5f9',
                                            }}
                                        >
                                            <td
                                                style={{
                                                    ...tdStyle,
                                                    fontWeight: '600',
                                                    color: '#1e293b',
                                                }}
                                            >
                                                {getEmployeeName(
                                                    leave
                                                )}
                                            </td>

                                            <td
                                                style={{
                                                    ...tdStyle,
                                                    color: '#0284c7',
                                                }}
                                            >
                                                {getType(leave)}
                                            </td>

                                            <td style={tdStyle}>
                                                {getStartDate(
                                                    leave
                                                )}
                                            </td>

                                            <td style={tdStyle}>
                                                {getEndDate(
                                                    leave
                                                )}
                                            </td>

                                            <td style={tdStyle}>
                                                {getReason(
                                                    leave
                                                )}
                                            </td>

                                            <td style={tdStyle}>
                                                <span
                                                    style={{
                                                        ...statusStyle(
                                                            status
                                                        ),
                                                        padding:
                                                            '4px 9px',
                                                        borderRadius:
                                                            '4px',
                                                        fontSize:
                                                            '11px',
                                                        fontWeight:
                                                            'bold',
                                                    }}
                                                >
                                                    {status}
                                                </span>
                                            </td>

                                            <td
                                                style={{
                                                    ...tdStyle,
                                                    textAlign:
                                                        'center',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display:
                                                            'flex',
                                                        justifyContent:
                                                            'center',
                                                        gap: '6px',
                                                        flexWrap:
                                                            'wrap',
                                                    }}
                                                >
                                                    {status !==
                                                        'مقبول' && (
                                                            <button
                                                                onClick={() =>
                                                                    handleStatusChange(
                                                                        leave.id,
                                                                        'مقبول'
                                                                    )
                                                                }
                                                                style={{
                                                                    background:
                                                                        '#dcfce7',
                                                                    color: '#166534',
                                                                    border:
                                                                        '1px solid #bbf7d0',
                                                                    padding:
                                                                        '4px 8px',
                                                                    borderRadius:
                                                                        '4px',
                                                                    cursor:
                                                                        'pointer',
                                                                    fontSize:
                                                                        '11px',
                                                                    fontWeight:
                                                                        'bold',
                                                                }}
                                                            >
                                                                قبول
                                                            </button>
                                                        )}

                                                    {status !==
                                                        'مرفوض' && (
                                                            <button
                                                                onClick={() =>
                                                                    handleStatusChange(
                                                                        leave.id,
                                                                        'مرفوض'
                                                                    )
                                                                }
                                                                style={{
                                                                    background:
                                                                        '#fee2e2',
                                                                    color: '#991b1b',
                                                                    border:
                                                                        '1px solid #fecaca',
                                                                    padding:
                                                                        '4px 8px',
                                                                    borderRadius:
                                                                        '4px',
                                                                    cursor:
                                                                        'pointer',
                                                                    fontSize:
                                                                        '11px',
                                                                    fontWeight:
                                                                        'bold',
                                                                }}
                                                            >
                                                                رفض
                                                            </button>
                                                        )}

                                                    <button
                                                        onClick={() =>
                                                            handleDelete(
                                                                leave.id
                                                            )
                                                        }
                                                        style={{
                                                            background:
                                                                '#f1f5f9',
                                                            color: '#64748b',
                                                            border:
                                                                '1px solid #cbd5e1',
                                                            padding:
                                                                '4px 8px',
                                                            borderRadius:
                                                                '4px',
                                                            cursor:
                                                                'pointer',
                                                            fontSize:
                                                                '11px',
                                                        }}
                                                    >
                                                        حذف
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}

            {isModalOpen && (
                <div style={overlayStyle}>
                    <div style={modalStyle}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent:
                                    'space-between',
                                alignItems: 'center',
                                marginBottom: '18px',
                            }}
                        >
                            <h3
                                style={{
                                    margin: 0,
                                    fontSize: '16px',
                                    color: '#1e293b',
                                }}
                            >
                                تسجيل طلب إجازة
                            </h3>

                            <button
                                type="button"
                                onClick={() => {
                                    if (!saving) {
                                        setIsModalOpen(false);
                                    }
                                }}
                                style={closeStyle}
                                disabled={saving}
                            >
                                ×
                            </button>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            style={{
                                display: 'flex',
                                flexDirection:
                                    'column',
                                gap: '12px',
                            }}
                        >
                            <div>
                                <label style={labelStyle}>
                                    الموظف
                                </label>

                                <select
                                    value={
                                        form.employee_id
                                    }
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            employee_id:
                                                e.target.value,
                                        })
                                    }
                                    style={inputStyle}
                                    required
                                    disabled={
                                        saving ||
                                        loadingEmployees
                                    }
                                >
                                    <option value="">
                                        {loadingEmployees
                                            ? 'جاري تحميل الموظفين...'
                                            : 'اختر الموظف'}
                                    </option>

                                    {employees.map(
                                        (employee) => (
                                            <option
                                                key={
                                                    employee.id
                                                }
                                                value={
                                                    employee.id
                                                }
                                            >
                                                {
                                                    employee.name
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div>
                                <label style={labelStyle}>
                                    نوع الإجازة
                                </label>

                                <select
                                    value={form.type}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            type: e.target.value,
                                        })
                                    }
                                    style={inputStyle}
                                    disabled={saving}
                                >
                                    <option value="إجازة سنوية">
                                        إجازة سنوية
                                    </option>

                                    <option value="إجازة مرضية">
                                        إجازة مرضية
                                    </option>

                                    <option value="إجازة عارضة">
                                        إجازة عارضة
                                    </option>

                                    <option value="إجازة بدون راتب">
                                        إجازة بدون راتب
                                    </option>

                                    <option value="إجازة رسمية">
                                        إجازة رسمية
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label style={labelStyle}>
                                    تاريخ البداية
                                </label>

                                <input
                                    type="date"
                                    value={
                                        form.start_date
                                    }
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            start_date:
                                                e.target.value,
                                        })
                                    }
                                    style={inputStyle}
                                    required
                                    disabled={saving}
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>
                                    تاريخ النهاية
                                </label>

                                <input
                                    type="date"
                                    value={
                                        form.end_date
                                    }
                                    min={
                                        form.start_date ||
                                        undefined
                                    }
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            end_date:
                                                e.target.value,
                                        })
                                    }
                                    style={inputStyle}
                                    required
                                    disabled={saving}
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>
                                    السبب
                                </label>

                                <textarea
                                    value={form.reason}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            reason:
                                                e.target.value,
                                        })
                                    }
                                    placeholder="سبب طلب الإجازة..."
                                    style={{
                                        ...inputStyle,
                                        minHeight:
                                            '80px',
                                        resize:
                                            'vertical',
                                    }}
                                    disabled={saving}
                                />
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent:
                                        'flex-end',
                                    gap: '10px',
                                    marginTop: '8px',
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!saving) {
                                            setIsModalOpen(
                                                false
                                            );
                                        }
                                    }}
                                    style={
                                        cancelButtonStyle
                                    }
                                    disabled={saving}
                                >
                                    إلغاء
                                </button>

                                <button
                                    type="submit"
                                    style={
                                        primaryButtonStyle
                                    }
                                    disabled={
                                        saving ||
                                        loadingEmployees
                                    }
                                >
                                    {saving
                                        ? 'جاري الحفظ...'
                                        : 'حفظ طلب الإجازة'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const thStyle = {
    padding: '12px',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap',
};

const tdStyle = {
    padding: '12px',
    color: '#475569',
};

const emptyStyle = {
    padding: '35px',
    textAlign: 'center',
    color: '#94a3b8',
};

const labelStyle = {
    display: 'block',
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '5px',
    fontWeight: 'bold',
};

const inputStyle = {
    width: '100%',
    padding: '9px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    boxSizing: 'border-box',
    fontFamily: 'Tahoma, Arial, sans-serif',
    fontSize: '12px',
    background: '#fff',
};

const overlayStyle = {
    position: 'fixed',
    inset: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(15, 23, 42, 0.45)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: '20px',
    boxSizing: 'border-box',
};

const modalStyle = {
    background: '#fff',
    padding: '24px',
    borderRadius: '10px',
    width: '440px',
    maxWidth: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
};

const closeStyle = {
    background: '#f1f5f9',
    border: 'none',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '20px',
    color: '#64748b',
};

const primaryButtonStyle = {
    background: '#0284c7',
    color: '#fff',
    border: 'none',
    padding: '8px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
};

const cancelButtonStyle = {
    background: '#f1f5f9',
    color: '#475569',
    border: '1px solid #cbd5e1',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
};

