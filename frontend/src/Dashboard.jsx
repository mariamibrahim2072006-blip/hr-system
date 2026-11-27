import React, { useEffect, useState } from 'react';
import {
    LayoutDashboard,
    Users,
    UserPlus,
    CalendarCheck,
    Wallet,
    Settings,
    ShieldCheck,
    Building2,
    Layers3,
    CalendarDays,
    BarChart3,
    LogOut,
    Menu,
    X,
    Clock3,
    UserCheck,
    CircleDollarSign,
    Database,
    LockKeyhole,
    CheckCircle2,
    Activity,
    ChevronLeft,
} from 'lucide-react';

import AddEmployee from './AddEmployee';
import AdvancedAttendance from './AdvancedAttendance';
import AnalyticsDashboard from './AnalyticsDashboard';
import Attendance from './Attendance';
import Departments from './Departments';
import EmployeeProfile from './EmployeeProfile';
import Groups from './Groups';
import Holidays from './Holidays';
import LoansAndDeductions from './LoansAndDeductions';
import Salaries from './Salaries';
import SettingsPage from './Settings';
import UsersPage from './Users';
import { API_URL, authHeaders, extractArray, getToday, Stat, Card, Badge } from './ui';

/* Every section of the system: id, labels, description, allowed roles. */
const SECTIONS = [
    {
        group: 'الرئيسية',
        items: [
            { id: 'dashboard', label: 'لوحة التحكم', en: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'hr', 'manager', 'employee'] },
        ],
    },
    {
        group: 'شؤون الموظفين',
        items: [
            { id: 'employees', label: 'سجل الموظفين', en: 'Employees', icon: Users, roles: ['admin', 'hr', 'manager'] },
            { id: 'addEmployee', label: 'إضافة موظف', en: 'Add employee', icon: UserPlus, roles: ['admin', 'hr'] },
        ],
    },
    {
        group: 'الوقت والحضور',
        items: [
            { id: 'attendance', label: 'الحضور اليومي', en: 'Daily attendance', icon: CalendarCheck, roles: ['admin', 'hr', 'manager', 'employee'] },
            { id: 'advancedAttendance', label: 'الورديات والإضافي', en: 'Shifts & overtime', icon: Clock3, roles: ['admin', 'hr', 'manager'] },
            { id: 'holidays', label: 'الإجازات والعطلات', en: 'Leaves & holidays', icon: CalendarDays, roles: ['admin', 'hr', 'manager', 'employee'] },
        ],
    },
    {
        group: 'الشؤون المالية',
        items: [
            { id: 'salaries', label: 'المرتبات', en: 'Payroll', icon: Wallet, roles: ['admin', 'hr', 'manager', 'employee'] },
            { id: 'loans', label: 'السلف والخصومات', en: 'Loans & deductions', icon: CircleDollarSign, roles: ['admin', 'hr', 'manager'] },
        ],
    },
    {
        group: 'الهيكل التنظيمي',
        items: [
            { id: 'departments', label: 'الأقسام', en: 'Departments', icon: Building2, roles: ['admin', 'hr', 'manager'] },
            { id: 'groups', label: 'مجموعات الصلاحيات', en: 'Permission groups', icon: Layers3, roles: ['admin', 'hr', 'manager'] },
        ],
    },
    {
        group: 'النظام',
        items: [
            { id: 'analytics', label: 'التقارير والمؤشرات', en: 'Reports & analytics', icon: BarChart3, roles: ['admin', 'hr', 'manager'] },
            { id: 'users', label: 'المستخدمون', en: 'System users', icon: ShieldCheck, roles: ['admin'] },
            { id: 'settings', label: 'الإعدادات', en: 'Settings', icon: Settings, roles: ['admin'] },
        ],
    },
];

const ALL_TABS = SECTIONS.flatMap((s) => s.items.map((i) => i.id));

