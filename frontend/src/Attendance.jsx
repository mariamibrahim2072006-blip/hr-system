import React, { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, UserCheck, XCircle, Palmtree } from 'lucide-react';
import { PageHeader, Card, Empty, Alert, Loading, Badge, Stat, API_URL, getToday } from './ui';

const STATUS_OPTIONS = ['حاضر', 'متأخر', 'غائب', 'إجازة'];

export default function Attendance() {
    const [attendanceList, setAttendanceList] = useState([]);
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [message, setMessage] = useState({ text: '', type: '' });
    const [loading, setLoading] = useState(false);
    const [updatingEmployee, setUpdatingEmployee] = useState(null);

    const getToken = () => localStorage.getItem('hr_token');

    const getHeaders = () => ({
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    });

    const showMessage = useCallback((text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
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
                { headers: getHeaders() }
            );

            const data = await response.json().catch(() => ({}));

            if (response.status === 401) {
                showMessage('جلسة الدخول انتهت، برجاء تسجيل الدخول مرة أخرى', 'error');
                return;
            }

            if (!response.ok) {
                throw new Error(data.message || data.error || 'حدث خطأ أثناء جلب الحضور');
            }

            const list = Array.isArray(data.attendance) ? data.attendance : Array.isArray(data) ? data : [];
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
        if (value === null || value === undefined || value === '' || value === '-') return null;
        return String(value).trim();
    };

    const normalizeStatus = (status) => String(status || '').trim() || 'غائب';

    const isPresentStatus = (status) => {
        const value = normalizeStatus(status);
        return value === 'حاضر' || value === 'حاضر (في الموعد)' || value === 'متأخر';
    };

    const isAbsentStatus = (status) => normalizeStatus(status) === 'غائب';

    const isLeaveStatus = (status) => {
        const value = normalizeStatus(status);
        return value === 'إجازة' || value === 'إجازة رسمية' || value === 'عطلة أسبوعية';
    };

    const statusTone = (status) => {
        if (isPresentStatus(status)) return 'green';
        if (isAbsentStatus(status)) return 'red';
        if (isLeaveStatus(status)) return 'blue';
        return 'gray';
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
                notes: typeof item.notes === 'string' ? item.notes : '',
            };

            const response = await fetch(`${API_URL}/api/attendance/${item.employee_id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(requestBody),
            });

            const data = await response.json().catch(() => ({}));

            if (response.status === 401) {
                showMessage('جلسة الدخول انتهت، برجاء تسجيل الدخول مرة أخرى', 'error');
                return;
            }

            if (!response.ok) {
                throw new Error(data.message || data.error || 'حدث خطأ أثناء تحديث الحالة');
            }

            showMessage(isPresent ? 'تم تسجيل الموظف حاضر بنجاح' : 'تم تحديث حالة الموظف بنجاح', 'success');
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

    return (
        <div>
            <PageHeader
                icon={CalendarCheck}
                title="سجل الحضور اليومي"
                desc="اختر اليوم ثم راجع حالة كل موظف وعدّلها - التغيير يحفظ فورًا في النظام"
            >
                <input
                    type="date"
                    className="input"
                    style={{ width: 'auto' }}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                />
            </PageHeader>

            {message.text && <Alert type={message.type}>{message.text}</Alert>}

            <div className="stats" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                <Stat icon={UserCheck} color="green" label="حاضر" value={presentCount} sub="Present" />
                <Stat icon={XCircle} color="red" label="غائب" value={absentCount} sub="Absent" />
                <Stat icon={Palmtree} color="blue" label="إجازة" value={leaveCount} sub="On leave" />
            </div>

            <Card
                icon={CalendarCheck}
                title={`حضور يوم ${selectedDate}`}
                desc="غيّر حالة أي موظف من القائمة المنسدلة بجانبه"
                actions={<span className="pill-count">{attendanceList.length} موظف</span>}
                flush
            >
                {loading ? (
                    <Loading text="جاري تحميل سجل الحضور..." />
                ) : attendanceList.length === 0 ? (
                    <Empty
                        icon={CalendarCheck}
                        title="لا يوجد سجل لهذا اليوم"
                        text="لا يوجد موظفون مسجلون في هذا التاريخ. أضف موظفين أولًا من قسم سجل الموظفين، أو اختر تاريخًا آخر."
                    />
                ) : (
                    <div className="tbl-wrap">
                        <table className="tbl">
                            <thead>
                                <tr>
                                    <th className="c" style={{ width: 60 }}>#</th>
                                    <th>اسم الموظف</th>
                                    <th>القسم</th>
                                    <th>وقت الحضور</th>
                                    <th>وقت الانصراف</th>
                                    <th className="c">الحالة</th>
                                    <th className="c">تغيير الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendanceList.map((item) => {
                                    const status = normalizeStatus(item.status);
                                    const displayCheckIn = item.checkIn ?? item.check_in ?? '-';
                                    const displayCheckOut = item.checkOut ?? item.check_out ?? '-';
                                    return (
                                        <tr key={item.employee_id}>
                                            <td className="c muted">{item.employee_id}</td>
                                            <td className="cell-main nowrap">{item.employee_name || item.name || '-'}</td>
                                            <td>{item.department || item.department_name || '-'}</td>
                                            <td className="num">{displayCheckIn || '-'}</td>
                                            <td className="num">{displayCheckOut || '-'}</td>
                                            <td className="c">
                                                <Badge tone={statusTone(status)}>{status}</Badge>
                                            </td>
                                            <td className="c">
                                                <select
                                                    className="select"
                                                    style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}
                                                    value={STATUS_OPTIONS.includes(status) ? status : ''}
                                                    disabled={updatingEmployee === item.employee_id}
                                                    onChange={(e) => handleStatusChange(item, e.target.value)}
                                                >
                                                    {!STATUS_OPTIONS.includes(status) && (
                                                        <option value="" disabled>{status}</option>
                                                    )}
                                                    {STATUS_OPTIONS.map((opt) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
