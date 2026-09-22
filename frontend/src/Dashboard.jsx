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
    UserRound,
    ChevronLeft,
    Activity,
    Clock3,
    UserCheck,
    CircleDollarSign,
    Database,
    LockKeyhole,
    CheckCircle2,
    Menu,
    X,
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

const API_URL = 'http://localhost:5000';

const ALL_TABS = [
    'dashboard',
    'employees',
    'addEmployee',
    'attendance',
    'advancedAttendance',
    'salaries',
    'loans',
    'departments',
    'groups',
    'holidays',
    'analytics',
    'users',
    'settings',
];

export default function Dashboard({ user, onLogout }) {
    const getAllowedTabs = () => {
        const role = user?.role
            ? user.role.toLowerCase().trim()
            : 'employee';

        const allMenuItems = [
            { id: 'dashboard', roles: ['admin', 'hr', 'manager', 'employee'] },
            { id: 'employees', roles: ['admin', 'hr', 'manager'] },
            { id: 'addEmployee', roles: ['admin', 'hr'] },
            { id: 'attendance', roles: ['admin', 'hr', 'manager', 'employee'] },
            { id: 'advancedAttendance', roles: ['admin', 'hr', 'manager'] },
            { id: 'salaries', roles: ['admin', 'hr', 'manager', 'employee'] },
            { id: 'loans', roles: ['admin', 'hr', 'manager'] },
            { id: 'departments', roles: ['admin', 'hr', 'manager'] },
            { id: 'groups', roles: ['admin', 'hr', 'manager'] },
            { id: 'holidays', roles: ['admin', 'hr', 'manager', 'employee'] },
            { id: 'analytics', roles: ['admin', 'hr', 'manager'] },
            { id: 'users', roles: ['admin'] },
            { id: 'settings', roles: ['admin'] },
        ];

        return allMenuItems
            .filter((item) => item.roles.includes(role))
            .map((item) => item.id);
    };

    const getInitialTab = () => {
        const hash = window.location.hash.replace('#', '').trim();
        const allowedTabs = getAllowedTabs();

        if (
            hash &&
            ALL_TABS.includes(hash) &&
            allowedTabs.includes(hash)
        ) {
            return hash;
        }

        return 'dashboard';
    };

    const [activeTab, setActiveTab] = useState(getInitialTab);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const userRole = user?.role
        ? user.role.toLowerCase().trim()
        : 'employee';

    const allMenuItems = [
        {
            id: 'dashboard',
            label: 'لوحة التحكم الرئيسية',
            icon: LayoutDashboard,
            roles: ['admin', 'hr', 'manager', 'employee'],
        },
        {
            id: 'employees',
            label: 'الموظفين',
            icon: Users,
            roles: ['admin', 'hr', 'manager'],
        },
        {
            id: 'addEmployee',
            label: 'إضافة موظف',
            icon: UserPlus,
            roles: ['admin', 'hr'],
        },
        {
            id: 'attendance',
            label: 'الحضور والانصراف',
            icon: CalendarCheck,
            roles: ['admin', 'hr', 'manager', 'employee'],
        },
        {
            id: 'advancedAttendance',
            label: 'إدارة الحضور',
            icon: Clock3,
            roles: ['admin', 'hr', 'manager'],
        },
        {
            id: 'salaries',
            label: 'المرتبات',
            icon: Wallet,
            roles: ['admin', 'hr', 'manager', 'employee'],
        },
        {
            id: 'loans',
            label: 'السلف والخصومات',
            icon: CircleDollarSign,
            roles: ['admin', 'hr', 'manager'],
        },
        {
            id: 'departments',
            label: 'الأقسام',
            icon: Building2,
            roles: ['admin', 'hr', 'manager'],
        },
        {
            id: 'groups',
            label: 'المجموعات',
            icon: Layers3,
            roles: ['admin', 'hr', 'manager'],
        },
        {
            id: 'holidays',
            label: 'الإجازات والعطلات',
            icon: CalendarDays,
            roles: ['admin', 'hr', 'manager', 'employee'],
        },
        {
            id: 'analytics',
            label: 'التقارير والتحليلات',
            icon: BarChart3,
            roles: ['admin', 'hr', 'manager'],
        },
        {
            id: 'users',
            label: 'المستخدمين',
            icon: ShieldCheck,
            roles: ['admin'],
        },
        {
            id: 'settings',
            label: 'الإعدادات',
            icon: Settings,
            roles: ['admin'],
        },
    ];

    const menuItems = allMenuItems.filter((item) =>
        item.roles.includes(userRole)
    );

    useEffect(() => {
        const handleLocationChange = () => {
            const hash = window.location.hash.replace('#', '').trim();
            const allowedTabs = getAllowedTabs();

            if (
                hash &&
                ALL_TABS.includes(hash) &&
                allowedTabs.includes(hash)
            ) {
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
        const allowedTabs = getAllowedTabs();
        if (!allowedTabs.includes(tab)) return;

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
            window.history.replaceState(
                null,
                '',
                window.location.pathname + window.location.search
            );
        }
        onLogout();
    };

    const getRoleName = () => {
        const roles = {
            admin: 'مدير النظام',
            hr: 'الموارد البشرية',
            manager: 'مدير',
            employee: 'موظف',
        };
        return roles[userRole] || 'مستخدم';
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'employees':
                return <EmployeeProfile user={user} />;
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
        <div className="hrms-app">
            <style>{`
                * { box-sizing: border-box; }
                .hrms-app { min-height: 100vh; background: #eef2f7; color: #172033; font-family: Arial, "Segoe UI", Tahoma, sans-serif; direction: rtl; }
                .hrms-layout { min-height: 100vh; display: flex; }
                .hrms-sidebar { width: 255px; min-width: 255px; background: #17263d; color: #fff; display: flex; flex-direction: column; position: fixed; right: 0; top: 0; bottom: 0; z-index: 1000; box-shadow: -4px 0 20px rgba(15, 23, 42, 0.14); transition: transform 0.25s ease; }
                .sidebar-brand { height: 68px; padding: 0 18px; display: flex; align-items: center; gap: 11px; border-bottom: 1px solid rgba(255,255,255,0.08); }
                .brand-icon { width: 38px; height: 38px; border-radius: 9px; background: #1677d2; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(22,119,210,0.3); }
                .brand-text { display: flex; flex-direction: column; gap: 2px; }
                .brand-title { font-size: 15px; font-weight: 800; letter-spacing: 0.2px; }
                .brand-subtitle { font-size: 9px; color: #aebed3; font-weight: 600; }
                .sidebar-menu { padding: 15px 10px; overflow-y: auto; flex: 1; }
                .sidebar-section-title { color: #71839b; font-size: 10px; font-weight: 800; margin: 3px 11px 8px; letter-spacing: 0.3px; }
                .sidebar-item { width: 100%; border: none; background: transparent; color: #c6d2e1; min-height: 42px; padding: 0 12px; border-radius: 8px; display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 12px; font-weight: 700; text-align: right; margin-bottom: 3px; transition: all 0.18s ease; }
                .sidebar-item:hover { background: #223653; color: #fff; }
                .sidebar-item.active { background: #1677d2; color: #fff; box-shadow: 0 4px 12px rgba(22,119,210,0.23); }
                .sidebar-footer { padding: 11px; border-top: 1px solid rgba(255,255,255,0.08); }
                .sidebar-user { background: #1e304b; border-radius: 9px; padding: 10px; margin-bottom: 7px; display: flex; align-items: center; gap: 9px; }
                .sidebar-user-avatar { width: 33px; height: 33px; border-radius: 8px; background: #1677d2; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .sidebar-user-info { min-width: 0; flex: 1; }
                .sidebar-user-name { font-size: 11px; font-weight: 800; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .sidebar-user-role { font-size: 9px; color: #9eb0c6; margin-top: 2px; font-weight: 600; }
                .logout-button { width: 100%; height: 38px; border: none; border-radius: 7px; background: #b42318; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; font-size: 11px; font-weight: 800; transition: background 0.18s ease; }
                .logout-button:hover { background: #991b1b; }
                .hrms-main { margin-right: 255px; width: calc(100% - 255px); min-height: 100vh; }
                .hrms-header { height: 60px; background: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; box-shadow: 0 2px 10px rgba(15,23,42,0.06); position: sticky; top: 0; z-index: 900; }
                .header-title { display: flex; align-items: center; gap: 9px; }
                .header-title-icon { width: 32px; height: 32px; border-radius: 8px; background: #e7f1fb; color: #1267b1; display: flex; align-items: center; justify-content: center; }
                .header-title h2 { margin: 0; font-size: 15px; font-weight: 800; color: #18253a; }
                .header-title span { display: block; margin-top: 2px; color: #475569; font-size: 9px; font-weight: 600; }
                .header-user { display: flex; align-items: center; gap: 8px; }
                .header-user-text { text-align: right; }
                .header-user-name { font-size: 11px; font-weight: 800; color: #172033; }
                .header-user-role { font-size: 9px; color: #475569; margin-top: 1px; font-weight: 600; }
                .header-avatar { width: 34px; height: 34px; border-radius: 8px; background: #1677d2; color: #fff; display: flex; align-items: center; justify-content: center; }
                .mobile-menu-button { display: none; width: 36px; height: 36px; border: none; background: #edf3f9; color: #172033; border-radius: 7px; cursor: pointer; }
                .hrms-content { padding: 21px 24px 30px; max-width: 1650px; margin: 0 auto; }
                .dashboard-welcome { background: #fff; border-radius: 11px; padding: 17px 20px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; gap: 15px; box-shadow: 0 4px 15px rgba(15,23,42,0.055); border-right: 4px solid #1677d2; }
                .welcome-text h1 { margin: 0; font-size: 20px; color: #142238; font-weight: 900; }
                .welcome-text p { margin: 5px 0 0; color: #475569; font-size: 11px; font-weight: 600; }
                .system-status { display: flex; align-items: center; gap: 7px; background: #eaf8f0; color: #087443; padding: 8px 11px; border-radius: 7px; font-size: 10px; font-weight: 800; white-space: nowrap; }
                .system-status.offline { background: #fceaea; color: #b42318; }
                .status-dot { width: 7px; height: 7px; background: #12a150; border-radius: 50%; }
                .system-status.offline .status-dot { background: #b42318; }
                .stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 13px; margin-bottom: 16px; }
                .stat-card { background: #fff; border-radius: 10px; padding: 15px 16px; box-shadow: 0 4px 15px rgba(15,23,42,0.055); display: flex; align-items: center; justify-content: space-between; min-height: 100px; position: relative; overflow: hidden; }
                .stat-card::after { content: ""; position: absolute; left: 0; bottom: 0; width: 45px; height: 3px; border-radius: 0 4px 0 0; }
                .stat-card.blue::after { background: #1677d2; }
                .stat-card.green::after { background: #0b9b59; }
                .stat-card.orange::after { background: #e88a00; }
                .stat-card.purple::after { background: #7048c8; }
                .stat-info { min-width: 0; }
                .stat-label { font-size: 10px; color: #475569; font-weight: 800; margin-bottom: 7px; }
                .stat-value { font-size: 25px; line-height: 1; font-weight: 900; color: #162337; }
                .stat-description { margin-top: 6px; font-size: 8px; color: #64748b; font-weight: 600; }
                .stat-icon { width: 43px; height: 43px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .stat-icon.blue { background: #e5f1fc; color: #1269b6; }
                .stat-icon.green { background: #e3f7ed; color: #087d47; }
                .stat-icon.orange { background: #fff1dc; color: #c66b00; }
                .stat-icon.purple { background: #eee8fb; color: #6941bd; }
                .dashboard-grid { display: grid; grid-template-columns: 1fr; gap: 15px; margin-bottom: 16px; }
                .dashboard-card { background: #fff; border-radius: 11px; padding: 17px; box-shadow: 0 4px 15px rgba(15,23,42,0.055); margin-bottom: 16px; }
                .card-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 13px; }
                .card-heading-main { display: flex; align-items: center; gap: 8px; }
                .card-heading-icon { width: 31px; height: 31px; border-radius: 7px; background: #e7f1fb; color: #1269b6; display: flex; align-items: center; justify-content: center; }
                .card-heading h3 { margin: 0; font-size: 13px; font-weight: 900; color: #172238; }
                .card-heading p { margin: 2px 0 0; color: #475569; font-size: 8px; font-weight: 600; }
                .system-list { display: flex; flex-direction: column; gap: 8px; }
                .system-row { display: flex; align-items: center; justify-content: space-between; padding: 9px 10px; background: #f6f8fb; border-radius: 7px; }
                .system-row-left { display: flex; align-items: center; gap: 8px; }
                .system-row-icon { width: 29px; height: 29px; border-radius: 7px; background: #e8f1f9; color: #24699f; display: flex; align-items: center; justify-content: center; }
                .system-row-title { font-size: 9px; font-weight: 900; color: #27364a; }
                .system-row-subtitle { margin-top: 2px; font-size: 7px; color: #64748b; font-weight: 600; }
                .status-badge { font-size: 8px; font-weight: 900; padding: 4px 7px; border-radius: 5px; background: #dff6e9; color: #087443; }
                .status-badge.offline { background: #fce1df; color: #b42318; }
                .modules-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
                .module-card { background: #f7f9fc; border-radius: 9px; padding: 12px; cursor: pointer; transition: all 0.18s ease; position: relative; }
                .module-card:hover { background: #edf4fb; transform: translateY(-1px); }
                .module-icon { width: 36px; height: 36px; background: #fff; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #1677d2; box-shadow: 0 2px 7px rgba(15,23,42,0.06); margin-bottom: 9px; }
                .module-card h4 { margin: 0; font-size: 10px; font-weight: 900; color: #172238; }
                .module-card p { margin: 4px 0 0; font-size: 8px; line-height: 1.45; color: #475569; font-weight: 600; padding-left: 8px; }
                .module-arrow { position: absolute; top: 12px; left: 12px; color: #9ba7b7; }
                @media (max-width: 1200px) {
                    .stats-grid { grid-template-columns: repeat(2, 1fr); }
                    .modules-grid { grid-template-columns: repeat(2, 1fr); }
                }
                @media (max-width: 900px) {
                    .hrms-sidebar { transform: translateX(100%); }
                    .hrms-sidebar.mobile-open { transform: translateX(0); }
                    .hrms-main { margin-right: 0; width: 100%; }
                    .mobile-menu-button { display: flex; align-items: center; justify-content: center; }
                    .hrms-header { padding: 0 15px; }
                    .hrms-content { padding: 17px 15px 25px; }
                }
            `}</style>

            <div className="hrms-layout">
                <aside className={`hrms-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
                    <div className="sidebar-brand">
                        <div className="brand-icon">
                            <ShieldCheck size={21} strokeWidth={2.5} />
                        </div>
                        <div className="brand-text">
                            <div className="brand-title">PIONEERS HRMS</div>
                            <div className="brand-subtitle">Human Resources Management</div>
                        </div>
                        <button
                            className="mobile-menu-button"
                            onClick={() => setSidebarOpen(false)}
                            style={{ marginRight: 'auto', display: sidebarOpen ? 'flex' : 'none', background: 'transparent', color: '#fff' }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="sidebar-menu">
                        <div className="sidebar-section-title">MAIN MENU</div>
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                                    onClick={() => handleNavigate(item.id)}
                                >
                                    <Icon size={18} strokeWidth={2.2} />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="sidebar-footer">
                        <div className="sidebar-user">
                            <div className="sidebar-user-avatar">
                                <UserRound size={16} />
                            </div>
                            <div className="sidebar-user-info">
                                <div className="sidebar-user-name">
                                    {user?.name || user?.username || 'User'}
                                </div>
                                <div className="sidebar-user-role">{getRoleName()}</div>
                            </div>
                        </div>
                        <button className="logout-button" onClick={handleLogout}>
                            <LogOut size={15} />
                            تسجيل الخروج
                        </button>
                    </div>
                </aside>

                <main className="hrms-main">
                    <header className="hrms-header">
                        <div className="header-title">
                            <button className="mobile-menu-button" onClick={() => setSidebarOpen(true)}>
                                <Menu size={19} />
                            </button>
                            <div className="header-title-icon">
                                {activeTab === 'dashboard' ? <LayoutDashboard size={17} /> : <Activity size={17} />}
                            </div>
                            <div>
                                <h2>
                                    {menuItems.find((item) => item.id === activeTab)?.label || 'لوحة التحكم الرئيسية'}
                                </h2>
                                <span>PIONEERS Human Resources Management System</span>
                            </div>
                        </div>

                        <div className="header-user">
                            <div className="header-user-text">
                                <div className="header-user-name">
                                    {user?.name || user?.username || 'User'}
                                </div>
                                <div className="header-user-role">{getRoleName()}</div>
                            </div>
                            <div className="header-avatar">
                                <UserRound size={17} />
                            </div>
                        </div>
                    </header>

                    <section className="hrms-content">
                        {renderContent()}
                    </section>
                </main>
            </div>
        </div>
    );
}

function DashboardHome({ user, getRoleName, onNavigate }) {
    const [dashboardStats, setDashboardStats] = useState({
        employees: 0,
        presentToday: 0,
        pendingLeaves: 0,
        payrollRecords: 0,
    });

    const [systemStatus, setSystemStatus] = useState({
        loading: true,
        online: false,
    });

    const [dataLoading, setDataLoading] = useState(true);

    const extractArray = (data, possibleKeys = []) => {
        if (Array.isArray(data)) return data;
        for (const key of possibleKeys) {
            if (Array.isArray(data?.[key])) return data[key];
        }
        if (Array.isArray(data?.data)) return data.data;
        return [];
    };

    const getTodayDate = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const normalizeDate = (value) => {
        if (!value) return '';
        const stringValue = String(value);
        if (stringValue.length >= 10) return stringValue.substring(0, 10);
        return stringValue;
    };

    useEffect(() => {
        let cancelled = false;
        const checkSystemHealth = async () => {
            try {
                const token = localStorage.getItem('hr_token');
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                const response = await fetch(`${API_URL}/api/health`, { headers });
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
                const token = localStorage.getItem('hr_token');
                if (!token) return;
                const headers = { Authorization: `Bearer ${token}` };

                const [empRes, attRes, leaveRes, salRes] = await Promise.allSettled([
                    fetch(`${API_URL}/api/employees`, { headers }),
                    fetch(`${API_URL}/api/attendance`, { headers }),
                    fetch(`${API_URL}/api/leaves`, { headers }),
                    fetch(`${API_URL}/api/salaries`, { headers }),
                ]);

                if (cancelled) return;

                let employees = empRes.status === 'fulfilled' && empRes.value.ok ? extractArray(await empRes.value.json(), ['employees']) : [];
                let attendance = attRes.status === 'fulfilled' && attRes.value.ok ? extractArray(await attRes.value.json(), ['attendance', 'records']) : [];
                let leaves = leaveRes.status === 'fulfilled' && leaveRes.value.ok ? extractArray(await leaveRes.value.json(), ['leaves', 'records']) : [];
                let salaries = salRes.status === 'fulfilled' && salRes.value.ok ? extractArray(await salRes.value.json(), ['salaries', 'payroll', 'records']) : [];

                const today = getTodayDate();
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

    const currentRole = user?.role?.toLowerCase()?.trim() || 'employee';

    const modules = [
        { id: 'employees', title: 'إدارة الموظفين', description: 'بيانات الموظفين والملفات الوظيفية', icon: Users, roles: ['admin', 'hr', 'manager'] },
        { id: 'attendance', title: 'الحضور والانصراف', description: 'تسجيل ومتابعة أوقات الحضور والانصراف', icon: CalendarCheck, roles: ['admin', 'hr', 'manager', 'employee'] },
        { id: 'salaries', title: 'إدارة المرتبات', description: 'متابعة الرواتب والمستحقات', icon: Wallet, roles: ['admin', 'hr', 'manager', 'employee'] },
        { id: 'departments', title: 'الأقسام', description: 'تنظيم وإدارة أقسام المؤسسة', icon: Building2, roles: ['admin', 'hr', 'manager'] },
        { id: 'holidays', title: 'الإجازات والعطلات', description: 'إدارة الإجازات الرسمية والسنوية', icon: CalendarDays, roles: ['admin', 'hr', 'manager', 'employee'] },
        { id: 'analytics', title: 'التقارير والتحليلات', description: 'عرض البيانات والمؤشرات الإدارية', icon: BarChart3, roles: ['admin', 'hr', 'manager'] },
        { id: 'users', title: 'المستخدمين والصلاحيات', description: 'إدارة الحسابات وأدوار المستخدمين', icon: ShieldCheck, roles: ['admin'] },
        { id: 'settings', title: 'إعدادات النظام', description: 'التحكم في إعدادات النظام العامة', icon: Settings, roles: ['admin'] },
    ];

    const visibleModules = modules.filter((module) => module.roles.includes(currentRole));

    return (
        <div>
            <div className="dashboard-welcome">
                <div className="welcome-text">
                    <h1>مرحبًا، {user?.name || user?.username || 'مستخدم'}</h1>
                    <p>أنت الآن تستخدم نظام PIONEERS لإدارة الموارد البشرية بصلاحية {getRoleName()}.</p>
                </div>
                <div className={`system-status ${!systemStatus.loading && !systemStatus.online ? 'offline' : ''}`}>
                    <span className="status-dot"></span>
                    {systemStatus.loading ? 'جاري التحقق...' : systemStatus.online ? 'النظام يعمل بشكل طبيعي' : 'النظام غير متصل'}
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card blue">
                    <div className="stat-info">
                        <div className="stat-label">إجمالي الموظفين</div>
                        <div className="stat-value">{dataLoading ? '...' : dashboardStats.employees}</div>
                        <div className="stat-description">Employees registered</div>
                    </div>
                    <div className="stat-icon blue">
                        <Users size={22} strokeWidth={2.3} />
                    </div>
                </div>

                <div className="stat-card green">
                    <div className="stat-info">
                        <div className="stat-label">الحاضرون اليوم</div>
                        <div className="stat-value">{dataLoading ? '...' : dashboardStats.presentToday}</div>
                        <div className="stat-description">Present today</div>
                    </div>
                    <div className="stat-icon green">
                        <UserCheck size={22} strokeWidth={2.3} />
                    </div>
                </div>

                <div className="stat-card orange">
                    <div className="stat-info">
                        <div className="stat-label">طلبات الإجازات</div>
                        <div className="stat-value">{dataLoading ? '...' : dashboardStats.pendingLeaves}</div>
                        <div className="stat-description">Pending requests</div>
                    </div>
                    <div className="stat-icon orange">
                        <CalendarDays size={22} strokeWidth={2.3} />
                    </div>
                </div>

                <div className="stat-card purple">
                    <div className="stat-info">
                        <div className="stat-label">سجلات المرتبات</div>
                        <div className="stat-value">{dataLoading ? '...' : dashboardStats.payrollRecords}</div>
                        <div className="stat-description">Payroll records</div>
                    </div>
                    <div className="stat-icon purple">
                        <CircleDollarSign size={22} strokeWidth={2.3} />
                    </div>
                </div>
            </div>

            <div className="dashboard-card">
                <div className="card-heading">
                    <div className="card-heading-main">
                        <div className="card-heading-icon">
                            <Activity size={17} />
                        </div>
                        <div>
                            <h3>حالة النظام</h3>
                            <p>System status</p>
                        </div>
                    </div>
                </div>

                <div className="system-list">
                    <div className="system-row">
                        <div className="system-row-left">
                            <div className="system-row-icon"><Database size={15} /></div>
                            <div>
                                <div className="system-row-title">قاعدة البيانات</div>
                                <div className="system-row-subtitle">MySQL Database</div>
                            </div>
                        </div>
                        <span className={`status-badge ${!systemStatus.loading && !systemStatus.online ? 'offline' : ''}`}>
                            {systemStatus.loading ? 'جاري التحقق' : systemStatus.online ? 'متصل' : 'غير متصل'}
                        </span>
                    </div>

                    <div className="system-row">
                        <div className="system-row-left">
                            <div className="system-row-icon"><ShieldCheck size={15} /></div>
                            <div>
                                <div className="system-row-title">المصادقة</div>
                                <div className="system-row-subtitle">JWT Authentication</div>
                            </div>
                        </div>
                        <span className="status-badge">{localStorage.getItem('hr_token') ? 'آمن' : 'غير متاح'}</span>
                    </div>

                    <div className="system-row">
                        <div className="system-row-left">
                            <div className="system-row-icon"><LockKeyhole size={15} /></div>
                            <div>
                                <div className="system-row-title">الصلاحيات</div>
                                <div className="system-row-subtitle">Role Based Access</div>
                            </div>
                        </div>
                        <span className="status-badge">فعال</span>
                    </div>

                    <div className="system-row">
                        <div className="system-row-left">
                            <div className="system-row-icon"><CheckCircle2 size={15} /></div>
                            <div>
                                <div className="system-row-title">API Server</div>
                                <div className="system-row-subtitle">Backend Service</div>
                            </div>
                        </div>
                        <span className={`status-badge ${!systemStatus.loading && !systemStatus.online ? 'offline' : ''}`}>
                            {systemStatus.loading ? 'جاري التحقق' : systemStatus.online ? 'يعمل' : 'متوقف'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="dashboard-card">
                <div className="card-heading">
                    <div className="card-heading-main">
                        <div className="card-heading-icon">
                            <Layers3 size={17} />
                        </div>
                        <div>
                            <h3>وحدات النظام</h3>
                            <p>Modules available for your account</p>
                        </div>
                    </div>
                </div>

                <div className="modules-grid">
                    {visibleModules.map((module) => {
                        const Icon = module.icon;
                        return (
                            <div
                                key={module.id}
                                className="module-card"
                                onClick={() => onNavigate(module.id)}
                            >
                                <div className="module-icon">
                                    <Icon size={19} strokeWidth={2.3} />
                                </div>
                                <h4>{module.title}</h4>
                                <p>{module.description}</p>
                                <div className="module-arrow">
                                    <ChevronLeft size={14} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}