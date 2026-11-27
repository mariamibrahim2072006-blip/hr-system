import React, { useCallback, useEffect, useState } from 'react';
import { Clock3, Plus, Pencil, Users, Sun, Moon, Timer } from 'lucide-react';
import { PageHeader, Card, Field, Empty, Alert, Loading, Badge, Stat, Modal, API_URL, getToday } from './ui';

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

    const isPM = val.includes('PM');
    const isAM = val.includes('AM');
    const timeOnly = val.replace(/AM|PM/g, '').trim();
    const parts = timeOnly.split(':');
    if (parts.length < 2) return '07:00';

    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    if (isNaN(hours)) return '07:00';

    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${minutes}`;
};

const SHIFT_OPTIONS = {
    'وردية صباحية (07:00 AM - 05:00 PM)': { checkIn: '07:00 AM', checkOut: '05:00 PM' },
    'وردية مسائية (05:00 PM - 11:00 PM)': { checkIn: '05:00 PM', checkOut: '11:00 PM' },
};

const cleanTime = (val) => {
    if (!val || val === '-' || String(val).startsWith('00:00')) return '-';
    return String(val).trim().slice(0, 5);
};

const isMorningShiftTime = (timeStr) => {
    if (!timeStr || timeStr === '-') return true;
    const hour = parseInt(timeStr.split(':')[0], 10);
    return hour >= 5 && hour < 17;
};

const defaultForm = {
    employee_id: '',
    employeeName: '',
    shift: 'وردية صباحية (07:00 AM - 05:00 PM)',
    checkIn: '07:00 AM',
    checkOut: '05:00 PM',
    status: 'حاضر',
    overtime: '0',
    notes: '',
};

export default function AdvancedAttendance() {
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [filterShift, setFilterShift] = useState('الكل');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [selectedDate, setSelectedDate] = useState(getToday());
    const [message, setMessage] = useState({ text: '', type: '' });
    const [formData, setFormData] = useState(defaultForm);

    const getToken = () => localStorage.getItem('hr_token');

    const getHeaders = () => ({
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    });

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    const fetchEmployees = async () => {
        if (!getToken()) return;
        try {
            const response = await fetch(`${API_URL}/api/employees`, { headers: getHeaders() });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || data.error || 'حدث خطأ أثناء جلب الموظفين');
            const list = Array.isArray(data) ? data : Array.isArray(data.employees) ? data.employees : [];
            setEmployees(list);
        } catch (error) {
            console.error('FETCH EMPLOYEES ERROR:', error);
        }
    };

    const fetchAttendance = useCallback(async () => {
        if (!getToken()) return;
        try {
            setLoading(true);
            const response = await fetch(
                `${API_URL}/api/attendance?date=${encodeURIComponent(selectedDate)}`,
                { headers: getHeaders() }
            );
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || data.error || 'حدث خطأ أثناء جلب الحضور');
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

    const handleEdit = (record) => {
        setEditingRecord(record);
        const employeeId = record.employee_id ?? record.employeeId ?? '';
        const employee = employees.find((item) => String(item.id ?? item.employee_id) === String(employeeId));

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
            notes: record.notes || '',
        });

        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingRecord(null);
        setFormData({ ...defaultForm });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        if (saving) return;
        setIsModalOpen(false);
        setEditingRecord(null);
    };

    const handleShiftChange = (newShift) => {
        const shiftTimes = SHIFT_OPTIONS[newShift] || { checkIn: '07:00 AM', checkOut: '05:00 PM' };
        setFormData({ ...formData, shift: newShift, checkIn: shiftTimes.checkIn, checkOut: shiftTimes.checkOut });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.employee_id) {
            showMessage('من فضلك اختر الموظف', 'error');
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
                notes: String(formData.notes || '').trim(),
            };

            const response = await fetch(`${API_URL}/api/attendance/${formData.employee_id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(requestBody),
            });

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
    const morningShiftCount = attendanceRecords.filter((r) =>
        isMorningShiftTime(cleanTime(r.checkIn ?? r.check_in ?? r.attendance_time))
    ).length;
    const eveningShiftCount = totalAssigned - morningShiftCount;
    const totalOvertimeHours = attendanceRecords.reduce((acc, curr) => acc + (Number(curr.overtime_hours) || 0), 0);

    return (
        <div>
            <PageHeader
                icon={Clock3}
                title="الورديات والساعات الإضافية"
                desc="صباحية 07:00 AM - 05:00 PM · مسائية 05:00 PM - 11:00 PM - راجع ووزّع ورديات اليوم وسجل الإضافي"
            >
                <input
                    type="date"
                    className="input"
                    style={{ width: 'auto' }}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                />
                <select
                    className="select"
                    style={{ width: 'auto' }}
                    value={filterShift}
                    onChange={(e) => setFilterShift(e.target.value)}
                >
                    <option value="الكل">جميع الورديات</option>
                    <option value="صباحية">الوردية الصباحية</option>
                    <option value="مسائية">الوردية المسائية</option>
                </select>
                <button type="button" className="btn btn-primary" onClick={handleAddNew}>
                    <Plus size={15} />
                    تسجيل وردية / إضافي
                </button>
            </PageHeader>

            {message.text && <Alert type={message.type}>{message.text}</Alert>}

            <div className="stats">
                <Stat icon={Users} color="blue" label="الموظفون المسجلون" value={totalAssigned} sub="Assigned today" />
                <Stat icon={Sun} color="amber" label="الوردية الصباحية" value={morningShiftCount} sub="Morning shift" />
                <Stat icon={Moon} color="purple" label="الوردية المسائية" value={eveningShiftCount} sub="Evening shift" />
                <Stat icon={Timer} color="green" label="ساعات إضافية" value={totalOvertimeHours} sub="Overtime hours" />
            </div>

            <Card
                icon={Clock3}
                title={`جدول الورديات ليوم ${selectedDate}`}
                desc="اضغط تعديل لتغيير وردية موظف أو إضافة ساعات إضافية"
                actions={<span className="pill-count">{filteredRecords.length} سجل</span>}
                flush
            >
                {loading ? (
                    <Loading text="جاري تحميل الورديات..." />
                ) : filteredRecords.length === 0 ? (
                    <Empty
                        icon={Clock3}
                        title="لا توجد ورديات مسجلة"
                        text="لا توجد سجلات ورديات لهذا اليوم والفلتر المحدد. استخدم زر تسجيل وردية / إضافي لإضافة سجل جديد، أو غيّر التاريخ."
                        action={
                            <button type="button" className="btn btn-primary" onClick={handleAddNew}>
                                <Plus size={15} />
                                تسجيل وردية
                            </button>
                        }
                    />
                ) : (
                    <div className="tbl-wrap">
                        <table className="tbl">
                            <thead>
                                <tr>
                                    <th>اسم الموظف</th>
                                    <th className="c">الوردية</th>
                                    <th>وقت الحضور الفعلي</th>
                                    <th>وقت الانصراف الفعلي</th>
                                    <th className="c">الساعات الإضافية</th>
                                    <th className="c">إدارة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map((record) => {
                                    const time = cleanTime(record.checkIn ?? record.check_in ?? record.attendance_time);
                                    const isMorning = isMorningShiftTime(time);
                                    const overtime = Number(record.overtime_hours) || 0;
                                    return (
                                        <tr key={record.employee_id ?? record.id}>
                                            <td className="cell-main nowrap">
                                                {record.employeeName || record.employee_name || record.name || '-'}
                                            </td>
                                            <td className="c">
                                                <Badge tone={isMorning ? 'amber' : 'purple'}>
                                                    {isMorning ? 'صباحية' : 'مسائية'}
                                                </Badge>
                                            </td>
                                            <td className="num">{formatTo12Hour(record.checkIn ?? record.check_in)}</td>
                                            <td className="num">{formatTo12Hour(record.checkOut ?? record.check_out)}</td>
                                            <td className="c">
                                                {overtime > 0 ? (
                                                    <Badge tone="green">+{overtime} ساعة</Badge>
                                                ) : (
                                                    <span className="muted">-</span>
                                                )}
                                            </td>
                                            <td className="c">
                                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleEdit(record)}>
                                                    <Pencil size={13} />
                                                    تعديل
                                                </button>
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
                onClose={handleCloseModal}
                title={editingRecord ? 'تعديل وردية موظف' : 'تسجيل وردية / ساعات إضافية'}
                sub={editingRecord ? formData.employeeName : `ليوم ${selectedDate}`}
                footer={
                    <>
                        <button type="submit" form="shift-form" className="btn btn-primary" disabled={saving}>
                            {saving ? 'جاري الحفظ...' : 'حفظ السجل'}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={handleCloseModal} disabled={saving}>
                            إلغاء
                        </button>
                    </>
                }
            >
                <form id="shift-form" onSubmit={handleSave}>
                    <div className="field mb">
                        <label className="field-label">الموظف <span className="req">*</span></label>
                        <select
                            className="select"
                            value={formData.employee_id}
                            disabled={!!editingRecord}
                            onChange={(e) => {
                                const emp = employees.find((item) => String(item.id ?? item.employee_id) === e.target.value);
                                setFormData({ ...formData, employee_id: e.target.value, employeeName: emp ? emp.name : '' });
                            }}
                        >
                            <option value="">اختر الموظف</option>
                            {employees.map((emp) => (
                                <option key={emp.id ?? emp.employee_id} value={emp.id ?? emp.employee_id}>
                                    {emp.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="field mb">
                        <label className="field-label">الوردية</label>
                        <select className="select" value={formData.shift} onChange={(e) => handleShiftChange(e.target.value)}>
                            {Object.keys(SHIFT_OPTIONS).map((name) => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-grid mb">
                        <Field label="وقت الحضور">
                            <input
                                className="input ltr"
                                value={formData.checkIn}
                                onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                                placeholder="07:00 AM"
                            />
                        </Field>
                        <Field label="وقت الانصراف">
                            <input
                                className="input ltr"
                                value={formData.checkOut}
                                onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                                placeholder="05:00 PM"
                            />
                        </Field>
                    </div>

                    <div className="form-grid mb">
                        <Field label="الحالة">
                            <select
                                className="select"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="حاضر">حاضر</option>
                                <option value="متأخر">متأخر</option>
                                <option value="غائب">غائب</option>
                                <option value="إجازة">إجازة</option>
                            </select>
                        </Field>
                        <Field label="الساعات الإضافية">
                            <input
                                className="input ltr"
                                type="number"
                                min="0"
                                step="0.5"
                                value={formData.overtime}
                                onChange={(e) => setFormData({ ...formData, overtime: e.target.value })}
                            />
                        </Field>
                    </div>

                    <Field label="ملاحظات" hint="اختياري">
                        <textarea
                            className="textarea"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="أي ملاحظات على هذا السجل..."
                        />
                    </Field>
                </form>
            </Modal>
        </div>
    );
}