const PAGE_META = {
    dashboard: { title: 'لوحة التحكم الرئيسية', desc: 'نظرة عامة على حالة النظام وأهم المؤشرات اليومية' },
    employees: { title: 'سجل الموظفين', desc: 'بحث وعرض ومتابعة بيانات جميع الموظفين المسجلين' },
    addEmployee: { title: 'إضافة موظف جديد', desc: 'تسجيل بيانات موظف وربطه بقسم ومواعيد عمل وراتب' },
    attendance: { title: 'سجل الحضور اليومي', desc: 'متابعة حضور وانصراف الموظفين في يوم محدد وتعديل الحالات' },
    advancedAttendance: { title: 'الورديات والساعات الإضافية', desc: 'توزيع الورديات الصباحية والمسائية وتسجيل الساعات الإضافية' },
    salaries: { title: 'المرتبات', desc: 'كشوف الرواتب المحسوبة تلقائيًا مع طباعة قسيمة الراتب' },
    loans: { title: 'السلف والخصومات', desc: 'تسجيل السلف المالية والجزاءات والمكافآت وساعات الإضافي' },
    departments: { title: 'الأقسام', desc: 'إدارة أقسام الشركة وتحديد مسؤول كل قسم' },
    groups: { title: 'مجموعات الصلاحيات', desc: 'إنشاء مجموعات وتحديد صلاحيات الوصول لكل قسم في النظام' },
    holidays: { title: 'الإجازات والعطلات', desc: 'طلبات الإجازات والموافقة عليها أو رفضها' },
    analytics: { title: 'التقارير والمؤشرات', desc: 'مؤشرات الأداء الرئيسية وتوزيع الموظفين على الأقسام' },
    users: { title: 'المستخدمون والصلاحيات', desc: 'حسابات الدخول إلى النظام وأدوار كل مستخدم' },
    settings: { title: 'إعدادات الشركة', desc: 'بيانات المؤسسة وسياسات العمل والإجازات الأسبوعية' },
};

const ROLE_NAMES = {
    admin: 'مدير النظام',
    hr: 'الموارد البشرية',
    manager: 'مدير',
    employee: 'موظف',
};

