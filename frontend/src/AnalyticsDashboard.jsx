import React, { useEffect, useMemo, useState } from 'react';

const API_URL = 'http://localhost:5000';

export default function AnalyticsDashboard() {
    const [employees, setEmployees] = useState([]);
    const [salaries, setSalaries] = useState([]);
    const [attendance, setAttendance] = useState([]);

    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({
        text: '',
        type: ''
    });

    const getToken = () => localStorage.getItem('hr_token');

    const getHeaders = () => ({
        Authorization: `Bearer ${getToken()}`
    });

    const fetchDashboardData = async () => {
        setLoading(true);
        setMessage({
            text: '',
            type: ''
        });

        try {
            const today = new Date()
                .toISOString()
                .split('T')[0];

            const [
                employeesResponse,
                salariesResponse,
                attendanceResponse
            ] = await Promise.all([
                fetch(
                    `${API_URL}/api/employees`,
                    {
                        headers: getHeaders()
                    }
                ),
                fetch(
                    `${API_URL}/api/salaries`,
                    {
                        headers: getHeaders()
                    }
                ),
                fetch(
                    `${API_URL}/api/attendance?date=${today}`,
                    {
                        headers: getHeaders()
                    }
                )
            ]);

            const employeesData =
                await employeesResponse.json();
            const salariesData =
                await salariesResponse.json();
            const attendanceData =
                await attendanceResponse.json();

            if (!employeesResponse.ok) {
                throw new Error(
                    employeesData.message || 'فشل تحميل بيانات الموظفين'
                );
            }

            if (!salariesResponse.ok) {
                throw new Error(
                    salariesData.message || 'فشل تحميل بيانات الرواتب'
                );
            }

            if (!attendanceResponse.ok) {
                throw new Error(
                    attendanceData.message || 'فشل تحميل بيانات الحضور'
                );
            }

            const employeeList = Array.isArray(employeesData)
                ? employeesData
                : Array.isArray(employeesData.employees)
                    ? employeesData.employees
                    : Array.isArray(employeesData.data)
                        ? employeesData.data
                        : [];

            const salaryList = Array.isArray(salariesData)
                ? salariesData
                : Array.isArray(salariesData.salaries)
                    ? salariesData.salaries
                    : Array.isArray(salariesData.data)
                        ? salariesData.data
                        : [];

            const attendanceList = Array.isArray(attendanceData)
                ? attendanceData
                : Array.isArray(attendanceData.attendance)
                    ? attendanceData.attendance
                    : Array.isArray(attendanceData.data)
                        ? attendanceData.data
                        : [];

            setEmployees(employeeList);
            setSalaries(salaryList);
            setAttendance(attendanceList);

        } catch (error) {
            console.error('Analytics dashboard error:', error);
            setMessage({
                text: error.message || 'حدث خطأ أثناء تحميل بيانات لوحة التحكم',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const totalEmployees = employees.length;

    const totalPayroll = useMemo(() => {
        return salaries.reduce((total, employee) => {
            const netSalary = Number(
                employee.net_salary ??
                employee.netSalary ??
                employee.salary ??
                employee.base_salary ??
                0
            );
            return total + netSalary;
        }, 0);
    }, [salaries]);

    const totalDeductions = useMemo(() => {
        return salaries.reduce((total, employee) => {
            const deduction = Number(
                employee.deduction_amount ??
                employee.deductionAmount ??
                0
            );
            return total + deduction;
        }, 0);
    }, [salaries]);

    const attendanceRate = useMemo(() => {
        if (employees.length === 0) return 0;

        const presentStatuses = [
            'حاضر',
            'حاضر (في الموعد)',
            'متأخر'
        ];

        const presentEmployees = attendance.filter((item) =>
            presentStatuses.includes(String(item.status || '').trim())
        ).length;

        return Math.round((presentEmployees / employees.length) * 100);
    }, [employees, attendance]);

    const departmentDistribution = useMemo(() => {
        const departmentMap = {};

        employees.forEach((employee) => {
            const department =
                employee.department_name ||
                employee.department ||
                'غير محدد';

            if (!departmentMap[department]) {
                departmentMap[department] = 0;
            }
            departmentMap[department] += 1;
        });

        const total = employees.length;

        return Object.entries(departmentMap)
            .map(([name, count], index) => ({
                name,
                count,
                percentage: total > 0 ? Math.round((count / total) * 100) : 0,
                color: [
                    '#0284c7',
                    '#16a34a',
                    '#f59e0b',
                    '#8b5cf6',
                    '#dc2626',
                    '#0891b2'
                ][index % 6]
            }))
            .sort((a, b) => b.count - a.count);
    }, [employees]);

    const formatMoney = (value) => {
        return new Intl.NumberFormat('ar-EG', {
            maximumFractionDigits: 2
        }).format(Number(value) || 0);
    };

    if (loading) {
        return (
            <div
                style={{
                    minHeight: '100vh',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    direction: 'rtl',
                    fontFamily: 'Tahoma, Arial, sans-serif'
                }}
            >
                <div
                    style={{
                        background: '#fff',
                        padding: '30px 40px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        color: '#475569',
                        fontSize: '14px',
                        fontWeight: '600',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                    }}
                >
                    جاري تحميل لوحة المؤشرات والتحليلات...
                </div>
            </div>
        );
    }

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
            {/* Header */}
            <div
                style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px 24px',
                    marginBottom: '24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    flexWrap: 'wrap',
                    gap: '15px'
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
                        لوحة المؤشرات والتحليلات البصرية
                    </h2>
                    <p
                        style={{
                            margin: '4px 0 0',
                            fontSize: '12px',
                            color: '#64748b'
                        }}
                    >
                        تحليل شامل ومباشر لبيانات الموظفين، الرواتب، ومعدلات الحضور اليومية
                    </p>
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}
                >
                    {message.text && (
                        <span
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                background: '#fee2e2',
                                color: '#991b1b'
                            }}
                        >
                            {message.text}
                        </span>
                    )}

                    <button
                        type="button"
                        onClick={fetchDashboardData}
                        style={{
                            background: '#0284c7',
                            color: '#fff',
                            border: 'none',
                            padding: '9px 18px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            transition: 'background 0.2s'
                        }}
                    >
                        تحديث المؤشرات
                    </button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                    gap: '20px',
                    marginBottom: '24px'
                }}
            >
                {/* Total Employees */}
                <div style={kpiCardStyle('#0284c7')}>
                    <span style={kpiLabelStyle}>إجمالي الموظفين</span>
                    <h3 style={kpiValueStyle('#1e293b')}>
                        {totalEmployees}
                        <span style={kpiUnitStyle}>موظف</span>
                    </h3>
                </div>

                {/* Total Payroll */}
                <div style={kpiCardStyle('#16a34a')}>
                    <span style={kpiLabelStyle}>إجمالي الرواتب الشهرية</span>
                    <h3 style={kpiValueStyle('#16a34a')}>
                        {formatMoney(totalPayroll)}
                        <span style={kpiUnitStyle}>ج.م</span>
                    </h3>
                </div>

                {/* Total Deductions */}
                <div style={kpiCardStyle('#f59e0b')}>
                    <span style={kpiLabelStyle}>إجمالي الخصومات والسلف</span>
                    <h3 style={kpiValueStyle('#d97706')}>
                        {formatMoney(totalDeductions)}
                        <span style={kpiUnitStyle}>ج.م</span>
                    </h3>
                </div>

                {/* Attendance Rate */}
                <div style={kpiCardStyle('#8b5cf6')}>
                    <span style={kpiLabelStyle}>معدل الحضور اليومي</span>
                    <h3 style={kpiValueStyle('#7c3aed')}>
                        {attendanceRate}%
                    </h3>
                </div>
            </div>

            {/* Department Distribution Section */}
            <div
                style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px',
                        borderBottom: '1px solid #f1f5f9',
                        paddingBottom: '12px'
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
                        توزيع الكوادر البشرية حسب الأقسام الإدارية
                    </h4>
                    <span
                        style={{
                            fontSize: '12px',
                            color: '#64748b',
                            background: '#f1f5f9',
                            padding: '4px 10px',
                            borderRadius: '6px'
                        }}
                    >
                        القوة العاملة الكلية: {totalEmployees}
                    </span>
                </div>

                {departmentDistribution.length === 0 ? (
                    <div
                        style={{
                            padding: '40px',
                            textAlign: 'center',
                            color: '#94a3b8',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            fontSize: '13px'
                        }}
                    >
                        لا توجد بيانات أقسام مسجلة حتى الآن
                    </div>
                ) : (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}
                    >
                        {departmentDistribution.map((dept) => (
                            <div
                                key={dept.name}
                                style={{
                                    background: '#f8fafc',
                                    padding: '16px 20px',
                                    borderRadius: '10px',
                                    border: '1px solid #e2e8f0'
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '10px',
                                        fontSize: '13px'
                                    }}
                                >
                                    <strong style={{ color: '#334155' }}>
                                        {dept.name}
                                    </strong>
                                    <span
                                        style={{
                                            color: dept.color,
                                            fontWeight: 'bold',
                                            background: '#ffffff',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            border: '1px solid #e2e8f0'
                                        }}
                                    >
                                        {dept.count} موظف ({dept.percentage}%)
                                    </span>
                                </div>

                                <div
                                    style={{
                                        width: '100%',
                                        background: '#e2e8f0',
                                        height: '10px',
                                        borderRadius: '5px',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div
                                        style={{
                                            width: `${dept.percentage}%`,
                                            background: dept.color,
                                            height: '100%',
                                            borderRadius: '5px',
                                            transition: 'width 0.6s ease-in-out'
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer status */}
            <div
                style={{
                    marginTop: '20px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '14px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    color: '#64748b'
                }}
            >
                <span>التحليلات والمؤشرات يتم تحديثها فورياً بناءً على العمليات المسجلة.</span>
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>
                    ● النظام متصل بقاعدة البيانات بنجاح
                </span>
            </div>
        </div>
    );
}

// Styles Helpers
const kpiCardStyle = (borderColor) => ({
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
    borderRight: `4px solid ${borderColor}`
});

const kpiLabelStyle = {
    display: 'block',
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '8px',
    fontWeight: '600'
};

const kpiValueStyle = (color) => ({
    margin: 0,
    fontSize: '22px',
    fontWeight: 'bold',
    color: color
});

const kpiUnitStyle = {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: 'normal',
    marginRight: '6px'
};