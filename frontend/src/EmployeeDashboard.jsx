import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './EmployeeDashboard.css';

const API_URL = 'http://localhost:5000';

const getToken = () => localStorage.getItem('hr_token');

const getToday = () => {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const formatDate = (value) => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString('ar-EG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};

const formatMoney = (value) => {
    const number = Number(value || 0);

    return number.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const normalizeStatus = (status) => {
    if (!status) return 'غير محدد';

    const value = String(status).toLowerCase();

    if (
        value.includes('present') ||
        value.includes('حاضر')
    ) {
        return 'حاضر';
    }

    if (
        value.includes('late') ||
        value.includes('متأخر')
    ) {
        return 'متأخر';
    }

    if (
        value.includes('absent') ||
        value.includes('غائب')
    ) {
        return 'غائب';
    }

    if (
        value.includes('leave') ||
        value.includes('إجاز')
    ) {
        return 'إجازة';
    }

    return status;
};

const getStatusClass = (status) => {
    const normalized = normalizeStatus(status);

    if (normalized === 'حاضر') {
        return 'status-success';
    }

    if (normalized === 'متأخر') {
        return 'status-warning';
    }

    if (
        normalized === 'غائب' ||
        normalized === 'مرفوض'
    ) {
        return 'status-danger';
    }

    if (
        normalized === 'مقبول' ||
        normalized === 'معتمد'
    ) {
        return 'status-approved';
    }

    if (normalized === 'معلق' || normalized === 'قيد المراجعة') {
        return 'status-pending';
    }

    return 'status-neutral';
};

const getInitial = (name) => {
    if (!name) return 'R';

    return String(name)
        .trim()
        .charAt(0)
        .toUpperCase();
};

const normalizeLeaveStatus = (status) => {
    if (!status) return 'معلق';

    const value = String(status).toLowerCase();

    if (
        value.includes('approved') ||
        value.includes('approve') ||
        value.includes('مقبول') ||
        value.includes('معتمد')
    ) {
        return 'مقبول';
    }

    if (
        value.includes('rejected') ||
        value.includes('reject') ||
        value.includes('مرفوض')
    ) {
        return 'مرفوض';
    }

    return 'معلق';
};

export default function EmployeeDashboard({
    user,
    onLogout
}) {
    const [activePage, setActivePage] = useState('home');

    const [employee, setEmployee] = useState(null);
    const [stats, setStats] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [salary, setSalary] = useState(null);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [leaveSubmitting, setLeaveSubmitting] = useState(false);
    const [leaveDeleting, setLeaveDeleting] = useState(null);
    const [leaveError, setLeaveError] = useState('');

    const [leaveForm, setLeaveForm] = useState({
        type: 'إجازة سنوية',
        startDate: '',
        endDate: '',
        reason: ''
    });

    const token = getToken();

    const headers = useMemo(() => {
        return {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }, [token]);

    const employeeId = employee?.id;

    const fetchJson = async (url, options = {}) => {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...headers,
                ...(options.headers || {})
            }
        });

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            throw new Error(
                data.message ||
                'حدث خطأ أثناء الاتصال بالخادم'
            );
        }

        return data;
    };

    const loadData = useCallback(
        async (showFullLoading = true) => {
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                if (showFullLoading) {
                    setLoading(true);
                } else {
                    setRefreshing(true);
                }

                setError('');

                const today = getToday();

                const [
                    employeesResponse,
                    statsResponse,
                    attendanceResponse,
                    leavesResponse,
                    holidaysResponse,
                    salariesResponse
                ] = await Promise.all([
                    fetchJson(`${API_URL}/api/employees`),
                    fetchJson(`${API_URL}/api/dashboard/stats`),
                    fetchJson(
                        `${API_URL}/api/attendance?date=${today}`
                    ),
                    fetchJson(`${API_URL}/api/leaves`),
                    fetchJson(`${API_URL}/api/official-holidays`),
                    fetchJson(`${API_URL}/api/salaries`)
                ]);

                const employees =
                    employeesResponse?.employees ||
                    [];

                const currentEmployee =
                    employees[0] || null;

                setEmployee(currentEmployee);

                const statsData =
                    statsResponse?.stats ||
                    statsResponse ||
                    {};

                setStats(statsData);

                const attendanceData =
                    attendanceResponse?.attendance ||
                    attendanceResponse ||
                    [];

                setAttendance(
                    Array.isArray(attendanceData)
                        ? attendanceData
                        : []
                );

                const leavesData =
                    leavesResponse?.leaves ||
                    leavesResponse ||
                    [];

                setLeaves(
                    Array.isArray(leavesData)
                        ? leavesData
                        : []
                );

                const holidaysData =
                    holidaysResponse?.holidays ||
                    holidaysResponse ||
                    [];

                setHolidays(
                    Array.isArray(holidaysData)
                        ? holidaysData
                        : []
                );

                const salariesData =
                    salariesResponse?.salaries ||
                    salariesResponse ||
                    [];

                setSalary(
                    Array.isArray(salariesData)
                        ? salariesData[0] || null
                        : null
                );

            } catch (err) {
                console.error(
                    'Employee dashboard error:',
                    err
                );

                setError(
                    err.message ||
                    'حدث خطأ أثناء تحميل بيانات الموظف'
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [token]
    );

    useEffect(() => {
        loadData(true);
    }, [loadData]);

    const todayAttendance = useMemo(() => {
        if (!attendance.length) {
            return null;
        }

        return (
            attendance.find(
                (item) =>
                    Number(item.employee_id) ===
                    Number(employeeId)
            ) ||
            attendance[0] ||
            null
        );
    }, [attendance, employeeId]);

    const monthlyAttendanceDays = useMemo(() => {
        if (
            stats?.present_days !== undefined &&
            stats?.present_days !== null
        ) {
            return Number(stats.present_days) || 0;
        }

        if (
            salary?.present_days !== undefined &&
            salary?.present_days !== null
        ) {
            return Number(salary.present_days) || 0;
        }

        return 0;
    }, [stats, salary]);

    const monthlyAbsenceDays = useMemo(() => {
        if (
            stats?.absence_days !== undefined &&
            stats?.absence_days !== null
        ) {
            return Number(stats.absence_days) || 0;
        }

        return Number(salary?.absence_days || 0);
    }, [stats, salary]);

    const monthlyLeaveDays = useMemo(() => {
        if (
            stats?.leave_days !== undefined &&
            stats?.leave_days !== null
        ) {
            return Number(stats.leave_days) || 0;
        }

        return 0;
    }, [stats]);

    const monthlyOvertimeHours = useMemo(() => {
        if (
            stats?.overtime_hours !== undefined &&
            stats?.overtime_hours !== null
        ) {
            return Number(stats.overtime_hours) || 0;
        }

        return Number(
            salary?.overtime_hours || 0
        );
    }, [stats, salary]);

    const currentSalary = Number(
        salary?.net_salary ??
        salary?.base_salary ??
        salary?.salary ??
        0
    );

    const baseSalary = Number(
        salary?.base_salary ??
        salary?.salary ??
        0
    );

    const overtimeAmount = Number(
        salary?.overtime_amount || 0
    );

    const deductionAmount = Number(
        salary?.deduction_amount || 0
    );

    const employeeName =
        employee?.name ||
        user?.name ||
        user?.username ||
        'الموظف';

    const handleNavigation = (page) => {
        setActivePage(page);

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    const handleLeaveInput = (event) => {
        const {
            name,
            value
        } = event.target;

        setLeaveForm((previous) => ({
            ...previous,
            [name]: value
        }));

        if (leaveError) {
            setLeaveError('');
        }
    };

    const openLeaveModal = () => {
        setLeaveError('');

        setLeaveForm({
            type: 'إجازة سنوية',
            startDate: '',
            endDate: '',
            reason: ''
        });

        setShowLeaveModal(true);
    };

    const closeLeaveModal = () => {
        if (leaveSubmitting) return;

        setShowLeaveModal(false);
        setLeaveError('');
    };

    const submitLeave = async (event) => {
        event.preventDefault();

        if (!employeeId) {
            setLeaveError(
                'حساب الموظف غير مرتبط ببيانات موظف.'
            );
            return;
        }

        if (
            !leaveForm.startDate ||
            !leaveForm.endDate
        ) {
            setLeaveError(
                'من فضلك اختاري تاريخ بداية ونهاية الإجازة.'
            );
            return;
        }

        if (
            leaveForm.endDate <
            leaveForm.startDate
        ) {
            setLeaveError(
                'تاريخ نهاية الإجازة يجب أن يكون بعد تاريخ البداية.'
            );
            return;
        }

        try {
            setLeaveSubmitting(true);
            setLeaveError('');

            await fetchJson(
                `${API_URL}/api/leaves`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        employee_id: employeeId,
                        employeeName: employeeName,
                        type: leaveForm.type,
                        startDate: leaveForm.startDate,
                        endDate: leaveForm.endDate,
                        reason: leaveForm.reason.trim(),
                        status: 'pending'
                    })
                }
            );

            setShowLeaveModal(false);

            setLeaveForm({
                type: 'إجازة سنوية',
                startDate: '',
                endDate: '',
                reason: ''
            });

            await loadData(false);

            setActivePage('leaves');

        } catch (err) {
            console.error(
                'Submit leave error:',
                err
            );

            setLeaveError(
                err.message ||
                'حدث خطأ أثناء إرسال طلب الإجازة.'
            );
        } finally {
            setLeaveSubmitting(false);
        }
    };

    const deleteLeave = async (leaveId) => {
        if (!leaveId) return;

        const confirmed = window.confirm(
            'هل أنتِ متأكدة من حذف طلب الإجازة؟'
        );

        if (!confirmed) return;

        try {
            setLeaveDeleting(leaveId);

            await fetchJson(
                `${API_URL}/api/leaves/${leaveId}`,
                {
                    method: 'DELETE'
                }
            );

            await loadData(false);

        } catch (err) {
            console.error(
                'Delete leave error:',
                err
            );

            setError(
                err.message ||
                'حدث خطأ أثناء حذف طلب الإجازة.'
            );
        } finally {
            setLeaveDeleting(null);
        }
    };

    const renderStatus = (status) => {
        const label =
            normalizeLeaveStatus(status);

        return (
            <span
                className={`status-badge ${getStatusClass(
                    status
                )}`}
            >
                <i />
                {label}
            </span>
        );
    };

    const renderHome = () => {
        return (
            <div className="page-container">

                <div className="welcome-section">

                    <div className="welcome-copy">

                        <span className="section-eyebrow">
                            مساحة عملك الشخصية
                        </span>

                        <h2>
                            صباح الخير،
                            {' '}
                            <strong>
                                {employeeName}
                            </strong>
                            {' '}
                            👋
                        </h2>

                        <p>
                            كل معلوماتك الوظيفية في مكان واحد.
                            تابع حضورك وراتبك وإجازاتك بسهولة.
                        </p>

                    </div>

                    <div className="welcome-meta">

                        <div className="welcome-date">

                            <span>
                                اليوم
                            </span>

                            <strong>
                                {formatDate(
                                    getToday()
                                )}
                            </strong>

                        </div>

                        <div className="employee-id-badge">

                            <span>
                                Employee ID
                            </span>

                            <strong>
                                #
                                {employee?.id || '—'}
                            </strong>

                        </div>

                    </div>

                </div>

                <div className="stats-grid">

                    <div className="stat-card blue">

                        <div className="stat-top">

                            <span>
                                هذا الشهر
                            </span>

                            <div className="stat-icon">
                                ◷
                            </div>

                        </div>

                        <strong>
                            {monthlyAttendanceDays}
                        </strong>

                        <p>
                            أيام الحضور
                        </p>

                    </div>

                    <div className="stat-card orange">

                        <div className="stat-top">

                            <span>
                                هذا الشهر
                            </span>

                            <div className="stat-icon">
                                ×
                            </div>

                        </div>

                        <strong>
                            {monthlyAbsenceDays}
                        </strong>

                        <p>
                            أيام الغياب
                        </p>

                    </div>

                    <div className="stat-card green">

                        <div className="stat-top">

                            <span>
                                هذا الشهر
                            </span>

                            <div className="stat-icon">
                                ▱
                            </div>

                        </div>

                        <strong>
                            {monthlyLeaveDays}
                        </strong>

                        <p>
                            أيام الإجازات
                        </p>

                    </div>

                    <div className="stat-card purple">

                        <div className="stat-top">

                            <span>
                                هذا الشهر
                            </span>

                            <div className="stat-icon">
                                +
                            </div>

                        </div>

                        <strong>
                            {monthlyOvertimeHours}
                        </strong>

                        <p>
                            ساعات إضافية
                        </p>

                    </div>

                </div>

                <div className="dashboard-columns">

                    <div className="content-panel">

                        <div className="panel-header">

                            <div>
                                <span>
                                    الحضور والانصراف
                                </span>

                                <h3>
                                    حضور اليوم
                                </h3>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    handleNavigation(
                                        'attendance'
                                    )
                                }
                            >
                                عرض التفاصيل ←
                            </button>

                        </div>

                        {todayAttendance ? (
                            <>
                                <div className="attendance-status-row">

                                    <span>
                                        حالة اليوم
                                    </span>

                                    <span
                                        className={`status-badge ${getStatusClass(
                                            todayAttendance.status
                                        )}`}
                                    >
                                        <i />
                                        {normalizeStatus(
                                            todayAttendance.status
                                        )}
                                    </span>

                                </div>

                                <div className="attendance-time-grid">

                                    <div className="time-box">

                                        <span>
                                            الحضور
                                        </span>

                                        <strong>
                                            {
                                                todayAttendance.checkIn ||
                                                todayAttendance.check_in ||
                                                '—'
                                            }
                                        </strong>

                                    </div>

                                    <div className="time-box">

                                        <span>
                                            الانصراف
                                        </span>

                                        <strong>
                                            {
                                                todayAttendance.checkOut ||
                                                todayAttendance.check_out ||
                                                '—'
                                            }
                                        </strong>

                                    </div>

                                    <div className="time-box">

                                        <span>
                                            الساعات الإضافية
                                        </span>

                                        <strong>
                                            {Number(
                                                todayAttendance.overtime_hours ||
                                                0
                                            )}{' '}
                                            ساعة
                                        </strong>

                                    </div>

                                </div>
                            </>
                        ) : (
                            <div className="empty-state">

                                <div className="empty-icon">
                                    ◷
                                </div>

                                <h3>
                                    لا يوجد تسجيل حضور اليوم
                                </h3>

                                <p>
                                    لا توجد بيانات حضور مسجلة
                                    لهذا اليوم.
                                </p>

                            </div>
                        )}

                    </div>

                    <div className="content-panel">

                        <div className="panel-header">

                            <div>
                                <span>
                                    المستحقات المالية
                                </span>

                                <h3>
                                    راتبي
                                </h3>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    handleNavigation(
                                        'salary'
                                    )
                                }
                            >
                                عرض التفاصيل ←
                            </button>

                        </div>

                        {salary ? (
                            <>
                                <div className="salary-main">

                                    <span>
                                        صافي الراتب
                                    </span>

                                    <strong>
                                        {formatMoney(
                                            currentSalary
                                        )}
                                        <small>
                                            EGP
                                        </small>
                                    </strong>

                                </div>

                                <div className="salary-breakdown">

                                    <div className="money-line">

                                        <span>
                                            الأساسي
                                        </span>

                                        <strong>
                                            {formatMoney(
                                                baseSalary
                                            )}
                                        </strong>

                                    </div>

                                    <div className="money-line">

                                        <span>
                                            الإضافي
                                        </span>

                                        <strong className="positive-money">
                                            +{' '}
                                            {formatMoney(
                                                overtimeAmount
                                            )}
                                        </strong>

                                    </div>

                                    <div className="money-line">

                                        <span>
                                            الخصومات
                                        </span>

                                        <strong className="negative-money">
                                            -{' '}
                                            {formatMoney(
                                                deductionAmount
                                            )}
                                        </strong>

                                    </div>

                                </div>
                            </>
                        ) : (
                            <div className="empty-state">

                                <div className="empty-icon">
                                    EGP
                                </div>

                                <h3>
                                    لا توجد بيانات راتب
                                </h3>

                                <p>
                                    لم يتم العثور على سجل راتب
                                    حاليًا.
                                </p>

                            </div>
                        )}

                    </div>

                </div>

                <div className="dashboard-columns">

                    <div className="content-panel">

                        <div className="panel-header">

                            <div>
                                <span>
                                    الإجازات
                                </span>

                                <h3>
                                    آخر طلبات الإجازات
                                </h3>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    handleNavigation(
                                        'leaves'
                                    )
                                }
                            >
                                عرض الكل ←
                            </button>

                        </div>

                        {leaves.length > 0 ? (
                            <div className="mini-list">

                                {leaves
                                    .slice(0, 3)
                                    .map((leave) => (
                                        <div
                                            className="mini-list-row"
                                            key={leave.id}
                                        >

                                            <div className="mini-row-icon">
                                                ▱
                                            </div>

                                            <div className="mini-row-content">

                                                <strong>
                                                    {leave.type ||
                                                        'إجازة'}
                                                </strong>

                                                <span>
                                                    {formatDate(
                                                        leave.startDate ||
                                                        leave.start_date
                                                    )}
                                                    {' '}
                                                    —
                                                    {' '}
                                                    {formatDate(
                                                        leave.endDate ||
                                                        leave.end_date
                                                    )}
                                                </span>

                                            </div>

                                            {renderStatus(
                                                leave.status
                                            )}

                                        </div>
                                    ))}

                            </div>
                        ) : (
                            <div className="empty-state">

                                <div className="empty-icon">
                                    ▱
                                </div>

                                <h3>
                                    لا توجد طلبات إجازات
                                </h3>

                                <p>
                                    ستظهر طلبات الإجازات الخاصة
                                    بك هنا.
                                </p>

                                <button
                                    type="button"
                                    className="secondary-action"
                                    onClick={
                                        openLeaveModal
                                    }
                                >
                                    تقديم طلب إجازة
                                </button>

                            </div>
                        )}

                    </div>

                    <div className="content-panel">

                        <div className="panel-header">

                            <div>
                                <span>
                                    التقويم
                                </span>

                                <h3>
                                    العطلات القادمة
                                </h3>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    handleNavigation(
                                        'holidays'
                                    )
                                }
                            >
                                عرض الكل ←
                            </button>

                        </div>

                        {holidays.length > 0 ? (
                            <div className="mini-list">

                                {holidays
                                    .slice(0, 3)
                                    .map((holiday) => (
                                        <div
                                            className="mini-list-row"
                                            key={
                                                holiday.id ||
                                                holiday.date
                                            }
                                        >

                                            <div className="mini-row-icon holiday-mini-icon">
                                                □
                                            </div>

                                            <div className="mini-row-content">

                                                <strong>
                                                    {holiday.name ||
                                                        holiday.title ||
                                                        'عطلة رسمية'}
                                                </strong>

                                                <span>
                                                    {formatDate(
                                                        holiday.date ||
                                                        holiday.holiday_date ||
                                                        holiday.start_date
                                                    )}
                                                </span>

                                            </div>

                                        </div>
                                    ))}

                            </div>
                        ) : (
                            <div className="empty-state">

                                <div className="empty-icon">
                                    □
                                </div>

                                <h3>
                                    لا توجد عطلات قادمة
                                </h3>

                                <p>
                                    لا توجد عطلات مسجلة حاليًا.
                                </p>

                            </div>
                        )}

                    </div>

                </div>

            </div>
        );
    };

    const renderProfile = () => {
        return (
            <div className="page-container">

                <div className="page-intro">
                    <span>
                        بيانات الموظف
                    </span>

                    <h2>
                        ملفي الشخصي
                    </h2>

                    <p>
                        عرض بياناتك الوظيفية المسجلة في
                        نظام الموارد البشرية.
                    </p>
                </div>

                <div className="profile-hero">

                    <div className="large-avatar">
                        {getInitial(employeeName)}
                    </div>

                    <div className="profile-hero-info">

                        <span>
                            موظف
                        </span>

                        <h2>
                            {employeeName}
                        </h2>

                        <p>
                            {employee?.department_name ||
                                employee?.department ||
                                'لم يتم تحديد القسم'}
                        </p>

                    </div>

                    <div className="profile-number">

                        <span>
                            Employee ID
                        </span>

                        <strong>
                            #{employee?.id || '—'}
                        </strong>

                    </div>

                </div>

                <div className="content-panel">

                    <div className="panel-title-block">

                        <span>
                            المعلومات الأساسية
                        </span>

                        <h3>
                            البيانات الوظيفية
                        </h3>

                    </div>

                    <div className="details-grid">

                        <div className="detail-item">
                            <span>
                                الاسم
                            </span>
                            <strong>
                                {employee?.name || '—'}
                            </strong>
                        </div>

                        <div className="detail-item">
                            <span>
                                الهاتف
                            </span>
                            <strong>
                                {employee?.phone || '—'}
                            </strong>
                        </div>

                        <div className="detail-item">
                            <span>
                                البريد الإلكتروني
                            </span>
                            <strong>
                                {user?.email || '—'}
                            </strong>
                        </div>

                        <div className="detail-item">
                            <span>
                                القسم
                            </span>
                            <strong>
                                {employee?.department_name ||
                                    employee?.department ||
                                    '—'}
                            </strong>
                        </div>

                        <div className="detail-item">
                            <span>
                                تاريخ التعاقد
                            </span>
                            <strong>
                                {formatDate(
                                    employee?.contract_date
                                )}
                            </strong>
                        </div>

                        <div className="detail-item">
                            <span>
                                تاريخ الميلاد
                            </span>
                            <strong>
                                {formatDate(
                                    employee?.birth_date
                                )}
                            </strong>
                        </div>

                        <div className="detail-item">
                            <span>
                                الجنس
                            </span>
                            <strong>
                                {employee?.gender || '—'}
                            </strong>
                        </div>

                        <div className="detail-item">
                            <span>
                                الجنسية
                            </span>
                            <strong>
                                {employee?.nationality || '—'}
                            </strong>
                        </div>

                        <div className="detail-item">
                            <span>
                                العنوان
                            </span>
                            <strong>
                                {employee?.address || '—'}
                            </strong>
                        </div>

                    </div>

                </div>

            </div>
        );
    };

    const renderAttendance = () => {
        return (
            <div className="page-container">

                <div className="page-intro">
                    <span>
                        الحضور والانصراف
                    </span>

                    <h2>
                        حضوري
                    </h2>

                    <p>
                        متابعة سجل حضورك وانصرافك.
                        يمكنك الاطلاع على البيانات المسجلة
                        من قسم الموارد البشرية.
                    </p>
                </div>

                <div className="content-panel">

                    <div className="attendance-page-header">

                        <div>
                            <span>
                                سجل اليوم
                            </span>

                            <h3>
                                {formatDate(getToday())}
                            </h3>
                        </div>

                        {todayAttendance &&
                            (
                                <span
                                    className={`status-badge ${getStatusClass(
                                        todayAttendance.status
                                    )}`}
                                >
                                    <i />
                                    {normalizeStatus(
                                        todayAttendance.status
                                    )}
                                </span>
                            )}

                    </div>

                    {todayAttendance ? (
                        <div className="attendance-details-grid">

                            <div className="detail-metric">

                                <div className="metric-icon">
                                    ◷
                                </div>

                                <span>
                                    وقت الحضور
                                </span>

                                <strong>
                                    {
                                        todayAttendance.checkIn ||
                                        todayAttendance.check_in ||
                                        '—'
                                    }
                                </strong>

                            </div>

                            <div className="detail-metric">

                                <div className="metric-icon">
                                    ◴
                                </div>

                                <span>
                                    وقت الانصراف
                                </span>

                                <strong>
                                    {
                                        todayAttendance.checkOut ||
                                        todayAttendance.check_out ||
                                        '—'
                                    }
                                </strong>

                            </div>

                            <div className="detail-metric">

                                <div className="metric-icon">
                                    +
                                </div>

                                <span>
                                    ساعات إضافية
                                </span>

                                <strong>
                                    {Number(
                                        todayAttendance.overtime_hours ||
                                        0
                                    )}
                                </strong>

                            </div>

                            <div className="detail-metric">

                                <div className="metric-icon">
                                    ✓
                                </div>

                                <span>
                                    الحالة
                                </span>

                                <strong>
                                    {normalizeStatus(
                                        todayAttendance.status
                                    )}
                                </strong>

                            </div>

                        </div>
                    ) : (
                        <div className="empty-state">

                            <div className="empty-icon">
                                ◷
                            </div>

                            <h3>
                                لا يوجد سجل حضور اليوم
                            </h3>

                            <p>
                                لم يتم تسجيل حضور لهذا اليوم
                                حتى الآن.
                            </p>

                        </div>
                    )}

                </div>

            </div>
        );
    };

    const renderSalary = () => {
        return (
            <div className="page-container">

                <div className="page-intro">
                    <span>
                        المستحقات المالية
                    </span>

                    <h2>
                        راتبي
                    </h2>

                    <p>
                        عرض تفاصيل راتبك والمبالغ المضافة
                        والمخصومة.
                    </p>
                </div>

                {salary ? (
                    <>
                        <div className="salary-hero">

                            <div>

                                <span>
                                    صافي الراتب
                                </span>

                                <strong>
                                    {formatMoney(
                                        currentSalary
                                    )}
                                    <small>
                                        EGP
                                    </small>
                                </strong>

                                <p>
                                    صافي المستحق حسب آخر سجل راتب.
                                </p>

                            </div>

                            <div className="salary-symbol">
                                EGP
                            </div>

                        </div>

                        <div className="salary-detail-grid">

                            <div className="salary-detail">

                                <span>
                                    الراتب الأساسي
                                </span>

                                <strong>
                                    {formatMoney(
                                        baseSalary
                                    )}{' '}
                                    EGP
                                </strong>

                            </div>

                            <div className="salary-detail">

                                <span>
                                    الإضافي
                                </span>

                                <strong className="positive-money">
                                    +{' '}
                                    {formatMoney(
                                        overtimeAmount
                                    )}{' '}
                                    EGP
                                </strong>

                            </div>

                            <div className="salary-detail">

                                <span>
                                    الخصومات
                                </span>

                                <strong className="negative-money">
                                    -{' '}
                                    {formatMoney(
                                        deductionAmount
                                    )}{' '}
                                    EGP
                                </strong>

                            </div>

                            <div className="salary-detail highlighted">

                                <span>
                                    صافي الراتب
                                </span>

                                <strong>
                                    {formatMoney(
                                        currentSalary
                                    )}{' '}
                                    EGP
                                </strong>

                            </div>

                        </div>

                        <div className="content-panel">

                            <div className="panel-title-block">

                                <span>
                                    ملخص الراتب
                                </span>

                                <h3>
                                    بيانات الفترة الحالية
                                </h3>

                            </div>

                            <div className="salary-info-list">

                                <div className="info-line">
                                    <span>
                                        أيام الحضور
                                    </span>
                                    <strong>
                                        {Number(
                                            salary.present_days ||
                                            0
                                        )}
                                    </strong>
                                </div>

                                <div className="info-line">
                                    <span>
                                        أيام الغياب
                                    </span>
                                    <strong>
                                        {Number(
                                            salary.absence_days ||
                                            0
                                        )}
                                    </strong>
                                </div>

                                <div className="info-line">
                                    <span>
                                        ساعات العمل الإضافية
                                    </span>
                                    <strong>
                                        {Number(
                                            salary.overtime_hours ||
                                            0
                                        )}
                                    </strong>
                                </div>

                            </div>

                        </div>
                    </>
                ) : (
                    <div className="content-panel">

                        <div className="empty-state">

                            <div className="empty-icon">
                                EGP
                            </div>

                            <h3>
                                لا توجد بيانات راتب
                            </h3>

                            <p>
                                لم يتم العثور على بيانات راتب
                                مرتبطة بحسابك.
                            </p>

                        </div>

                    </div>
                )}

            </div>
        );
    };

    const renderLeaves = () => {
        return (
            <div className="page-container">

                <div className="page-intro-with-action">

                    <div className="page-intro">

                        <span>
                            الإجازات
                        </span>

                        <h2>
                            إجازاتي
                        </h2>

                        <p>
                            متابعة طلبات الإجازات الخاصة بك
                            وتقديم طلب جديد.
                        </p>

                    </div>

                    <button
                        type="button"
                        className="primary-button"
                        onClick={openLeaveModal}
                    >
                        + تقديم طلب إجازة
                    </button>

                </div>

                <div className="leave-summary">

                    <div>
                        <span>
                            إجمالي الطلبات
                        </span>

                        <strong>
                            {leaves.length}
                        </strong>
                    </div>

                    <div>
                        <span>
                            قيد المراجعة
                        </span>

                        <strong>
                            {
                                leaves.filter(
                                    (leave) =>
                                        normalizeLeaveStatus(
                                            leave.status
                                        ) === 'معلق'
                                ).length
                            }
                        </strong>
                    </div>

                    <div>
                        <span>
                            الطلبات المقبولة
                        </span>

                        <strong>
                            {
                                leaves.filter(
                                    (leave) =>
                                        normalizeLeaveStatus(
                                            leave.status
                                        ) === 'مقبول'
                                ).length
                            }
                        </strong>
                    </div>

                </div>

                <div className="content-panel">

                    <div className="panel-header">

                        <div>
                            <span>
                                سجل الطلبات
                            </span>

                            <h3>
                                طلبات الإجازة
                            </h3>
                        </div>

                    </div>

                    {leaves.length > 0 ? (
                        <div className="leave-list">

                            {leaves.map((leave) => {

                                const status =
                                    normalizeLeaveStatus(
                                        leave.status
                                    );

                                const isPending =
                                    status === 'معلق';

                                return (
                                    <div
                                        className="leave-item"
                                        key={leave.id}
                                    >

                                        <div className="leave-date-box">

                                            <span>
                                                {formatDate(
                                                    leave.startDate ||
                                                    leave.start_date
                                                )}
                                            </span>

                                            <small>
                                                إلى
                                            </small>

                                            <span>
                                                {formatDate(
                                                    leave.endDate ||
                                                    leave.end_date
                                                )}
                                            </span>

                                        </div>

                                        <div className="leave-main">

                                            <div className="leave-main-top">

                                                <h3>
                                                    {leave.type ||
                                                        'إجازة'}
                                                </h3>

                                                {renderStatus(
                                                    leave.status
                                                )}

                                            </div>

                                            <p>
                                                {leave.reason ||
                                                    'لا يوجد سبب مسجل'}
                                            </p>

                                        </div>

                                        <div className="leave-actions">

                                            {isPending && (
                                                <button
                                                    type="button"
                                                    className="delete-leave-button"
                                                    disabled={
                                                        leaveDeleting ===
                                                        leave.id
                                                    }
                                                    onClick={() =>
                                                        deleteLeave(
                                                            leave.id
                                                        )
                                                    }
                                                >
                                                    {leaveDeleting ===
                                                        leave.id
                                                        ? 'جاري الحذف...'
                                                        : 'حذف الطلب'}
                                                </button>
                                            )}

                                        </div>

                                    </div>
                                );
                            })}

                        </div>
                    ) : (
                        <div className="empty-state">

                            <div className="empty-icon">
                                ▱
                            </div>

                            <h3>
                                لا توجد طلبات إجازات
                            </h3>

                            <p>
                                لم تقم بتقديم أي طلبات إجازة
                                حتى الآن.
                            </p>

                            <button
                                type="button"
                                className="secondary-action"
                                onClick={
                                    openLeaveModal
                                }
                            >
                                تقديم أول طلب إجازة
                            </button>

                        </div>
                    )}

                </div>

            </div>
        );
    };

    const renderHolidays = () => {
        return (
            <div className="page-container">

                <div className="page-intro">

                    <span>
                        التقويم
                    </span>

                    <h2>
                        العطلات
                    </h2>

                    <p>
                        الاطلاع على العطلات الرسمية المسجلة
                        في النظام.
                    </p>

                </div>

                <div className="content-panel">

                    <div className="panel-header">

                        <div>
                            <span>
                                التقويم الرسمي
                            </span>

                            <h3>
                                العطلات القادمة
                            </h3>
                        </div>

                    </div>

                    {holidays.length > 0 ? (
                        <div className="holiday-list">

                            {holidays.map((holiday) => (
                                <div
                                    className="holiday-item"
                                    key={
                                        holiday.id ||
                                        holiday.date ||
                                        holiday.holiday_date
                                    }
                                >

                                    <div className="holiday-icon">
                                        □
                                    </div>

                                    <div className="holiday-content">

                                        <span>
                                            عطلة رسمية
                                        </span>

                                        <h3>
                                            {holiday.name ||
                                                holiday.title ||
                                                holiday.holiday_name ||
                                                'عطلة رسمية'}
                                        </h3>

                                    </div>

                                    <div className="holiday-date">
                                        {formatDate(
                                            holiday.date ||
                                            holiday.holiday_date ||
                                            holiday.start_date
                                        )}
                                    </div>

                                </div>
                            ))}

                        </div>
                    ) : (
                        <div className="empty-state">

                            <div className="empty-icon">
                                □
                            </div>

                            <h3>
                                لا توجد عطلات قادمة
                            </h3>

                            <p>
                                لا توجد عطلات رسمية مسجلة
                                حاليًا.
                            </p>

                        </div>
                    )}

                </div>

            </div>
        );
    };

    const renderPage = () => {
        switch (activePage) {
            case 'profile':
                return renderProfile();

            case 'attendance':
                return renderAttendance();

            case 'salary':
                return renderSalary();

            case 'leaves':
                return renderLeaves();

            case 'holidays':
                return renderHolidays();

            case 'home':
            default:
                return renderHome();
        }
    };

    if (loading) {
        return (
            <div className="employee-loading-page">

                <div className="employee-loader">

                    <div className="employee-loader-ring" />

                    <h2>
                        PIONEERS HRMS
                    </h2>

                    <p>
                        جاري تحميل مساحة الموظف...
                    </p>

                </div>

            </div>
        );
    }

    return (
        <div className="employee-portal">

            <aside className="employee-sidebar">

                <div className="sidebar-brand">

                    <div className="brand-mark">
                        P
                    </div>

                    <div>
                        <div className="brand-name">
                            PIONEERS
                        </div>

                        <div className="brand-subtitle">
                            HR MANAGEMENT SYSTEM
                        </div>
                    </div>

                </div>

                <div className="sidebar-profile">

                    <div className="profile-avatar">
                        {getInitial(employeeName)}
                    </div>

                    <div className="profile-info">

                        <strong>
                            {employeeName}
                        </strong>

                        <span>
                            موظف
                        </span>

                    </div>

                </div>

                <div className="sidebar-section-label">
                    مساحة الموظف
                </div>

                <nav className="employee-navigation">

                    <button
                        type="button"
                        className={`nav-item ${activePage === 'home'
                                ? 'active'
                                : ''
                            }`}
                        onClick={() =>
                            handleNavigation('home')
                        }
                    >
                        <span className="employee-icon">
                            ⌂
                        </span>

                        الرئيسية
                    </button>

                    <button
                        type="button"
                        className={`nav-item ${activePage === 'profile'
                                ? 'active'
                                : ''
                            }`}
                        onClick={() =>
                            handleNavigation('profile')
                        }
                    >
                        <span className="employee-icon">
                            ◉
                        </span>

                        ملفي الشخصي
                    </button>

                    <button
                        type="button"
                        className={`nav-item ${activePage === 'attendance'
                                ? 'active'
                                : ''
                            }`}
                        onClick={() =>
                            handleNavigation('attendance')
                        }
                    >
                        <span className="employee-icon">
                            ◷
                        </span>

                        حضوري
                    </button>

                    <button
                        type="button"
                        className={`nav-item ${activePage === 'salary'
                                ? 'active'
                                : ''
                            }`}
                        onClick={() =>
                            handleNavigation('salary')
                        }
                    >
                        <span className="employee-icon">
                            ▣
                        </span>

                        راتبي
                    </button>

                    <button
                        type="button"
                        className={`nav-item ${activePage === 'leaves'
                                ? 'active'
                                : ''
                            }`}
                        onClick={() =>
                            handleNavigation('leaves')
                        }
                    >
                        <span className="employee-icon">
                            ▱
                        </span>

                        إجازاتي
                    </button>

                    <button
                        type="button"
                        className={`nav-item ${activePage === 'holidays'
                                ? 'active'
                                : ''
                            }`}
                        onClick={() =>
                            handleNavigation('holidays')
                        }
                    >
                        <span className="employee-icon">
                            □
                        </span>

                        العطلات
                    </button>

                </nav>

                <div className="sidebar-bottom">

                    <div className="help-box">

                        <div className="help-icon">
                            ?
                        </div>

                        <div>
                            <strong>
                                تحتاج مساعدة؟
                            </strong>

                            <span>
                                تواصل مع قسم الموارد البشرية
                            </span>
                        </div>

                    </div>

                    <button
                        type="button"
                        className="logout-button"
                        onClick={onLogout}
                    >
                        <span>
                            ↪
                        </span>

                        تسجيل الخروج
                    </button>

                </div>

            </aside>

            <main className="employee-main">

                <header className="employee-topbar">

                    <div className="topbar-heading">

                        <span className="topbar-kicker">
                            Employee Portal
                        </span>

                        <h1>
                            {activePage === 'home' &&
                                'الرئيسية'}

                            {activePage === 'profile' &&
                                'ملفي الشخصي'}

                            {activePage === 'attendance' &&
                                'حضوري'}

                            {activePage === 'salary' &&
                                'راتبي'}

                            {activePage === 'leaves' &&
                                'إجازاتي'}

                            {activePage === 'holidays' &&
                                'العطلات'}
                        </h1>

                    </div>

                    <div className="topbar-actions">

                        <button
                            type="button"
                            className="refresh-button"
                            onClick={() =>
                                loadData(false)
                            }
                            disabled={refreshing}
                        >
                            <span
                                className={`refresh-icon ${refreshing
                                        ? 'spinning'
                                        : ''
                                    }`}
                            >
                                ↻
                            </span>

                            تحديث البيانات
                        </button>

                        <div className="topbar-user">

                            <div className="topbar-avatar">
                                {getInitial(employeeName)}
                            </div>

                            <div>
                                <strong>
                                    {employeeName}
                                </strong>

                                <span>
                                    موظف
                                </span>
                            </div>

                        </div>

                    </div>

                </header>

                <section className="employee-content">

                    {error && (
                        <div className="employee-error">

                            <div>

                                <strong>
                                    تعذر تحميل بعض البيانات
                                </strong>

                                <span>
                                    {error}
                                </span>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    loadData(false)
                                }
                            >
                                إعادة المحاولة
                            </button>

                        </div>
                    )}

                    {renderPage()}

                </section>

            </main>

            {showLeaveModal && (
                <div
                    className="modal-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeLeaveModal();
                        }
                    }}
                >

                    <div className="leave-modal">

                        <div className="modal-header">

                            <div>

                                <span>
                                    طلب جديد
                                </span>

                                <h2>
                                    تقديم طلب إجازة
                                </h2>

                                <p>
                                    سيتم إرسال الطلب للمراجعة
                                    من قسم الموارد البشرية.
                                </p>

                            </div>

                            <button
                                type="button"
                                className="modal-close"
                                onClick={
                                    closeLeaveModal
                                }
                                disabled={
                                    leaveSubmitting
                                }
                            >
                                ×
                            </button>

                        </div>

                        <form
                            className="leave-form"
                            onSubmit={submitLeave}
                        >

                            <div className="form-grid">

                                <div className="form-field">

                                    <label>
                                        نوع الإجازة
                                    </label>

                                    <select
                                        name="type"
                                        value={
                                            leaveForm.type
                                        }
                                        onChange={
                                            handleLeaveInput
                                        }
                                    >
                                        <option value="إجازة سنوية">
                                            إجازة سنوية
                                        </option>

                                        <option value="إجازة مرضية">
                                            إجازة مرضية
                                        </option>

                                        <option value="إجازة طارئة">
                                            إجازة طارئة
                                        </option>

                                        <option value="إجازة بدون راتب">
                                            إجازة بدون راتب
                                        </option>

                                        <option value="أخرى">
                                            أخرى
                                        </option>
                                    </select>

                                </div>

                                <div className="form-field">

                                    <label>
                                        تاريخ البداية
                                    </label>

                                    <input
                                        type="date"
                                        name="startDate"
                                        value={
                                            leaveForm.startDate
                                        }
                                        onChange={
                                            handleLeaveInput
                                        }
                                        required
                                    />

                                </div>

                                <div className="form-field">

                                    <label>
                                        تاريخ النهاية
                                    </label>

                                    <input
                                        type="date"
                                        name="endDate"
                                        value={
                                            leaveForm.endDate
                                        }
                                        min={
                                            leaveForm.startDate ||
                                            undefined
                                        }
                                        onChange={
                                            handleLeaveInput
                                        }
                                        required
                                    />

                                </div>

                                <div className="form-field full">

                                    <label>
                                        سبب الإجازة
                                    </label>

                                    <textarea
                                        name="reason"
                                        rows="4"
                                        value={
                                            leaveForm.reason
                                        }
                                        onChange={
                                            handleLeaveInput
                                        }
                                        placeholder="اكتبي سبب طلب الإجازة..."
                                    />

                                </div>

                            </div>

                            {leaveError && (
                                <div className="form-error">
                                    {leaveError}
                                </div>
                            )}

                            <div className="modal-actions">

                                <button
                                    type="submit"
                                    className="primary-button"
                                    disabled={
                                        leaveSubmitting
                                    }
                                >
                                    {leaveSubmitting
                                        ? 'جاري إرسال الطلب...'
                                        : 'إرسال طلب الإجازة'}
                                </button>

                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={
                                        closeLeaveModal
                                    }
                                    disabled={
                                        leaveSubmitting
                                    }
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