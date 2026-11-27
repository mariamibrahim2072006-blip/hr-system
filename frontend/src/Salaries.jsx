import React, { useEffect, useState } from 'react';
import { Wallet, Printer, RefreshCw } from 'lucide-react';
import { PageHeader, Card, Empty, Alert, Loading, API_URL, authHeaders } from './ui';

const formatMoney = (value) => `${Number(value || 0).toFixed(2)} ج.م`;

const escapeHtml = (value) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

export default function Salaries() {
    const [salaries, setSalaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const fetchSalaries = async () => {
        try {
            setLoading(true);
            setMessage('');

            const response = await fetch(`${API_URL}/api/salaries`, { headers: authHeaders(true) });
            const data = await response.json().catch(() => ({}));

            if (response.status === 401) {
                setSalaries([]);
                setMessage('جلسة الدخول انتهت، برجاء تسجيل الدخول مرة أخرى');
                return;
            }

            if (!response.ok) {
                throw new Error(data.message || 'حدث خطأ أثناء جلب بيانات الرواتب');
            }

            if (!data.success || !Array.isArray(data.salaries)) {
                setSalaries([]);
                setMessage('');
                return;
            }

            // Fully rely on the backend-calculated data (rewards, loans, deductions included).
            setSalaries(data.salaries);
        } catch (error) {
            console.error('FETCH SALARIES ERROR:', error);
            setSalaries([]);
            setMessage(error.message || 'حدث خطأ أثناء الاتصال بالخادم');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSalaries();
    }, []);

    const handlePrint = (emp) => {
        const baseSalary = Number(emp.base_salary ?? emp.salary ?? 0);
        const presentDays = Number(emp.present_days ?? 0);
        const absenceDays = Number(emp.absence_days ?? 0);

        const overtimeHours = Number(emp.overtime_hours ?? 0);
        const overtimeAmount = Number(emp.overtime_amount ?? 0);
        const deductionAmount = Number(emp.deduction_amount ?? 0);
        const netSalary = Number(emp.net_salary ?? (baseSalary + overtimeAmount - deductionAmount));

        const employeeName = emp.name || 'الموظف';

        const printWindow = window.open('', '_blank', 'width=900,height=700');

        if (!printWindow) {
            setMessage('تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة من المتصفح.');
            return;
        }

        const printDocument = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8" />
                <title>كشف راتب - ${escapeHtml(employeeName)}</title>
                <style>
                    * { box-sizing: border-box; }
                    body { margin: 0; padding: 35px; font-family: Tahoma, Arial, sans-serif; direction: rtl; background: #ffffff; color: #1e293b; }
                    .container { max-width: 800px; margin: 0 auto; }
                    .header { border-bottom: 2px solid #2563eb; padding-bottom: 18px; margin-bottom: 25px; }
                    .title { margin: 0; font-size: 24px; color: #1e293b; }
                    .subtitle { margin: 8px 0 0; font-size: 13px; color: #64748b; }
                    .employee { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px 18px; margin-bottom: 20px; }
                    .employee-label { font-size: 12px; color: #64748b; margin-bottom: 5px; }
                    .employee-name { font-size: 18px; font-weight: bold; color: #1e293b; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { background: #f1f5f9; color: #475569; padding: 12px; border: 1px solid #e2e8f0; text-align: right; font-size: 13px; }
                    td { padding: 12px; border: 1px solid #e2e8f0; font-size: 13px; }
                    .positive { color: #059669; font-weight: bold; }
                    .negative { color: #dc2626; font-weight: bold; }
                    .net { color: #16a34a; font-weight: bold; font-size: 16px; }
                    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 11px; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 class="title">كشف راتب الموظف</h1>
                        <p class="subtitle">سجل الراتب والحضور والخصومات والساعات الإضافية والمكافآت</p>
                    </div>
                    <div class="employee">
                        <div class="employee-label">اسم الموظف</div>
                        <div class="employee-name">${escapeHtml(employeeName)}</div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>البيان</th>
                                <th>القيمة</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>الراتب الأساسي</td><td>${formatMoney(baseSalary)}</td></tr>
                            <tr><td>أيام الحضور</td><td>${presentDays}</td></tr>
                            <tr><td>أيام الغياب</td><td>${absenceDays}</td></tr>
                            <tr><td>الإضافي والمكافآت ${overtimeHours > 0 ? `(${overtimeHours} ساعة)` : ''}</td><td class="positive">+${formatMoney(overtimeAmount)}</td></tr>
                            <tr><td>الخصم والسلف</td><td class="negative">-${formatMoney(deductionAmount)}</td></tr>
                            <tr><td><strong>صافي الراتب</strong></td><td class="net">${formatMoney(netSalary)}</td></tr>
                        </tbody>
                    </table>
                    <div class="footer">تم استخراج كشف الراتب من نظام الموارد البشرية</div>
                </div>
                <script>
                    window.onload = function () {
                        window.focus();
                        window.print();
                        window.onafterprint = function () { window.close(); };
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(printDocument);
        printWindow.document.close();
    };

    return (
        <div>
            <PageHeader
                icon={Wallet}
                title="المرتبات"
                desc="كشوف رواتب محسوبة تلقائيًا من الحضور والإضافي والسلف والخصومات - مع طباعة قسيمة لكل موظف"
            >
                <button type="button" className="btn btn-ghost" onClick={fetchSalaries}>
                    <RefreshCw size={15} />
                    تحديث
                </button>
            </PageHeader>

            {message && <Alert type="error">{message}</Alert>}

            <Card
                icon={Wallet}
                title="سجلات الرواتب"
                desc="الصافي = الأساسي + الإضافي والمكافآت - الخصومات والسلف"
                actions={<span className="pill-count">{salaries.length} موظف</span>}
                flush
            >
                {loading ? (
                    <Loading text="جاري تحميل بيانات الرواتب..." />
                ) : salaries.length === 0 ? (
                    <Empty
                        icon={Wallet}
                        title="لا توجد بيانات رواتب"
                        text="تظهر كشوف الرواتب هنا بعد تسجيل موظفين وحضورهم. أضف موظفًا من قسم سجل الموظفين ثم سجل حضوره لتبدأ الحسابات."
                    />
                ) : (
                    <div className="tbl-wrap">
                        <table className="tbl">
                            <thead>
                                <tr>
                                    <th>اسم الموظف</th>
                                    <th>الراتب الأساسي</th>
                                    <th className="c">أيام الحضور</th>
                                    <th className="c">أيام الغياب</th>
                                    <th>الإضافي والمكافآت</th>
                                    <th>الخصم والسلف</th>
                                    <th>الصافي المحسوب</th>
                                    <th className="c">العمليات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salaries.map((emp) => {
                                    const baseSalary = Number(emp.base_salary ?? emp.salary ?? 0);
                                    const overtimeAmount = Number(emp.overtime_amount ?? 0);
                                    const deductionAmount = Number(emp.deduction_amount ?? 0);
                                    const netSalary = Number(emp.net_salary ?? (baseSalary + overtimeAmount - deductionAmount));
                                    return (
                                        <tr key={emp.id ?? emp.employee_id ?? emp.name}>
                                            <td className="cell-main nowrap">{emp.name || '-'}</td>
                                            <td className="nowrap">{formatMoney(baseSalary)}</td>
                                            <td className="c">{Number(emp.present_days ?? 0)}</td>
                                            <td className="c">{Number(emp.absence_days ?? 0)}</td>
                                            <td className="nowrap" style={{ color: 'var(--success-ink)', fontWeight: 800 }}>
                                                +{formatMoney(overtimeAmount)}
                                            </td>
                                            <td className="nowrap" style={{ color: 'var(--danger-ink)', fontWeight: 800 }}>
                                                -{formatMoney(deductionAmount)}
                                            </td>
                                            <td className="nowrap" style={{ color: 'var(--success)', fontWeight: 900 }}>
                                                {formatMoney(netSalary)}
                                            </td>
                                            <td className="c">
                                                <button type="button" className="btn btn-ghost btn-sm no-print" onClick={() => handlePrint(emp)}>
                                                    <Printer size={13} />
                                                    طباعة القسيمة
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
        </div>
    );
}
