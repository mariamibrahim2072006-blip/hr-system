import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, UserRound, Clock3, Wallet, Palmtree, CalendarDays,
  LogOut, Menu, X, RefreshCw, Send, Trash2, CheckCircle2, Timer, XCircle,
  CalendarOff, Banknote, ReceiptText, Info
} from 'lucide-react';
import {
  PageHeader, Card, Stat, Empty, Loading, Alert, Badge, Field, Modal,
  getToken, API_URL, getToday
} from './ui.jsx';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatMoney = (value) => {
  const number = Number(value || 0);
  return number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const normalizeStatus = (status) => {
  if (!status) return 'غير محدد';
  const value = String(status).toLowerCase();
  if (value.includes('present') || value.includes('حاضر')) return 'حاضر';
  if (value.includes('late') || value.includes('متأخر')) return 'متأخر';
  if (value.includes('absent') || value.includes('غائب')) return 'غائب';
  if (value.includes('leave') || value.includes('إجاز')) return 'إجازة';
  if (value.includes('pending') || value.includes('معلق')) return 'قيد المراجعة';
  if (value.includes('approv') || value.includes('مقبول') || value.includes('معتمد')) return 'معتمد';
  if (value.includes('reject') || value.includes('مرفوض')) return 'مرفوض';
  return status;
};

const statusTone = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized === 'حاضر' || normalized === 'معتمد') return 'green';
  if (normalized === 'متأخر' || normalized === 'قيد المراجعة') return 'amber';
  if (normalized === 'غائب' || normalized === 'مرفوض') return 'red';
  if (normalized === 'إجازة') return 'blue';
  return 'gray';
};

const LEAVE_TYPES = ['إجازة سنوية', 'إجازة مرضية', 'إجازة طارئة', 'إجازة بدون راتب'];

const NAV_ITEMS = [
  { id: 'home', label: 'الرئيسية', icon: LayoutDashboard, desc: 'نظرة عامة على حسابك وحالتك اليوم' },
  { id: 'profile', label: 'الملف الشخصي', icon: UserRound, desc: 'بياناتك الوظيفية المسجلة في النظام' },
  { id: 'attendance', label: 'الحضور', icon: Clock3, desc: 'حالة حضورك اليوم وأوقات التسجيل' },
  { id: 'salary', label: 'المرتب', icon: Wallet, desc: 'تفاصيل راتبك والمستحقات المالية' },
  { id: 'leaves', label: 'الإجازات', icon: Palmtree, desc: 'طلبات الإجازة وتقديم طلب جديد' },
  { id: 'holidays', label: 'العطلات الرسمية', icon: CalendarDays, desc: 'العطلات الرسمية القادمة' }
];

