import React, { useCallback, useEffect, useState } from 'react';

const API_URL = 'http://localhost:5000';

const getToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function Attendance() {
    const [attendanceList, setAttendanceList] = useState([]);
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [message, setMessage] = useState({ text: '', type: '' });
    const [loading, setLoading] = useState(false);
    const [updatingEmployee, setUpdatingEmployee] = useState(null);

    const getToken = () => localStorage.getItem('hr_token');

    const getHeaders = () => {
        const token = getToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        };
    };

    const showMessage = useCallback((text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => {
            setMessage({ text: '', type: '' });
        }, 3000);
    }, []);

    const fetchAttendance = useCallback(async () => {
        const token = getToken();
        if (!token) {
            showMessage('جلسة الدخول غير موجودة، برجاء تسجيل الدخول مرة أخرى', 'error');
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(
                `${API_URL}/api/attendance?date=${encodeURIComponent(selectedDate)}`,
                {
                    method: 'GET',
                    headers: getHeaders()
                }
            );

            const data = await response.json().catch(() => ({}));

            if (response.status === 401) {
                showMessage('جلسة الدخول انتهت، برجاء تسجيل الدخول مرة أخرى', 'error');
                return;
            }

            if (!response.ok) {
                throw new Error(data.message || data.error || 'حدث خطأ أثناء جلب الحضور');
            }

            const list = Array.isArray(data.attendance)
                ? data.attendance
                : Array.isArray(data)
                    ? data
                    : [];

            setAttendanceList(list);
        } catch (error) {
            console.error('FETCH ATTENDANCE ERROR:', error);
            showMessage(error.message || 'حدث خطأ أثناء جلب الحضور', 'error');
        } finally {
            setLoading(false);
        }
    }, [selectedDate, showMessage]);

    useEffect(() => {
        fetchAttendance();
    }, [fetchAttendance]);

    const normalizeTime = (value) => {
        if (value === null || value === undefined || value === '' || value === '-') {
            return null;
        }
        return String(value).trim();
    };

    const normalizeStatus = (status) => {
        const value = String(status || '').trim();
        return value || 'غائب';
    };

    const isPresentStatus = (status) => {
        const value = normalizeStatus(status);
        return value === 'حاضر' || value === 'حاضر (في الموعد)' || value === 'متأخر';
    };

    const isAbsentStatus = (status) => {
        return normalizeStatus(status) === 'غائب';
    };

    const isLeaveStatus = (status) => {
        const value = normalizeStatus(status);
        return value === 'إجازة' || value === 'إجازة رسمية' || value === 'عطلة أسبوعية';
    };

    const handleStatusChange = async (item, newStatus) => {
        if (updatingEmployee !== null) return;

        const selectedStatus = normalizeStatus(newStatus);
        const isPresent = isPresentStatus(selectedStatus);
        const isAbsent = isAbsentStatus(selectedStatus);
        const isLeave = isLeaveStatus(selectedStatus);

        try {
            setUpdatingEmployee(item.employee_id);

            const currentCheckIn = normalizeTime(item.checkIn ?? item.check_in);
            const currentCheckOut = normalizeTime(item.checkOut ?? item.check_out);
            const defaultCheckIn = normalizeTime(item.attendance_time);
            const defaultCheckOut = normalizeTime(item.departure_time);

            let checkIn = currentCheckIn || defaultCheckIn;
            let checkOut = currentCheckOut || defaultCheckOut;
            let overtime = Number(item.overtime_hours) || 0;

            if (isAbsent || isLeave) {
                checkIn = null;
                checkOut = null;
                overtime = 0;
            }

            if (isPresent && !checkIn) {
                showMessage('لا يمكن تسجيل الموظف حاضر بدون وقت حضور', 'error');
                return;
            }

            const requestBody = {
                attendance_date: selectedDate,
                check_in: checkIn,
                check_out: checkOut,
                status: selectedStatus,
                overtime_hours: overtime,
                notes: typeof item.notes === 'string' ? item.notes : ''
            };

            const response = await fetch(
                `${API_URL}/api/attendance/${item.employee_id}`,
                {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify(requestBody)
                }
            );

            const data = await response.json().catch(() => ({}));

            if (response.status === 401) {
                showMessage('جلسة الدخول انتهت، برجاء تسجيل الدخول مرة أخرى', 'error');
                return;
            }

            if (!response.ok) {
                throw new Error(data.message || data.error || 'حدث خطأ أثناء تحديث الحالة');
            }

            showMessage(
                isPresent ? 'تم تسجيل الموظف حاضر بنجاح' : 'تم تسجيل الموظف غائب بنجاح',
                'success'
            );

            await fetchAttendance();
        } catch (error) {
            console.error('UPDATE ATTENDANCE ERROR:', error);
            showMessage(error.message || 'حدث خطأ أثناء تحديث الحضور', 'error');
        } finally {
            setUpdatingEmployee(null);
        }
    };

    const presentCount = attendanceList.filter((item) => isPresentStatus(item.status)).length;
    const absentCount = attendanceList.filter((item) => isAbsentStatus(item.status)).length;
    const leaveCount = attendanceList.filter((item) => isLeaveStatus(item.status)).length;

    const inputStyle = {
        padding: '8px 12px',
        border: '1px solid #cbd5e1',
        borderRadius: '6px',
        fontSize: '13px',
        outline: 'none',
        background: '#f8fafc',
        color: '#334155'
    };

    return (
        <div
            style={{
                padding: '24px',
                fontFamily: 'Tahoma, Arial, sans-serif',
                direction: 'rtl',
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
                        إدارة ومتابعة الحضور والانصراف
                    </h2>
                    <p
                        style={{
                            margin: '4px 0 0',
                            fontSize: '12px',
                            color: '#64748b'
                        }}
                    >
                        متابعة الحضور اليومي، رصد حالات التأخير والغياب، وربطها بالرواتب تلقائياً
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
                            color: message.type === 'success' ? '#166534' : '#991b1b',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {message.text}
                    </div>
                )}
            </div>

            {/* DATE & STATS BAR */}
            <div
                style={{
                    background: '#ffffff',
                    padding: '16px 24px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    marginBottom: '24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '20px',
                    flexWrap: 'wrap',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label
                        style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#334155'
                        }}
                    >
                        اختر التاريخ:
                    </label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        style={inputStyle}
                    />
                    <button
                        type="button"
                        onClick={() => setSelectedDate(getToday())}
                        style={{
                            background: '#e0f2fe',
                            color: '#0369a1',
                            border: '1px solid #bae6fd',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600'
                        }}
                    >
                        اليوم
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                        style={{
                            background: '#dcfce7',
                            color: '#166534',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}
                    >
                        الحاضرون: {presentCount}
                    </span>

                    <span
                        style={{
                            background: '#fee2e2',
                            color: '#991b1b',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}
                    >
                        الغائبون: {absentCount}
                    </span>

                    <span
                        style={{
                            background: '#fef3c7',
                            color: '#92400e',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}
                    >
                        الإجازات: {leaveCount}
                    </span>

                    <span
                        style={{
                            background: '#e0f2fe',
                            color: '#0369a1',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}
                    >
                        الإجمالي: {attendanceList.length}
                    </span>
                </div>
            </div>

            {/* TABLE */}
            <div
                style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}
            >
                <h4
                    style={{
                        margin: '0 0 16px',
                        fontSize: '15px',
                        color: '#1e293b',
                        fontWeight: 'bold',
                        textAlign: 'right'
                    }}
                >
                    سجل حضور الموظفين ليوم {selectedDate}
                </h4>

                <div style={{ width: '100%', overflowX: 'auto' }}>
                    <table
                        style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            textAlign: 'right',
                            fontSize: '13px',
                            minWidth: '900px'
                        }}
                    >
                        <thead>
                            <tr
                                style={{
                                    background: '#f1f5f9',
                                    color: '#475569'
                                }}
                            >
                                <th style={thStyle}>ID</th>
                                <th style={thStyle}>اسم الموظف</th>
                                <th style={thStyle}>القسم</th>
                                <th style={thStyle}>وقت الحضور</th>
                                <th style={thStyle}>وقت الانصراف</th>
                                <th style={thStyle}>الحالة اليومية</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>تغيير الحالة</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} style={emptyStyle}>
                                        جاري تحميل البيانات...
                                    </td>
                                </tr>
                            ) : attendanceList.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={emptyStyle}>
                                        لا توجد بيانات موظفين مسجلين لهذا اليوم
                                    </td>
                                </tr>
                            ) : (
                                attendanceList.map((item, idx) => {
                                    const status = normalizeStatus(item.status);
                                    const isAbsent = isAbsentStatus(status);
                                    const isLeave = isLeaveStatus(status);
                                    const isUpdating = updatingEmployee === item.employee_id;

                                    const displayCheckIn = item.checkIn ?? item.check_in ?? '-';
                                    const displayCheckOut = item.checkOut ?? item.check_out ?? '-';

                                    const statusBackground = isAbsent
                                        ? '#fee2e2'
                                        : isLeave
                                            ? '#fef3c7'
                                            : '#dcfce7';

                                    const statusColor = isAbsent
                                        ? '#991b1b'
                                        : isLeave
                                            ? '#92400e'
                                            : '#166534';

                                    return (
                                        <tr
                                            key={item.id ?? item.employee_id}
                                            style={{
                                                background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                                                borderBottom: '1px solid #f1f5f9'
                                            }}
                                        >
                                            <td style={tdCenter}>{item.employee_id}</td>
                                            <td style={tdBold}>
                                                {item.employeeName || item.employee_name || '-'}
                                            </td>
                                            <td style={{ ...tdStyle, color: '#0284c7', fontWeight: '500' }}>
                                                {item.department || '-'}
                                            </td>
                                            <td style={{ ...tdStyle, direction: 'ltr', textAlign: 'right' }}>
                                                {displayCheckIn}
                                            </td>
                                            <td style={{ ...tdStyle, direction: 'ltr', textAlign: 'right' }}>
                                                {displayCheckOut}
                                            </td>
                                            <td style={tdStyle}>
                                                <span
                                                    style={{
                                                        background: statusBackground,
                                                        color: statusColor,
                                                        padding: '4px 10px',
                                                        borderRadius: '5px',
                                                        fontWeight: '600',
                                                        fontSize: '11px',
                                                        display: 'inline-block'
                                                    }}
                                                >
                                                    {status}
                                                </span>
                                            </td>
                                            <td style={tdCenter}>
                                                <select
                                                    value={
                                                        isPresentStatus(status)
                                                            ? 'حاضر'
                                                            : isAbsent
                                                                ? 'غائب'
                                                                : status
                                                    }
                                                    disabled={isUpdating}
                                                    onChange={(e) =>
                                                        handleStatusChange(item, e.target.value)
                                                    }
                                                    style={{
                                                        padding: '6px 12px',
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        background: isUpdating ? '#f1f5f9' : '#ffffff',
                                                        outline: 'none',
                                                        cursor: isUpdating ? 'not-allowed' : 'pointer',
                                                        opacity: isUpdating ? 0.6 : 1
                                                    }}
                                                >
                                                    <option value="حاضر">حاضر</option>
                                                    <option value="غائب">غائب</option>
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const thStyle = {
    padding: '12px 16px',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap',
    fontWeight: 'bold'
};

const tdStyle = {
    padding: '12px 16px',
    color: '#475569'
};

const tdBold = {
    padding: '12px 16px',
    fontWeight: '600',
    color: '#1e293b',
    whiteSpace: 'nowrap'
};

const tdCenter = {
    padding: '12px 16px',
    textAlign: 'center',
    color: '#64748b'
};

const emptyStyle = {
    padding: '40px',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '13px'
};