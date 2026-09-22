import React, { useCallback, useEffect, useState } from 'react';

const API_URL = 'http://localhost:5000';

const getToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatTo12Hour = (timeStr) => {
    if (!timeStr || timeStr === '-' || String(timeStr).startsWith('00:00')) return '-';

    const clean = String(timeStr).trim().slice(0, 5);
    const parts = clean.split(':');
    if (parts.length < 2) return clean;

    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];

    if (isNaN(hours)) return clean;

    const modifier = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${String(hours).padStart(2, '0')}:${minutes} ${modifier}`;
};

const parseTo24Hour = (time12Str) => {
    if (!time12Str) return '07:00';
    let val = String(time12Str).trim().toUpperCase();

    if (/^\d{2}:\d{2}$/.test(val) && !val.includes('AM') && !val.includes('PM')) {
        return val;
    }

    let isPM = val.includes('PM');
    let isAM = val.includes('AM');

    let timeOnly = val.replace(/AM|PM/g, '').trim();
    let parts = timeOnly.split(':');
    if (parts.length < 2) return '07:00';

    let hours = parseInt(parts[0], 10);
    let minutes = parts[1];

    if (isNaN(hours)) return '07:00';

    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${minutes}`;
};

const SHIFT_OPTIONS = {
    'وردية صباحية (07:00 AM - 05:00 PM)': { checkIn: '07:00 AM', checkOut: '05:00 PM' },
    'وردية مسائية (05:00 PM - 11:00 PM)': { checkIn: '05:00 PM', checkOut: '11:00 PM' }
};