export default function EmployeeDashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  const [leaveForm, setLeaveForm] = useState({ type: 'إجازة سنوية', startDate: '', endDate: '', reason: '' });

  const token = getToken();
  const headers = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  }), [token]);

  const fetchJson = useCallback(async (url, options = {}) => {
    const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    let data;
    try { data = await response.json(); } catch { data = {}; }
    if (!response.ok) throw new Error(data.message || 'حدث خطأ أثناء الاتصال بالخادم');
    return data;
  }, [headers]);

  const loadData = useCallback(async (showFullLoading = true) => {
    if (!token) { setLoading(false); return; }
    try {
      if (showFullLoading) setLoading(true); else setRefreshing(true);
      setError('');
      const today = getToday();
      const [employeesResponse, statsResponse, attendanceResponse, leavesResponse, holidaysResponse, salariesResponse] = await Promise.all([
        fetchJson(`${API_URL}/api/employees`),
        fetchJson(`${API_URL}/api/dashboard/stats`),
        fetchJson(`${API_URL}/api/attendance?date=${today}`),
        fetchJson(`${API_URL}/api/leaves`),
        fetchJson(`${API_URL}/api/official-holidays`),
        fetchJson(`${API_URL}/api/salaries`)
      ]);
      const employees = employeesResponse?.employees || [];
      setEmployee(employees[0] || null);
      setStats(statsResponse?.stats || statsResponse || {});
      const attendanceData = attendanceResponse?.attendance || attendanceResponse || [];
      setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
      const leavesData = leavesResponse?.leaves || leavesResponse || [];
      setLeaves(Array.isArray(leavesData) ? leavesData : []);
      const holidaysData = holidaysResponse?.holidays || holidaysResponse || [];
      setHolidays(Array.isArray(holidaysData) ? holidaysData : []);
      const salariesData = salariesResponse?.salaries || salariesResponse || [];
      setSalary(Array.isArray(salariesData) ? salariesData[0] || null : null);
    } catch (err) {
      console.error('Employee dashboard error:', err);
      setError(err.message || 'حدث خطأ أثناء تحميل بيانات الموظف');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, fetchJson]);

  useEffect(() => { loadData(true); }, [loadData]);

  const employeeId = employee?.id || user?.employee_id || user?.id;
  const employeeName = employee?.name || user?.name || user?.username || 'موظف';

  const todayAttendance = useMemo(() => {
    if (!attendance.length) return null;
    return attendance.find((item) => Number(item.employee_id) === Number(employeeId)) || attendance[0] || null;
  }, [attendance, employeeId]);

  const monthlyAttendanceDays = useMemo(() => {
    if (stats?.present_days !== undefined && stats?.present_days !== null) return Number(stats.present_days) || 0;
    return Number(salary?.present_days || 0);
  }, [stats, salary]);

  const monthlyAbsenceDays = useMemo(() => {
    if (stats?.absence_days !== undefined && stats?.absence_days !== null) return Number(stats.absence_days) || 0;
    return Number(salary?.absence_days || 0);
  }, [stats, salary]);

  const monthlyLeaveDays = useMemo(() => {
    if (stats?.leave_days !== undefined && stats?.leave_days !== null) return Number(stats.leave_days) || 0;
    return 0;
  }, [stats]);

  const monthlyOvertimeHours = useMemo(() => {
    if (stats?.overtime_hours !== undefined && stats?.overtime_hours !== null) return Number(stats.overtime_hours) || 0;
    return Number(salary?.overtime_hours || 0);
  }, [stats, salary]);

  const upcomingHolidays = useMemo(() => {
    const today = new Date(getToday());
    return holidays
      .filter((h) => { const d = new Date(h.date || h.holiday_date || h.start_date); return !Number.isNaN(d.getTime()) && d >= today; })
      .sort((a, b) => new Date(a.date || a.holiday_date || a.start_date) - new Date(b.date || b.holiday_date || b.start_date));
  }, [holidays]);

  const submitLeave = async (event) => {
    event.preventDefault();
    if (leaveSubmitting) return;
    if (!leaveForm.startDate || !leaveForm.endDate) {
      setLeaveError('من فضلك اختاري تاريخ بداية ونهاية الإجازة.');
      return;
    }
    if (new Date(leaveForm.endDate) < new Date(leaveForm.startDate)) {
      setLeaveError('تاريخ نهاية الإجازة يجب أن يكون بعد تاريخ البداية.');
      return;
    }
    setLeaveSubmitting(true);
    setLeaveError('');
    try {
      await fetchJson(`${API_URL}/api/leaves`, {
        method: 'POST',
        body: JSON.stringify({
          employee_id: employeeId,
          employeeName,
          type: leaveForm.type,
          startDate: leaveForm.startDate,
          endDate: leaveForm.endDate,
          reason: leaveForm.reason.trim(),
          status: 'pending'
        })
      });
      setShowLeaveModal(false);
      setLeaveForm({ type: 'إجازة سنوية', startDate: '', endDate: '', reason: '' });
      await loadData(false);
      setActivePage('leaves');
    } catch (err) {
      console.error('Submit leave error:', err);
      setLeaveError(err.message || 'حدث خطأ أثناء إرسال طلب الإجازة.');
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const deleteLeave = async (leaveId) => {
    if (!leaveId || leaveDeleting) return;
    if (!window.confirm('هل أنتِ متأكدة من حذف طلب الإجازة؟')) return;
    setLeaveDeleting(leaveId);
    try {
      await fetchJson(`${API_URL}/api/leaves/${leaveId}`, { method: 'DELETE' });
      await loadData(false);
    } catch (err) {
      console.error('Delete leave error:', err);
      setError(err.message || 'حدث خطأ أثناء حذف طلب الإجازة.');
    } finally {
      setLeaveDeleting(null);
    }
  };

  const goTo = (id) => { setActivePage(id); setSidebarOpen(false); };

  const renderHome = () => (
    <>
      <div className="stats">
        <Stat icon={CheckCircle2} color="green" label="أيام الحضور هذا الشهر" value={monthlyAttendanceDays} sub="يوم عمل مسجل" />
        <Stat icon={XCircle} color="red" label="أيام الغياب" value={monthlyAbsenceDays} sub="خلال الشهر الحالي" />
        <Stat icon={Palmtree} color="blue" label="أيام الإجازات" value={monthlyLeaveDays} sub="خلال الشهر الحالي" />
        <Stat icon={Timer} color="amber" label="ساعات العمل الإضافي" value={monthlyOvertimeHours} sub="ساعة هذا الشهر" />
      </div>
      <div className="form-grid" style={{ alignItems: 'start' }}>
        <Card icon={Clock3} title="حضور اليوم" desc={formatDate(getToday())}>
          {todayAttendance ? (
            <div>
              <div className="between mb">
                <span className="muted">الحالة</span>
                <Badge tone={statusTone(todayAttendance.status)}>{normalizeStatus(todayAttendance.status)}</Badge>
              </div>
              <div className="between mb">
                <span className="muted">تسجيل الحضور</span>
                <strong>{todayAttendance.check_in || todayAttendance.checkIn || '—'}</strong>
              </div>
              <div className="between mb">
                <span className="muted">تسجيل الانصراف</span>
                <strong>{todayAttendance.check_out || todayAttendance.checkOut || '—'}</strong>
              </div>
              <div className="between">
                <span className="muted">ساعات إضافية</span>
                <strong>{todayAttendance.overtime_hours || 0}</strong>
              </div>
            </div>
          ) : (
            <Empty icon={Clock3} title="لا يوجد سجل حضور اليوم" text="لم يتم تسجيل حضورك لهذا اليوم بعد في النظام." />
          )}
        </Card>
        <Card icon={CalendarDays} title="أقرب العطلات الرسمية" desc="العطلات القادمة المسجلة في النظام">
          {upcomingHolidays.length ? (
            <div>
              {upcomingHolidays.slice(0, 3).map((h) => (
                <div className="between mb" key={h.id || h.date || h.holiday_date}>
                  <span className="strong">{h.name || h.title || h.holiday_name || 'عطلة رسمية'}</span>
                  <span className="muted nowrap">{formatDate(h.date || h.holiday_date || h.start_date)}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty icon={CalendarDays} title="لا توجد عطلات قادمة" text="ستظهر هنا العطلات الرسمية عند إضافتها من الإدارة." />
          )}
        </Card>
      </div>
      <Card icon={Wallet} title="آخر راتب مسجل" desc="ملخص أحدث بيانات مالية مرتبطة بحسابك">
        {salary ? (
          <div className="between flex-wrap">
            <div>
              <div className="muted small">صافي المستحق</div>
              <div className="stat-value" style={{ fontSize: 28 }}>{formatMoney(salary.net_salary ?? salary.salary ?? salary.base_salary)} <span className="small muted">ج.م</span></div>
            </div>
            <button type="button" className="btn btn-soft" onClick={() => goTo('salary')}>عرض تفاصيل المرتب</button>
          </div>
        ) : (
          <Empty icon={Wallet} title="لا توجد بيانات راتب بعد" text="ستظهر تفاصيل راتبك هنا فور اعتمادها من الإدارة." />
        )}
      </Card>
    </>
  );

  const renderProfile = () => (
    <Card icon={UserRound} title="بيانات الموظف" desc={`${employee?.department_name || employee?.department || 'لم يتم تحديد القسم'} — رقم الموظف #${employee?.id || '—'}`}>
      <div className="form-grid form-grid-3">
        <div><div className="field-label">الاسم</div><div className="strong">{employee?.name || '—'}</div></div>
        <div><div className="field-label">الهاتف</div><div className="strong">{employee?.phone || '—'}</div></div>
        <div><div className="field-label">القسم</div><div className="strong">{employee?.department_name || employee?.department || '—'}</div></div>
        <div><div className="field-label">تاريخ التعاقد</div><div className="strong">{formatDate(employee?.contract_date)}</div></div>
        <div><div className="field-label">تاريخ الميلاد</div><div className="strong">{formatDate(employee?.birth_date)}</div></div>
        <div><div className="field-label">النوع</div><div className="strong">{employee?.gender || '—'}</div></div>
        <div><div className="field-label">الجنسية</div><div className="strong">{employee?.nationality || '—'}</div></div>
        <div><div className="field-label">العنوان</div><div className="strong">{employee?.address || '—'}</div></div>
      </div>
      <Alert type="info">هذه البيانات مسجلة من قبل الإدارة. لتعديل أي بيانات تواصلي مع مسؤول الموارد البشرية.</Alert>
    </Card>
  );

  const renderAttendance = () => (
    <Card icon={Clock3} title="سجل حضور اليوم" desc={formatDate(getToday())}>
      {todayAttendance ? (
        <div className="form-grid form-grid-3">
          <div><div className="field-label">الحالة</div><Badge tone={statusTone(todayAttendance.status)}>{normalizeStatus(todayAttendance.status)}</Badge></div>
          <div><div className="field-label">وقت تسجيل الحضور</div><div className="strong">{todayAttendance.check_in || todayAttendance.checkIn || '—'}</div></div>
          <div><div className="field-label">وقت تسجيل الانصراف</div><div className="strong">{todayAttendance.check_out || todayAttendance.checkOut || '—'}</div></div>
          <div><div className="field-label">ساعات العمل الإضافي</div><div className="strong">{todayAttendance.overtime_hours || 0}</div></div>
        </div>
      ) : (
        <Empty icon={Clock3} title="لا يوجد سجل حضور لهذا اليوم" text="عند تسجيل حضورك من خلال النظام ستظهر هنا حالة اليوم وأوقات التسجيل." />
      )}
    </Card>
  );

  const renderSalary = () => (
    <>
      {!salary ? (
        <Card icon={Wallet} title="ملخص الراتب">
          <Empty icon={Wallet} title="لم يتم العثور على بيانات راتب" text="لا توجد بيانات راتب مرتبطة بحسابك للفترة الحالية. ستظهر هنا فور اعتمادها من الإدارة." />
        </Card>
      ) : (
        <>
          <Card icon={Banknote} title="صافي المستحق" desc="صافي الراتب بعد الإضافات والخصومات">
            <div className="stat-value" style={{ fontSize: 34 }}>{formatMoney(salary.net_salary ?? salary.salary ?? salary.base_salary)} <span className="small muted">ج.م</span></div>
          </Card>
          <Card icon={ReceiptText} title="تفاصيل المرتب" desc="المستحقات المالية المضافة والمخصومة">
            <div className="form-grid form-grid-3">
              <div><div className="field-label">الراتب الأساسي</div><div className="strong">{formatMoney(salary.base_salary ?? salary.salary)} ج.م</div></div>
              <div><div className="field-label">العمل الإضافي</div><div className="strong">{formatMoney(salary.overtime_amount)} ج.م <span className="muted small">({salary.overtime_hours || 0} ساعة)</span></div></div>
              <div><div className="field-label">الخصومات</div><div className="strong" style={{ color: 'var(--red, #dc2626)' }}>{formatMoney(salary.deduction_amount)} ج.م</div></div>
            </div>
          </Card>
          <Card icon={Info} title="بيانات الفترة" desc="مؤشرات الحضور المرتبطة بهذا الراتب">
            <div className="form-grid form-grid-3">
              <div><div className="field-label">أيام الحضور</div><div className="strong">{salary.present_days ?? '—'}</div></div>
              <div><div className="field-label">أيام الغياب</div><div className="strong">{salary.absence_days ?? '—'}</div></div>
              <div><div className="field-label">ساعات إضافية</div><div className="strong">{salary.overtime_hours ?? '—'}</div></div>
            </div>
          </Card>
        </>
      )}
    </>
  );

  const renderLeaves = () => (
    <Card
      icon={Palmtree}
      title="طلبات الإجازة"
      desc="جميع طلبات الإجازة المقدمة وحالة كل طلب"
      actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => { setLeaveError(''); setShowLeaveModal(true); }}><Send size={14} /> تقديم طلب إجازة</button>}
      flush
    >
      {leaves.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr><th>نوع الإجازة</th><th>من</th><th>إلى</th><th>السبب</th><th>الحالة</th><th></th></tr>
            </thead>
            <tbody>
              {leaves.map((leave) => (
                <tr key={leave.id}>
                  <td className="cell-main">{leave.type || 'إجازة'}</td>
                  <td className="nowrap">{formatDate(leave.start_date || leave.startDate)}</td>
                  <td className="nowrap">{formatDate(leave.end_date || leave.endDate)}</td>
                  <td><span className="muted">{leave.reason || '—'}</span></td>
                  <td><Badge tone={statusTone(leave.status)}>{normalizeStatus(leave.status)}</Badge></td>
                  <td className="row-actions">
                    <button type="button" className="icon-btn" title="حذف الطلب" disabled={leaveDeleting === leave.id} onClick={() => deleteLeave(leave.id)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          icon={CalendarOff}
          title="لم تقم بتقديم أي طلبات إجازة"
          text="قدّمي طلب إجازة جديد وسيظهر هنا مع حالة مراجعته من الإدارة."
          action={<button type="button" className="btn btn-primary" onClick={() => { setLeaveError(''); setShowLeaveModal(true); }}><Send size={14} /> تقديم أول طلب إجازة</button>}
        />
      )}
    </Card>
  );

  const renderHolidays = () => (
    <Card icon={CalendarDays} title="العطلات الرسمية" desc="العطلات المعتمدة في النظام" flush>
      {holidays.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>العطلة</th><th>التاريخ</th><th>الحالة</th></tr></thead>
            <tbody>
              {holidays.map((h) => {
                const d = new Date(h.date || h.holiday_date || h.start_date);
                const upcoming = !Number.isNaN(d.getTime()) && d >= new Date(getToday());
                return (
                  <tr key={h.id || h.date || h.holiday_date}>
                    <td className="cell-main">{h.name || h.title || h.holiday_name || 'عطلة رسمية'}</td>
                    <td className="nowrap">{formatDate(h.date || h.holiday_date || h.start_date)}</td>
                    <td><Badge tone={upcoming ? 'blue' : 'gray'}>{upcoming ? 'قادمة' : 'انتهت'}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon={CalendarDays} title="لا توجد عطلات مسجلة" text="ستظهر هنا العطلات الرسمية عند إضافتها من الإدارة." />
      )}
    </Card>
  );

  const renderPage = () => {
    switch (activePage) {
      case 'profile': return renderProfile();
      case 'attendance': return renderAttendance();
      case 'salary': return renderSalary();
      case 'leaves': return renderLeaves();
      case 'holidays': return renderHolidays();
      case 'home':
      default: return renderHome();
    }
  };

  const activeNav = NAV_ITEMS.find((item) => item.id === activePage) || NAV_ITEMS[0];

  return (
    <div className="shell">
      <button type="button" aria-label="إغلاق القائمة" className={`veil ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="side-brand">
          <div className="side-brand-mark"><UserRound size={21} strokeWidth={2.3} /></div>
          <div>
            <div className="side-brand-name">PIONEERS HRMS</div>
            <div className="side-brand-sub">بوابة الموظف</div>
          </div>
          <button type="button" className="icon-btn" onClick={() => setSidebarOpen(false)} style={{ marginInlineStart: 'auto', display: sidebarOpen ? 'inline-flex' : 'none', background: 'transparent', border: 'none', color: '#fff' }} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        <nav className="side-nav">
          <div className="side-group">
            <div className="side-group-label">حسابي</div>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} type="button" className={`side-link ${activePage === item.id ? 'active' : ''}`} onClick={() => goTo(item.id)}>
                  <span className="side-link-icon"><Icon size={17} strokeWidth={2.2} /></span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
        <div className="side-foot">
          <div className="side-user">
            <div className="avatar">{employeeName.trim().charAt(0)}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="side-user-name">{employeeName}</div>
              <div className="side-user-role">موظف</div>
            </div>
          </div>
          <button type="button" className="btn btn-danger btn-block btn-sm" onClick={onLogout}>
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
              <h1>{activeNav.label}</h1>
              <p>{activeNav.desc}</p>
            </div>
          </div>
          <div className="topbar-user">
            <div className="topbar-user-text">
              <div className="topbar-user-name">{employeeName}</div>
              <div className="topbar-user-role">{formatDate(getToday())}</div>
            </div>
            <div className="avatar">{employeeName.trim().charAt(0)}</div>
          </div>
        </header>
        <div className="content">
          {error && <Alert type="error">{error}</Alert>}
          {loading ? (
            <Loading text="جاري تحميل بياناتك..." />
          ) : (
            <>
              {activePage === 'home' && (
                <div className="page-head">
                  <div className="page-head-text">
                    <h2 className="page-title"><span className="page-title-icon"><LayoutDashboard size={20} /></span> أهلاً بك، {employeeName}</h2>
                    <p className="page-desc">كل معلوماتك الوظيفية في مكان واحد. تابع حضورك وراتبك وإجازاتك بسهولة.</p>
                  </div>
                  <div className="page-actions">
                    <button type="button" className="btn btn-soft" onClick={() => loadData(false)} disabled={refreshing}>
                      <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
                      {refreshing ? 'جاري التحديث...' : 'تحديث البيانات'}
                    </button>
                  </div>
                </div>
              )}
              {renderPage()}
            </>
          )}
        </div>
      </main>
      <Modal
        open={showLeaveModal}
        onClose={() => { if (!leaveSubmitting) setShowLeaveModal(false); }}
        title="تقديم طلب إجازة"
        sub="سيصل الطلب إلى الإدارة للمراجعة والاعتماد"
        footer={(
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setShowLeaveModal(false)} disabled={leaveSubmitting}>إلغاء</button>
            <button type="submit" form="leave-form" className="btn btn-primary" disabled={leaveSubmitting}>
              <Send size={14} />
              {leaveSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
            </button>
          </>
        )}
      >
        <form id="leave-form" onSubmit={submitLeave}>
          {leaveError && <Alert type="error">{leaveError}</Alert>}
          <Field label="نوع الإجازة" required>
            <select className="input" value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}>
              {LEAVE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="تاريخ البداية" required>
              <input type="date" className="input" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} />
            </Field>
            <Field label="تاريخ النهاية" required>
              <input type="date" className="input" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} />
            </Field>
          </div>
          <Field label="سبب الإجازة" hint="اختياري — يساعد الإدارة على مراجعة الطلب">
            <textarea className="textarea" rows={3} value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="اكتبي سبب الإجازة هنا..." />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
