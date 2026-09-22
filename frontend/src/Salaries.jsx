import React, { useEffect, useState } from 'react';

const API_URL = 'http://localhost:5000';

export default function Salaries() {
    const [salaries, setSalaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const getHeaders = () => {
        const token = localStorage.getItem('hr_token');

        return {
            'Content-Type': 'application/json',
            ...(token
                ? {
                    Authorization: `Bearer ${token}`
                }
                : {})
        };
    };

    /* =========================================================
       FETCH SALARIES DIRECTLY FROM BACKEND
    ========================================================= */

    const fetchSalaries = async () => {
        try {
            setLoading(true);
            setMessage('');

            const response = await fetch(
                `${API_URL}/api/salaries`,
                {
                    headers: getHeaders()
                }
            );

            const data =
                await response.json().catch(() => ({}));

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
                setMessage('لا توجد بيانات رواتب متاحة حالياً');
                return;
            }

            // الاعتماد الكامل على البيانات المحسوبة والمجهزة من الـ Backend (شاملة المكافآت والسلف والخصومات)
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

    /* =========================================================
       PRINT SINGLE EMPLOYEE PAYSLIP
    ========================================================= */

    const handlePrint = (emp) => {
        const baseSalary = Number(emp.base_salary ?? emp.salary ?? 0);
        const presentDays = Number(emp.present_days ?? 0);
        const absenceDays = Number(emp.absence_days ?? 0);

        const overtimeHours = Number(emp.overtime_hours ?? 0);
        const overtimeAmount = Number(emp.overtime_amount ?? 0);
        const deductionAmount = Number(emp.deduction_amount ?? 0);
        const netSalary = Number(emp.net_salary ?? (baseSalary + overtimeAmount - deductionAmount));

        const employeeName = emp.name || 'الموظف';

        const printWindow = window.open(
            '',
            '_blank',
            'width=900,height=700'
        );

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
                    body {
                        margin: 0;
                        padding: 35px;
                        font-family: Tahoma, Arial, sans-serif;
                        direction: rtl;
                        background: #ffffff;
                        color: #1e293b;
                    }
                    .container { max-width: 800px; margin: 0 auto; }
                    .header { border-bottom: 2px solid #0284c7; padding-bottom: 18px; margin-bottom: 25px; }
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

    const formatMoney = (value) => {
        return `${Number(value || 0).toFixed(2)} ج.م`;
    };

    const escapeHtml = (value) => {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

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
            {/* HEADER */}
            <div
                style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '16px 24px',
                    marginBottom: '24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>
                        رواتب الموظفين
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                        متابعة الرواتب الأساسية والحضور والخصومات والساعات الإضافية والمكافآت
                    </p>
                </div>
                <div style={{ background: '#eef6ff', color: '#0284c7', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                    إجمالي الموظفين: {salaries.length}
                </div>
            </div>

            {message && (
                <div style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', fontWeight: '600' }}>
                    {message}
                </div>
            )}

            {/* TABLE */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: '15px', color: '#1e293b', fontWeight: 'bold' }}>
                    سجلات الرواتب الشهرية
                </h4>

                <div style={{ width: '100%', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9', color: '#475569' }}>
                                <th style={thStyle}>اسم الموظف</th>
                                <th style={thStyle}>الراتب الأساسي</th>
                                <th style={centerThStyle}>أيام الحضور</th>
                                <th style={centerThStyle}>أيام الغياب</th>
                                <th style={thStyle}>الإضافي والمكافآت</th>
                                <th style={thStyle}>الخصم والسلف</th>
                                <th style={thStyle}>الصافي المحسوب</th>
                                <th style={centerThStyle}>العمليات</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" style={emptyStyle}>جاري تحميل بيانات الرواتب...</td>
                                </tr>
                            ) : salaries.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={emptyStyle}>لا توجد سجلات رواتب متاحة حالياً</td>
                                </tr>
                            ) : (
                                salaries.map((emp, index) => {
                                    const baseSalary = Number(emp.base_salary ?? emp.salary ?? 0);
                                    const presentDays = Number(emp.present_days ?? 0);
                                    const absenceDays = Number(emp.absence_days ?? 0);

                                    const overtimeHours = Number(emp.overtime_hours ?? 0);
                                    const overtimeAmount = Number(emp.overtime_amount ?? 0);
                                    const deductionAmount = Number(emp.deduction_amount ?? 0);
                                    const netSalary = Number(emp.net_salary ?? (baseSalary + overtimeAmount - deductionAmount));

                                    return (
                                        <tr
                                            key={emp.employee_id || emp.id || index}
                                            style={{
                                                background: index % 2 === 0 ? '#ffffff' : '#fafafa',
                                                borderBottom: '1px solid #f1f5f9'
                                            }}
                                        >
                                            <td style={{ ...tdStyle, fontWeight: '600', color: '#1e293b' }}>
                                                {emp.name}
                                            </td>
                                            <td style={tdStyle}>{formatMoney(baseSalary)}</td>
                                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '600' }}>{presentDays}</td>
                                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '600' }}>{absenceDays}</td>

                                            <td style={{ ...tdStyle, color: '#059669', fontWeight: '600' }}>
                                                {overtimeAmount > 0 ? (
                                                    <span>
                                                        +{overtimeAmount.toFixed(2)} ج.م {overtimeHours > 0 ? <span style={{ fontSize: '11px', color: '#64748b' }}>({overtimeHours} س)</span> : ''}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#94a3b8' }}>-</span>
                                                )}
                                            </td>

                                            <td style={{ ...tdStyle, color: '#dc2626', fontWeight: '600' }}>
                                                {deductionAmount > 0 ? `-${deductionAmount.toFixed(2)} ج.م` : <span style={{ color: '#94a3b8' }}>-</span>}
                                            </td>
                                            <td style={{ ...tdStyle, fontWeight: 'bold', color: '#16a34a', fontSize: '14px' }}>
                                                {netSalary.toFixed(2)} ج.م
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                <button
                                                    onClick={() => handlePrint(emp)}
                                                    style={{
                                                        background: '#0284c7',
                                                        color: '#fff',
                                                        border: 'none',
                                                        padding: '6px 14px',
                                                        cursor: 'pointer',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    طباعة
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
        </div>
    );
}

const thStyle = { padding: '12px', borderBottom: '1px solid #e2e8f0', fontWeight: '600' };
const centerThStyle = { ...thStyle, textAlign: 'center' };
const tdStyle = { padding: '12px', borderBottom: '1px solid #f1f5f9' };
const emptyStyle = { padding: '30px', textAlign: 'center', color: '#64748b' };