export default function AdvancedAttendance() {
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [filterShift, setFilterShift] = useState('الكل');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);

    const [loading, setLoading] = useState(false);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [saving, setSaving] = useState(false);

    const [selectedDate, setSelectedDate] = useState(getToday());

    const [message, setMessage] = useState({
        text: '',
        type: ''
    });

    const [formData, setFormData] = useState({
        employee_id: '',
        employeeName: '',
        shift: 'وردية صباحية (07:00 AM - 05:00 PM)',
        checkIn: '07:00 AM',
        checkOut: '05:00 PM',
        status: 'حاضر',
        overtime: '0',
        notes: ''
    });

    const getToken = () => localStorage.getItem('hr_token');

    const getHeaders = () => {
        const token = getToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        };
    };

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => {
            setMessage({ text: '', type: '' });
        }, 3000);
    };

    const fetchEmployees = async () => {
        const token = getToken();
        if (!token) return;

        try {
            setLoadingEmployees(true);
            const response = await fetch(`${API_URL}/api/employees`, {
                method: 'GET',
                headers: getHeaders()
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || data.error || 'حدث خطأ أثناء جلب الموظفين');
            }

            const list = Array.isArray(data) ? data : Array.isArray(data.employees) ? data.employees : [];
            setEmployees(list);
        } catch (error) {
            console.error('FETCH EMPLOYEES ERROR:', error);
        } finally {
            setLoadingEmployees(false);
        }
    };

    const fetchAttendance = useCallback(async () => {
        const token = getToken();
        if (!token) return;

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

            if (!response.ok) {
                throw new Error(data.message || data.error || 'حدث خطأ أثناء جلب الحضور');
            }

            const list = Array.isArray(data.attendance) ? data.attendance : Array.isArray(data) ? data : [];
            setAttendanceRecords(list);
        } catch (error) {
            console.error('FETCH ERROR:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        fetchEmployees();
    }, []);

    useEffect(() => {
        fetchAttendance();
    }, [selectedDate, fetchAttendance]);

    const cleanTime = (val) => {
        if (!val || val === '-' || String(val).startsWith('00:00')) {
            return '-';
        }
        return String(val).trim().slice(0, 5);
    };

    const isMorningShiftTime = (timeStr) => {
        if (!timeStr || timeStr === '-') return true;
        const hour = parseInt(timeStr.split(':')[0], 10);
        return hour >= 5 && hour < 17;
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        const employeeId = record.employee_id ?? record.employeeId ?? '';
        const employee = employees.find(
            (item) => String(item.id ?? item.employee_id) === String(employeeId)
        );

        const employeeName = record.employeeName || record.employee_name || (employee ? employee.name : '');
        const rawCheckIn = cleanTime(record.checkIn ?? record.check_in);
        const rawCheckOut = cleanTime(record.checkOut ?? record.check_out);

        const checkInVal = rawCheckIn !== '-' ? formatTo12Hour(rawCheckIn) : '07:00 AM';
        const checkOutVal = rawCheckOut !== '-' ? formatTo12Hour(rawCheckOut) : '05:00 PM';

        const isMorning = isMorningShiftTime(rawCheckIn);
        const currentShiftName = isMorning
            ? 'وردية صباحية (07:00 AM - 05:00 PM)'
            : 'وردية مسائية (05:00 PM - 11:00 PM)';

        setFormData({
            employee_id: employeeId,
            employeeName,
            shift: currentShiftName,
            checkIn: checkInVal,
            checkOut: checkOutVal,
            status: record.status || 'حاضر',
            overtime: String(Number(record.overtime_hours) || 0),
            notes: record.notes || ''
        });

        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingRecord(null);
        setFormData({
            employee_id: '',
            employeeName: '',
            shift: 'وردية صباحية (07:00 AM - 05:00 PM)',
            checkIn: '07:00 AM',
            checkOut: '05:00 PM',
            status: 'حاضر',
            overtime: '0',
            notes: ''
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        if (saving) return;
        setIsModalOpen(false);
        setEditingRecord(null);
    };

    const handleShiftChange = (newShift) => {
        const shiftTimes = SHIFT_OPTIONS[newShift] || { checkIn: '07:00 AM', checkOut: '05:00 PM' };
        setFormData({
            ...formData,
            shift: newShift,
            checkIn: shiftTimes.checkIn,
            checkOut: shiftTimes.checkOut
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.employee_id) {
            showMessage('من فضلك اختاري الموظف', 'error');
            return;
        }

        try {
            setSaving(true);
            const requestBody = {
                attendance_date: selectedDate,
                check_in: parseTo24Hour(formData.checkIn),
                check_out: parseTo24Hour(formData.checkOut),
                status: formData.status || 'حاضر',
                overtime_hours: Number(formData.overtime) || 0,
                notes: String(formData.notes || '').trim()
            };

            const response = await fetch(
                `${API_URL}/api/attendance/${formData.employee_id}`,
                {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify(requestBody)
                }
            );

            if (!response.ok) throw new Error('حدث خطأ أثناء حفظ السجل');

            showMessage('تم تحديث بيانات الوردية والإضافي بنجاح', 'success');
            setIsModalOpen(false);
            setEditingRecord(null);
            await fetchAttendance();
        } catch (error) {
            showMessage(error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const filteredRecords = attendanceRecords.filter((record) => {
        const time = cleanTime(record.checkIn ?? record.check_in ?? record.attendance_time);
        const isMorning = isMorningShiftTime(time);

        if (filterShift === 'صباحية') return isMorning;
        if (filterShift === 'مسائية') return !isMorning;
        return true;
    });

    const totalAssigned = attendanceRecords.length;
    const morningShiftCount = attendanceRecords.filter((r) => {
        const time = cleanTime(r.checkIn ?? r.check_in ?? r.attendance_time);
        return isMorningShiftTime(time);
    }).length;
    const eveningShiftCount = totalAssigned - morningShiftCount;
    const totalOvertimeHours = attendanceRecords.reduce((acc, curr) => acc + (Number(curr.overtime_hours) || 0), 0);

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
            {/* STICKY & LOCKED HEADER (تم تثبيت عناصر التحكم تماماً بدون أي حركة) */}
            <div
                style={{
                    position: 'sticky',
                    top: '0',
                    zIndex: 100,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '16px 24px',
                    marginBottom: '24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'nowrap', // منع الالتفاف لتثبيت العناصر في مكانها تماماً
                    gap: '20px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}
            >
                <div style={{ minWidth: '260px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap' }}>
                        إدارة الورديات والساعات الإضافية
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        (صباحية: 07:00 AM - 05:00 PM | مسائية: 05:00 PM - 11:00 PM)
                    </p>
                </div>

                {message.text && (
                    <div
                        style={{
                            padding: '6px 12px',
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        style={{ ...inputStyle, width: '150px' }}
                    />

                    <select
                        value={filterShift}
                        onChange={(e) => setFilterShift(e.target.value)}
                        style={{ ...inputStyle, width: '160px' }}
                    >
                        <option value="الكل">جميع الورديات</option>
                        <option value="صباحية">الوردية الصباحية</option>
                        <option value="مسائية">الوردية المسائية</option>
                    </select>

                    <button
                        onClick={handleAddNew}
                        style={{
                            background: '#0284c7',
                            color: '#fff',
                            border: 'none',
                            padding: '9px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        + تسجيل وردية / إضافي
                    </button>
                </div>
            </div>

            {/* STATS */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '15px',
                    marginBottom: '24px'
                }}
            >
                <div style={statCardStyle('#e0f2fe', '#0369a1')}>
                    <span style={statLabelStyle}>إجمالي السجلات اليوم</span>
                    <span style={statValueStyle}>{totalAssigned}</span>
                </div>
                <div style={statCardStyle('#dcfce7', '#166534')}>
                    <span style={statLabelStyle}>الوردية الصباحية</span>
                    <span style={statValueStyle}>{morningShiftCount}</span>
                </div>
                <div style={statCardStyle('#fef3c7', '#92400e')}>
                    <span style={statLabelStyle}>الوردية المسائية</span>
                    <span style={statValueStyle}>{eveningShiftCount}</span>
                </div>
                <div style={statCardStyle('#f1f5f9', '#1e293b')}>
                    <span style={statLabelStyle}>إجمالي ساعات الإضافي</span>
                    <span style={statValueStyle}>+{totalOvertimeHours} س</span>
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
                <h4 style={{ margin: '0 0 16px', fontSize: '15px', color: '#1e293b', fontWeight: 'bold', textAlign: 'right' }}>
                    جدول الورديات والساعات الإضافية ليوم {selectedDate}
                </h4>

                <div style={{ width: '100%', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px', minWidth: '900px' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9', color: '#475569' }}>
                                <th style={thStyle}>اسم الموظف</th>
                                <th style={thStyle}>الوردية المخصصة</th>
                                <th style={thStyle}>وقت الحضور الفعلي</th>
                                <th style={thStyle}>وقت الانصراف الفعلي</th>
                                <th style={thStyle}>الساعات الإضافية</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>إدارة وتعديل</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={emptyStyle}>جاري تحميل بيانات الورديات...</td>
                                </tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={emptyStyle}>لا توجد سجلات ورديات مطابقة لهذا اليوم</td>
                                </tr>
                            ) : (
                                filteredRecords.map((item, idx) => {
                                    const checkInClean = cleanTime(item.checkIn ?? item.check_in);
                                    const checkOutClean = cleanTime(item.checkOut ?? item.check_out);
                                    const isMorning = isMorningShiftTime(checkInClean);

                                    return (
                                        <tr
                                            key={item.id ?? item.employee_id}
                                            style={{
                                                background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                                                borderBottom: '1px solid #f1f5f9'
                                            }}
                                        >
                                            <td style={tdBold}>{item.employeeName || item.employee_name || '-'}</td>
                                            <td style={{ ...tdStyle, color: '#0284c7', fontWeight: '600', direction: 'ltr', textAlign: 'right' }}>
                                                {isMorning
                                                    ? 'وردية صباحية (07:00 AM ➔ 05:00 PM)'
                                                    : 'وردية مسائية (05:00 PM ➔ 11:00 PM)'}
                                            </td>
                                            <td style={{ ...tdStyle, direction: 'ltr', textAlign: 'right' }}>
                                                {formatTo12Hour(checkInClean)}
                                            </td>
                                            <td style={{ ...tdStyle, direction: 'ltr', textAlign: 'right' }}>
                                                {formatTo12Hour(checkOutClean)}
                                            </td>
                                            <td style={{ ...tdStyle, color: '#059669', fontWeight: '600' }}>
                                                {Number(item.overtime_hours) > 0 ? `+ ${item.overtime_hours} ساعة` : '-'}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    style={{
                                                        background: '#e0f2fe',
                                                        color: '#0369a1',
                                                        border: '1px solid #bae6fd',
                                                        padding: '5px 14px',
                                                        borderRadius: '5px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    تعديل الوردية / الإضافي
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 9999
                    }}
                >
                    <div
                        style={{
                            background: '#ffffff',
                            borderRadius: '12px',
                            padding: '28px',
                            width: '480px',
                            maxWidth: '90%',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #e2e8f0',
                            direction: 'rtl'
                        }}
                    >
                        <h3
                            style={{
                                margin: '0 0 20px 0',
                                fontSize: '16px',
                                color: '#1e293b',
                                fontWeight: 'bold',
                                borderBottom: '2px solid #f8fafc',
                                paddingBottom: '10px',
                                textAlign: 'right'
                            }}
                        >
                            {editingRecord ? `تعديل وردية وإضافي: ${formData.employeeName || ''}` : 'تخصيص وردية وساعات إضافية'}
                        </h3>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'right' }}>
                            <div>
                                <label style={labelStyle}>الموظف</label>
                                {editingRecord ? (
                                    <input
                                        type="text"
                                        value={formData.employeeName}
                                        readOnly
                                        style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b' }}
                                    />
                                ) : (
                                    <select
                                        value={formData.employee_id}
                                        onChange={(e) => {
                                            const empId = e.target.value;
                                            const emp = employees.find((i) => String(i.id ?? i.employee_id) === String(empId));
                                            setFormData({
                                                ...formData,
                                                employee_id: empId,
                                                employeeName: emp ? (emp.name || emp.employee_name) : ''
                                            });
                                        }}
                                        disabled={loadingEmployees || saving}
                                        style={inputStyle}
                                    >
                                        <option value="">اختر الموظف</option>
                                        {employees.map((emp) => {
                                            const id = emp.id ?? emp.employee_id;
                                            return (
                                                <option key={id} value={id}>
                                                    {emp.name || emp.employee_name}
                                                </option>
                                            );
                                        })}
                                    </select>
                                )}
                            </div>

                            <div>
                                <label style={labelStyle}>الوردية المخصصة (تحدد الأوقات تلقائياً)</label>
                                <select
                                    value={formData.shift}
                                    onChange={(e) => handleShiftChange(e.target.value)}
                                    style={inputStyle}
                                >
                                    <option>وردية صباحية (07:00 AM - 05:00 PM)</option>
                                    <option>وردية مسائية (05:00 PM - 11:00 PM)</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>وقت الحضور الفعلي</label>
                                    <input
                                        type="text"
                                        placeholder="07:00 AM"
                                        value={formData.checkIn}
                                        onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                                        style={{ ...inputStyle, textAlign: 'left', direction: 'ltr' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>وقت الانصراف الفعلي</label>
                                    <input
                                        type="text"
                                        placeholder="05:00 PM"
                                        value={formData.checkOut}
                                        onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                                        style={{ ...inputStyle, textAlign: 'left', direction: 'ltr' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>الساعات الإضافية (Overtime)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={formData.overtime}
                                    onChange={(e) => setFormData({ ...formData, overtime: e.target.value })}
                                    style={inputStyle}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '10px', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{
                                        background: saving ? '#94a3b8' : '#0284c7',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '10px 22px',
                                        borderRadius: '6px',
                                        cursor: saving ? 'not-allowed' : 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    disabled={saving}
                                    style={{
                                        background: '#f1f5f9',
                                        color: '#475569',
                                        border: '1px solid #cbd5e1',
                                        padding: '10px 18px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const thStyle = { padding: '12px 16px', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap', fontWeight: 'bold' };
const tdStyle = { padding: '12px 16px', color: '#475569' };
const tdBold = { padding: '12px 16px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap' };
const emptyStyle = { padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' };
const labelStyle = { display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: '600', textAlign: 'right' };
const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', background: '#ffffff', outline: 'none', textAlign: 'right' };
const statCardStyle = (bg, color) => ({ background: bg, color: color, padding: '16px 20px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' });
const statLabelStyle = { fontSize: '12px', fontWeight: 'bold', opacity: 0.9 };
const statValueStyle = { fontSize: '22px', fontWeight: '900' };