export default function Dashboard({ user, onLogout }) {
    const userRole = user?.role ? user.role.toLowerCase().trim() : 'employee';

    const getAllowedTabs = () =>
        SECTIONS.flatMap((s) => s.items)
            .filter((item) => item.roles.includes(userRole))
            .map((item) => item.id);

    const getInitialTab = () => {
        const hash = window.location.hash.replace('#', '').trim();
        const allowed = getAllowedTabs();
        if (hash && ALL_TABS.includes(hash) && allowed.includes(hash)) return hash;
        return 'dashboard';
    };

    const [activeTab, setActiveTab] = useState(getInitialTab);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const handleLocationChange = () => {
            const hash = window.location.hash.replace('#', '').trim();
            const allowed = getAllowedTabs();
            if (hash && ALL_TABS.includes(hash) && allowed.includes(hash)) {
                setActiveTab(hash);
            } else {
                setActiveTab('dashboard');
                if (window.location.hash !== '#dashboard') {
                    window.history.replaceState(null, '', '#dashboard');
                }
            }
            setSidebarOpen(false);
        };

        window.addEventListener('hashchange', handleLocationChange);
        window.addEventListener('popstate', handleLocationChange);
        return () => {
            window.removeEventListener('hashchange', handleLocationChange);
            window.removeEventListener('popstate', handleLocationChange);
        };
    }, [user]);

    const handleNavigate = (tab) => {
        if (!getAllowedTabs().includes(tab)) return;
        setActiveTab(tab);
        setSidebarOpen(false);
        const newHash = `#${tab}`;
        if (window.location.hash !== newHash) {
            window.history.pushState(null, '', newHash);
            window.dispatchEvent(new HashChangeEvent('hashchange'));
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('hr_token');
        localStorage.removeItem('hr_user');
        if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        onLogout();
    };

    const getRoleName = () => ROLE_NAMES[userRole] || 'مستخدم';

    const meta = PAGE_META[activeTab] || PAGE_META.dashboard;

    const renderContent = () => {
        switch (activeTab) {
            case 'employees':
                return <EmployeeProfile user={user} onNavigate={handleNavigate} />;
            case 'addEmployee':
                return <AddEmployee user={user} />;
            case 'attendance':
                return <Attendance user={user} />;
            case 'advancedAttendance':
                return <AdvancedAttendance user={user} />;
            case 'salaries':
                return <Salaries user={user} />;
            case 'loans':
                return <LoansAndDeductions user={user} />;
            case 'departments':
                return <Departments user={user} />;
            case 'groups':
                return <Groups user={user} />;
            case 'holidays':
                return <Holidays user={user} />;
            case 'analytics':
                return <AnalyticsDashboard user={user} />;
            case 'users':
                return <UsersPage user={user} />;
            case 'settings':
                return <SettingsPage user={user} />;
            case 'dashboard':
            default:
                return (
                    <DashboardHome
                        user={user}
                        userRole={userRole}
                        getRoleName={getRoleName}
                        onNavigate={handleNavigate}
                    />
                );
        }
    };

    return (
        <div className="shell">
            <button
                type="button"
                aria-label="إغلاق القائمة"
                className={`veil ${sidebarOpen ? 'show' : ''}`}
                onClick={() => setSidebarOpen(false)}
            />

            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="side-brand">
                    <div className="side-brand-mark">
                        <Building2 size={21} strokeWidth={2.3} />
                    </div>
                    <div>
                        <div className="side-brand-name">PIONEERS HRMS</div>
                        <div className="side-brand-sub">نظام إدارة الموارد البشرية</div>
                    </div>
                    <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setSidebarOpen(false)}
                        style={{ marginInlineStart: 'auto', display: sidebarOpen ? 'inline-flex' : 'none', background: 'transparent', border: 'none', color: '#fff' }}
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                </div>

                <nav className="side-nav">
                    {SECTIONS.map((section) => {
                        const items = section.items.filter((item) => item.roles.includes(userRole));
                        if (items.length === 0) return null;
                        return (
                            <div className="side-group" key={section.group}>
                                <div className="side-group-label">{section.group}</div>
                                {items.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className={`side-link ${activeTab === item.id ? 'active' : ''}`}
                                            onClick={() => handleNavigate(item.id)}
                                        >
                                            <span className="side-link-icon">
                                                <Icon size={17} strokeWidth={2.2} />
                                            </span>
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </nav>

                <div className="side-foot">
                    <div className="side-user">
                        <div className="avatar">{(user?.name || user?.username || 'U').trim().charAt(0)}</div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="side-user-name">{user?.name || user?.username || 'مستخدم'}</div>
                            <div className="side-user-role">{getRoleName()}</div>
                        </div>
                    </div>
                    <button type="button" className="btn btn-danger btn-block btn-sm" onClick={handleLogout}>
                        <LogOut size={14} />
                        تسجيل الخروج
                    </button>
                </div>
            </aside>

            <main className="main">
                <header className="topbar">
                    <div className="topbar-title">
                        <button type="button" className="icon-btn burger" onClick={() => setSidebarOpen(true)} aria-label="فتح القائمة">
                            <Menu size={18} />
                        </button>
                        <div>
                            <h1>{meta.title}</h1>
                            <p>{meta.desc}</p>
                        </div>
                    </div>

                    <div className="topbar-user">
                        <div className="topbar-user-text">
                            <div className="topbar-user-name">{user?.name || user?.username || 'مستخدم'}</div>
                            <div className="topbar-user-role">{getRoleName()}</div>
                        </div>
                        <div className="avatar" style={{ width: 34, height: 34, fontSize: 14 }}>
                            {(user?.name || user?.username || 'U').trim().charAt(0)}
                        </div>
                    </div>
                </header>

                <section className="content">{renderContent()}</section>
            </main>
        </div>
    );
}

function DashboardHome({ user, userRole, getRoleName, onNavigate }) {
    const [dashboardStats, setDashboardStats] = useState({
        employees: 0,
        presentToday: 0,
        pendingLeaves: 0,
        payrollRecords: 0,
    });
    const [systemStatus, setSystemStatus] = useState({ loading: true, online: false });
    const [dataLoading, setDataLoading] = useState(true);

    const normalizeDate = (value) => {
        if (!value) return '';
        const stringValue = String(value);
        return stringValue.length >= 10 ? stringValue.substring(0, 10) : stringValue;
    };

    useEffect(() => {
        let cancelled = false;
        const checkSystemHealth = async () => {
            try {
                const response = await fetch(`${API_URL}/api/health`, { headers: authHeaders() });
                if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
                if (!cancelled) setSystemStatus({ loading: false, online: true });
            } catch (error) {
                if (!cancelled) setSystemStatus({ loading: false, online: false });
            }
        };
        checkSystemHealth();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const loadDashboardStats = async () => {
            try {
                setDataLoading(true);
                if (!localStorage.getItem('hr_token')) return;

                const [empRes, attRes, leaveRes, salRes] = await Promise.allSettled([
                    fetch(`${API_URL}/api/employees`, { headers: authHeaders() }),
                    fetch(`${API_URL}/api/attendance`, { headers: authHeaders() }),
                    fetch(`${API_URL}/api/leaves`, { headers: authHeaders() }),
                    fetch(`${API_URL}/api/salaries`, { headers: authHeaders() }),
                ]);

                if (cancelled) return;

                const employees = empRes.status === 'fulfilled' && empRes.value.ok ? extractArray(await empRes.value.json(), ['employees']) : [];
                const attendance = attRes.status === 'fulfilled' && attRes.value.ok ? extractArray(await attRes.value.json(), ['attendance', 'records']) : [];
                const leaves = leaveRes.status === 'fulfilled' && leaveRes.value.ok ? extractArray(await leaveRes.value.json(), ['leaves', 'records']) : [];
                const salaries = salRes.status === 'fulfilled' && salRes.value.ok ? extractArray(await salRes.value.json(), ['salaries', 'payroll', 'records']) : [];

                const today = getToday();
                const presentToday = attendance.filter((record) => {
                    const recordDate = normalizeDate(record?.date || record?.attendance_date || record?.work_date);
                    const status = String(record?.status || '').toLowerCase().trim();
                    const isPresent = status === 'present' || status === 'حاضر' || status === 'موجود';
                    return recordDate === today && isPresent;
                }).length;

                const pendingLeaves = leaves.filter((leave) => {
                    const status = String(leave?.status || '').toLowerCase().trim();
                    return status === 'pending' || status === 'معلق' || status === 'قيد الانتظار';
                }).length;

                setDashboardStats({
                    employees: employees.length,
                    presentToday,
                    pendingLeaves,
                    payrollRecords: salaries.length,
                });
            } catch (error) {
                if (!cancelled) {
                    setDashboardStats({ employees: 0, presentToday: 0, pendingLeaves: 0, payrollRecords: 0 });
                }
            } finally {
                if (!cancelled) setDataLoading(false);
            }
        };

        loadDashboardStats();
        return () => { cancelled = true; };
    }, []);

    const modules = [
        { id: 'employees', title: 'سجل الموظفين', description: 'بيانات الموظفين وملفاتهم الوظيفية', icon: Users, roles: ['admin', 'hr', 'manager'] },
        { id: 'addEmployee', title: 'إضافة موظف', description: 'تسجيل موظف جديد في النظام', icon: UserPlus, roles: ['admin', 'hr'] },
        { id: 'attendance', title: 'الحضور اليومي', description: 'تسجيل ومتابعة الحضور والانصراف', icon: CalendarCheck, roles: ['admin', 'hr', 'manager', 'employee'] },
        { id: 'advancedAttendance', title: 'الورديات والإضافي', description: 'إدارة الورديات والساعات الإضافية', icon: Clock3, roles: ['admin', 'hr', 'manager'] },
        { id: 'holidays', title: 'الإجازات والعطلات', description: 'طلبات الإجازات والموافقات', icon: CalendarDays, roles: ['admin', 'hr', 'manager', 'employee'] },
        { id: 'salaries', title: 'المرتبات', description: 'كشوف الرواتب والمستحقات', icon: Wallet, roles: ['admin', 'hr', 'manager', 'employee'] },
        { id: 'loans', title: 'السلف والخصومات', description: 'السلف والجزاءات والمكافآت', icon: CircleDollarSign, roles: ['admin', 'hr', 'manager'] },
        { id: 'departments', title: 'الأقسام', description: 'تنظيم أقسام المؤسسة', icon: Building2, roles: ['admin', 'hr', 'manager'] },
        { id: 'groups', title: 'مجموعات الصلاحيات', description: 'صلاحيات الوصول لكل مجموعة', icon: Layers3, roles: ['admin', 'hr', 'manager'] },
        { id: 'analytics', title: 'التقارير والمؤشرات', description: 'البيانات والمؤشرات الإدارية', icon: BarChart3, roles: ['admin', 'hr', 'manager'] },
        { id: 'users', title: 'المستخدمون', description: 'الحسابات وأدوار المستخدمين', icon: ShieldCheck, roles: ['admin'] },
        { id: 'settings', title: 'الإعدادات', description: 'إعدادات الشركة العامة', icon: Settings, roles: ['admin'] },
    ];

    const visibleModules = modules.filter((module) => module.roles.includes(userRole));

    return (
        <div>
            <div className="card" style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderInlineStart: '4px solid var(--primary)' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 19, fontWeight: 900, color: 'var(--ink)' }}>
                        مرحبًا، {user?.name || user?.username || 'مستخدم'}
                    </h2>
                    <p style={{ margin: '5px 0 0', color: 'var(--muted)', fontSize: 12, fontWeight: 600 }}>
                        أنت تستخدم نظام PIONEERS لإدارة الموارد البشرية بصلاحية {getRoleName()}. اختر قسمًا من القائمة الجانبية أو من الاختصارات بالأسفل.
                    </p>
                </div>
                {systemStatus.loading ? (
                    <Badge tone="gray">جاري التحقق من النظام...</Badge>
                ) : systemStatus.online ? (
                    <Badge tone="green"><span className="dot green" /> النظام يعمل بشكل طبيعي</Badge>
                ) : (
                    <Badge tone="red"><span className="dot red" /> الخادم غير متصل</Badge>
                )}
            </div>

            <div className="stats">
                <Stat icon={Users} color="blue" label="إجمالي الموظفين" value={dataLoading ? '...' : dashboardStats.employees} sub="Employees registered" />
                <Stat icon={UserCheck} color="green" label="الحاضرون اليوم" value={dataLoading ? '...' : dashboardStats.presentToday} sub="Present today" />
                <Stat icon={CalendarDays} color="amber" label="طلبات إجازات معلقة" value={dataLoading ? '...' : dashboardStats.pendingLeaves} sub="Pending requests" />
                <Stat icon={CircleDollarSign} color="purple" label="سجلات المرتبات" value={dataLoading ? '...' : dashboardStats.payrollRecords} sub="Payroll records" />
            </div>

            <Card icon={Layers3} title="أقسام النظام" desc="كل ما تحتاجه مقسم ومرتب - اضغط على أي قسم للانتقال إليه مباشرة">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
                    {visibleModules.map((module) => {
                        const Icon = module.icon;
                        return (
                            <button
                                type="button"
                                key={module.id}
                                onClick={() => onNavigate(module.id)}
                                style={{
                                    background: '#f8fafc',
                                    border: '1px solid var(--line-soft)',
                                    borderRadius: 12,
                                    padding: '13px 14px',
                                    cursor: 'pointer',
                                    textAlign: 'start',
                                    fontFamily: 'var(--font)',
                                    position: 'relative',
                                    transition: 'background 0.15s ease, transform 0.1s ease',
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                            >
                                <span className="card-icon" style={{ marginBottom: 9 }}>
                                    <Icon size={18} strokeWidth={2.3} />
                                </span>
                                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginTop: 8 }}>{module.title}</div>
                                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginTop: 3, lineHeight: 1.6 }}>{module.description}</div>
                                <span style={{ position: 'absolute', top: 12, insetInlineEnd: 12, color: '#9ba7b7' }}>
                                    <ChevronLeft size={15} />
                                </span>
                            </button>
                        );
                    })}
                </div>
            </Card>

            <Card icon={Activity} title="حالة النظام" desc="System status">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
                    {[
                        { icon: Database, title: 'قاعدة البيانات', sub: 'MySQL Database', ok: systemStatus.online, loading: systemStatus.loading },
                        { icon: LockKeyhole, title: 'المصادقة', sub: 'JWT Authentication', ok: !!localStorage.getItem('hr_token'), loading: false },
                        { icon: ShieldCheck, title: 'الصلاحيات', sub: 'Role Based Access', ok: true, loading: false },
                        { icon: CheckCircle2, title: 'خادم الواجهات', sub: 'API Server', ok: systemStatus.online, loading: systemStatus.loading },
                    ].map((row) => {
                        const Icon = row.icon;
                        return (
                            <div key={row.title} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#f8fafc', border: '1px solid var(--line-soft)', borderRadius: 10, padding: '10px 12px' }}>
                                <span className="flex" style={{ gap: 9 }}>
                                    <span className="card-icon" style={{ width: 30, height: 30 }}>
                                        <Icon size={15} />
                                    </span>
                                    <span>
                                        <span style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--ink-2)' }}>{row.title}</span>
                                        <span style={{ display: 'block', fontSize: 10, color: 'var(--faint)', fontWeight: 600 }}>{row.sub}</span>
                                    </span>
                                </span>
                                {row.loading ? (
                                    <Badge tone="gray">جاري التحقق</Badge>
                                ) : row.ok ? (
                                    <Badge tone="green">يعمل</Badge>
                                ) : (
                                    <Badge tone="red">متوقف</Badge>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}
