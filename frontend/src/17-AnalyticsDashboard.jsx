import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Users, Wallet, CircleDollarSign, UserCheck, RefreshCw } from 'lucide-react';
import { PageHeader, Card, Empty, Alert, Loading, Stat, API_URL } from './ui';

const BAR_COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#dc2626', '#0891b2'];

export default function AnalyticsDashboard() {
    const [employees, setEmployees] = useState([]);
    const [salaries, setSalaries] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ text: '', type: '' });

    const getHeaders = () => ({
        Authorization: `Bearer ${localStorage.getItem('hr_token')}`,
    });

    const fetchDashboardData = async () => {
        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            const today = new Date().toISOString().split('T')[0];

            const [employeesResponse, salariesResponse, attendanceResponse] = await Promise.all([
                fetch(`${API_URL}/api/employees`, { headers: getHeaders() }),
                fetch(`${API_URL}/api/salaries`, { headers: getHeaders() }),
                fetch(`${API_URL}/api/attendance?date=${today}`, { headers: getHeaders() }),
            ]);

            const employeesData = await employeesResponse.json();
            const salariesData = await salariesResponse.json();
            const attendanceData = await attendanceResponse.json();

            if (!employeesResponse.ok) throw new Error(employeesData.message || 'فشل تحميل بيانات الموظفين');
            if (!salariesResponse.ok) throw new Error(salariesData.message || 'فشل تحميل بيانات الرواتب');
            if (!attendanceResponse.ok) throw new Error(attendanceData.message || 'فشل تحميل بيانات الحضور');

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
            setMessage({ text: error.message || 'حدث خطأ أثناء تحميل بيانات لوحة التحكم', type: 'error' });
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
                employee.net_salary ?? employee.netSalary ?? employee.salary ?? employee.base_salary ?? 0
            );
            return total + netSalary;
        }, 0);
    }, [salaries]);

    const totalDeductions = useMemo(() => {
        return salaries.reduce((total, employee) => {
            return total + Number(employee.deduction_amount ?? employee.deductionAmount ?? 0);
        }, 0);
    }, [salaries]);

    const attendanceRate = useMemo(() => {
        if (employees.length === 0) return 0;
        const presentStatuses = ['حاضر', 'حاضر (في الموعد)', 'متأخر'];
        const presentEmployees = attendance.filter((item) =>
            presentStatuses.includes(String(item.status || '').trim())
        ).length;
        return Math.round((presentEmployees / employees.length) * 100);
    }, [employees, attendance]);

    const departmentDistribution = useMemo(() => {
        const departmentMap = {};
        employees.forEach((employee) => {
            const department = employee.department_name || employee.department || 'غير محدد';
            departmentMap[department] = (departmentMap[department] || 0) + 1;
        });

        const total = employees.length;
        return Object.entries(departmentMap)
            .map(([name, count], index) => ({
                name,
                count,
                percentage: total > 0 ? Math.round((count / total) * 100) : 0,
                color: BAR_COLORS[index % BAR_COLORS.length],
            }))
            .sort((a, b) => b.count - a.count);
    }, [employees]);

    const formatMoney = (value) =>
        new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(Number(value) || 0);

    return (
        <div>
            <PageHeader
                icon={BarChart3}
                title="التقارير والمؤشرات"
                desc="مؤشرات رئيسية محسوبة مباشرة من بيانات الموظفين والحضور والرواتب"
            >
                <button type="button" className="btn btn-ghost" onClick={fetchDashboardData}>
                    <RefreshCw size={15} />
                    تحديث
                </button>
            </PageHeader>

            {message.text && <Alert type={message.type}>{message.text}</Alert>}

            {loading ? (
                <Card flush>
                    <Loading text="جاري تحميل لوحة المؤشرات والتحليلات..." />
                </Card>
            ) : (
                <>
                    <div className="stats">
                        <Stat icon={Users} color="blue" label="إجمالي الموظفين" value={totalEmployees} sub="Total employees" />
                        <Stat icon={Wallet} color="green" label="إجمالي الرواتب" value={formatMoney(totalPayroll)} sub="Total payroll (net)" />
                        <Stat icon={CircleDollarSign} color="amber" label="إجمالي الخصومات" value={formatMoney(totalDeductions)} sub="Total deductions" />
                        <Stat icon={UserCheck} color="purple" label="نسبة الحضور اليوم" value={`${attendanceRate}%`} sub="Attendance rate" />
                    </div>

                    <Card
                        icon={BarChart3}
                        title="توزيع الموظفين حسب الأقسام"
                        desc="عدد الموظفين ونسبتهم في كل قسم"
                        actions={<span className="pill-count">القوة العاملة: {totalEmployees}</span>}
                    >
                        {departmentDistribution.length === 0 ? (
                            <Empty
                                icon={BarChart3}
                                title="لا توجد بيانات بعد"
                                text="أضف موظفين وحدد أقسامهم ليظهر التوزيع هنا."
                            />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {departmentDistribution.map((dept) => (
                                    <div key={dept.name}>
                                        <div className="flex between" style={{ marginBottom: 6, fontSize: 13 }}>
                                            <span className="strong">{dept.name}</span>
                                            <span className="muted small">
                                                {dept.count} موظف · {dept.percentage}%
                                            </span>
                                        </div>
                                        <div style={{ background: 'var(--bg)', borderRadius: 999, height: 10, overflow: 'hidden' }}>
                                            <div
                                                style={{
                                                    width: `${dept.percentage}%`,
                                                    height: '100%',
                                                    background: dept.color,
                                                    borderRadius: 999,
                                                    transition: 'width 0.5s ease',
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </>
            )}
        </div>
    );
}
