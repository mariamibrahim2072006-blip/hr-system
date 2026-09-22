import React, { useEffect, useState } from 'react';
const formatDate = (date) => {
    if (!date) return '-';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return '-';
    }

    return parsedDate.toLocaleDateString('en-GB');
};
const API_URL = 'http://localhost:5000';

function getToday() {
    const now = new Date();
    const localDate = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
    );

    return localDate.toISOString().slice(0, 10);
}

export default function LoansAndDeductions() {
    const [records, setRecords] = useState([]);
    const [employees, setEmployees] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [message, setMessage] = useState({
        text: '',
        type: ''
    });

    const [formData, setFormData] = useState({
        employee_id: '',
        type: 'سلفة مالية',
        value: '',
        details: '',
        date: getToday(),
        notes: ''
    });

    const getHeaders = () => {
        const token = localStorage.getItem('hr_token');

        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        };
    };

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });

        setTimeout(() => {
            setMessage({
                text: '',
                type: ''
            });
        }, 3000);
    };

    const loadEmployees = async () => {
        try {
            const response = await fetch(
                `${API_URL}/api/employees`,
                {
                    headers: getHeaders()
                }
            );

            if (response.status === 401) {
                throw new Error(
                    'جلسة الدخول انتهت، برجاء تسجيل الدخول مرة أخرى'
                );
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    'حدث خطأ أثناء جلب الموظفين'
                );
            }

            setEmployees(
                Array.isArray(data)
                    ? data
                    : data.employees || []
            );

        } catch (error) {
            console.error(
                'LOAD EMPLOYEES ERROR:',
                error
            );

            showMessage(
                error.message ||
                'تعذر تحميل الموظفين',
                'error'
            );
        }
    };

    const loadRecords = async () => {
        try {
            setLoading(true);

            const response = await fetch(
                `${API_URL}/api/loans-deductions`,
                {
                    headers: getHeaders()
                }
            );

            if (response.status === 401) {
                throw new Error(
                    'جلسة الدخول انتهت، برجاء تسجيل الدخول مرة أخرى'
                );
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    'حدث خطأ أثناء جلب المعاملات'
                );
            }

            setRecords(
                Array.isArray(data.records)
                    ? data.records
                    : []
            );

        } catch (error) {
            console.error(
                'LOAD RECORDS ERROR:',
                error
            );

            setRecords([]);

            showMessage(
                error.message ||
                'تعذر تحميل المعاملات المالية',
                'error'
            );

        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEmployees();
        loadRecords();
    }, []);

    const handleChange = (e) => {
        const {
            name,
            value
        } = e.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    const resetForm = () => {
        setFormData({
            employee_id: '',
            type: 'سلفة مالية',
            value: '',
            details: '',
            date: getToday(),
            notes: ''
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.employee_id) {
            showMessage(
                'من فضلك اختر الموظف',
                'error'
            );
            return;
        }

        if (!formData.value.trim()) {
            showMessage(
                'من فضلك أدخل قيمة المعاملة',
                'error'
            );
            return;
        }

        if (!formData.date) {
            showMessage(
                'من فضلك اختر تاريخ المعاملة',
                'error'
            );
            return;
        }

        try {
            setSaving(true);

            const response = await fetch(
                `${API_URL}/api/loans-deductions`,
                {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        employee_id:
                            Number(formData.employee_id),
                        type: formData.type,
                        value: formData.value.trim(),
                        details:
                            formData.details.trim() ||
                            null,
                        date: formData.date,
                        status: 'نشطة',
                        notes:
                            formData.notes.trim() ||
                            null
                    })
                }
            );

            if (response.status === 401) {
                throw new Error(
                    'جلسة الدخول انتهت، برجاء تسجيل الدخول مرة أخرى'
                );
            }

            if (response.status === 403) {
                throw new Error(
                    'ليس لديك صلاحية لإضافة هذه المعاملة'
                );
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    'حدث خطأ أثناء تسجيل المعاملة'
                );
            }

            showMessage(
                'تم تسجيل المعاملة وحفظها في قاعدة البيانات',
                'success'
            );

            resetForm();

            await loadRecords();

        } catch (error) {
            console.error(
                'SAVE TRANSACTION ERROR:',
                error
            );

            showMessage(
                error.message ||
                'حدث خطأ أثناء حفظ المعاملة',
                'error'
            );

        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        const confirmed = window.confirm(
            'هل أنت متأكد من حذف هذه المعاملة؟'
        );

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/api/loans-deductions/${id}`,
                {
                    method: 'DELETE',
                    headers: getHeaders()
                }
            );

            if (response.status === 401) {
                throw new Error(
                    'جلسة الدخول انتهت، برجاء تسجيل الدخول مرة أخرى'
                );
            }

            if (response.status === 403) {
                throw new Error(
                    'ليس لديك صلاحية لحذف هذه المعاملة'
                );
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    'حدث خطأ أثناء حذف المعاملة'
                );
            }

            showMessage(
                'تم حذف المعاملة من قاعدة البيانات',
                'success'
            );

            await loadRecords();

        } catch (error) {
            console.error(
                'DELETE TRANSACTION ERROR:',
                error
            );

            showMessage(
                error.message ||
                'حدث خطأ أثناء حذف المعاملة',
                'error'
            );
        }
    };

    const getTypeStyle = (type) => {
        if (type === 'سلفة مالية') {
            return {
                background: '#fef3c7',
                color: '#92400e'
            };
        }

        if (
            type === 'خصم ساعات' ||
            type === 'جزاء إداري / خصم'
        ) {
            return {
                background: '#fee2e2',
                color: '#991b1b'
            };
        }

        if (
            type === 'إضافة ساعات' ||
            type === 'مكافأة استثنائية'
        ) {
            return {
                background: '#dcfce7',
                color: '#166534'
            };
        }

        return {
            background: '#e0f2fe',
            color: '#075985'
        };
    };

    return (
        <div
            style={{
                padding: '24px',
                fontFamily:
                    'Tahoma, Arial, sans-serif',
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
                    border:
                        '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '16px 24px',
                    marginBottom: '24px',
                    display: 'flex',
                    justifyContent:
                        'space-between',
                    alignItems: 'center',
                    gap: '20px',
                    boxShadow:
                        '0 1px 3px rgba(0,0,0,0.02)'
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
                        إدارة المعاملات المالية والساعات
                    </h2>

                    <p
                        style={{
                            margin:
                                '4px 0 0',
                            fontSize: '12px',
                            color: '#64748b'
                        }}
                    >
                        إدارة السلف والخصومات والإضافات
                        المالية والساعات للموظفين
                    </p>
                </div>

                {message.text && (
                    <div
                        style={{
                            padding:
                                '8px 16px',
                            borderRadius:
                                '6px',
                            fontSize:
                                '12px',
                            fontWeight:
                                'bold',
                            background:
                                message.type ===
                                    'success'
                                    ? '#dcfce7'
                                    : '#fee2e2',
                            color:
                                message.type ===
                                    'success'
                                    ? '#166534'
                                    : '#991b1b'
                        }}
                    >
                        {message.text}
                    </div>
                )}
            </div>

            {/* FORM */}
            <form
                onSubmit={handleSubmit}
                style={{
                    background: '#ffffff',
                    padding: '24px',
                    border:
                        '1px solid #e2e8f0',
                    borderRadius: '10px',
                    marginBottom: '24px',
                    boxShadow:
                        '0 1px 3px rgba(0,0,0,0.02)'
                }}
            >
                <h4
                    style={{
                        margin:
                            '0 0 20px',
                        fontSize: '15px',
                        color: '#0284c7',
                        borderBottom:
                            '2px solid #f0f9ff',
                        paddingBottom:
                            '10px',
                        fontWeight:
                            'bold'
                    }}
                >
                    تسجيل معاملة مالية جديدة
                </h4>

                {employees.length === 0 && (
                    <div
                        style={{
                            padding:
                                '12px 16px',
                            marginBottom:
                                '20px',
                            background:
                                '#fff7ed',
                            border:
                                '1px solid #fed7aa',
                            color:
                                '#9a3412',
                            borderRadius:
                                '6px',
                            fontSize:
                                '13px'
                        }}
                    >
                        لا يوجد موظفون مسجلون في النظام.
                        يجب إضافة موظف أولًا حتى تتمكن
                        من تسجيل معاملة مالية.
                    </div>
                )}

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns:
                            'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '20px',
                        marginBottom:
                            '16px'
                    }}
                >
                    {/* EMPLOYEE */}
                    <div>
                        <label
                            style={{
                                display:
                                    'block',
                                textAlign:
                                    'right',
                                marginBottom:
                                    '6px',
                                fontSize:
                                    '13px',
                                fontWeight:
                                    '600',
                                color:
                                    '#334155'
                            }}
                        >
                            الموظف
                        </label>

                        <select
                            name="employee_id"
                            value={
                                formData.employee_id
                            }
                            onChange={
                                handleChange
                            }
                            disabled={
                                employees.length ===
                                0
                            }
                            style={{
                                width: '100%',
                                padding:
                                    '10px 12px',
                                textAlign:
                                    'right',
                                border:
                                    '1px solid #cbd5e1',
                                borderRadius:
                                    '6px',
                                outline:
                                    'none',
                                fontSize:
                                    '13px',
                                background:
                                    '#f8fafc',
                                boxSizing:
                                    'border-box'
                            }}
                        >
                            <option value="">
                                اختر الموظف
                            </option>

                            {employees.map(
                                (employee) => (
                                    <option
                                        key={
                                            employee.id
                                        }
                                        value={
                                            employee.id
                                        }
                                    >
                                        {
                                            employee.name
                                        }
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    {/* TYPE */}
                    <div>
                        <label
                            style={{
                                display:
                                    'block',
                                textAlign:
                                    'right',
                                marginBottom:
                                    '6px',
                                fontSize:
                                    '13px',
                                fontWeight:
                                    '600',
                                color:
                                    '#334155'
                            }}
                        >
                            نوع المعاملة
                        </label>

                        <select
                            name="type"
                            value={
                                formData.type
                            }
                            onChange={
                                handleChange
                            }
                            style={{
                                width: '100%',
                                padding:
                                    '10px 12px',
                                textAlign:
                                    'right',
                                border:
                                    '1px solid #cbd5e1',
                                borderRadius:
                                    '6px',
                                outline:
                                    'none',
                                fontSize:
                                    '13px',
                                background:
                                    '#f8fafc',
                                boxSizing:
                                    'border-box'
                            }}
                        >
                            <option value="سلفة مالية">
                                سلفة مالية
                            </option>

                            <option value="إضافة ساعات">
                                إضافة ساعات
                            </option>

                            <option value="خصم ساعات">
                                خصم ساعات
                            </option>

                            <option value="جزاء إداري / خصم">
                                جزاء إداري / خصم
                            </option>

                            <option value="مكافأة استثنائية">
                                مكافأة استثنائية
                            </option>
                        </select>
                    </div>

                    {/* VALUE */}
                    <div>
                        <label
                            style={{
                                display:
                                    'block',
                                textAlign:
                                    'right',
                                marginBottom:
                                    '6px',
                                fontSize:
                                    '13px',
                                fontWeight:
                                    '600',
                                color:
                                    '#334155'
                            }}
                        >
                            القيمة
                        </label>

                        <input
                            type="text"
                            name="value"
                            placeholder="مثال: 1500 أو 2 ساعة"
                            value={
                                formData.value
                            }
                            onChange={
                                handleChange
                            }
                            style={{
                                width: '100%',
                                padding:
                                    '10px 12px',
                                textAlign:
                                    'right',
                                border:
                                    '1px solid #cbd5e1',
                                borderRadius:
                                    '6px',
                                outline:
                                    'none',
                                fontSize:
                                    '13px',
                                background:
                                    '#f8fafc',
                                boxSizing:
                                    'border-box'
                            }}
                        />
                    </div>
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns:
                            'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '20px',
                        marginBottom:
                            '24px'
                    }}
                >
                    {/* DETAILS */}
                    <div>
                        <label
                            style={{
                                display:
                                    'block',
                                textAlign:
                                    'right',
                                marginBottom:
                                    '6px',
                                fontSize:
                                    '13px',
                                fontWeight:
                                    '600',
                                color:
                                    '#334155'
                            }}
                        >
                            التفاصيل
                        </label>

                        <input
                            type="text"
                            name="details"
                            placeholder="الأقساط أو سبب المعاملة"
                            value={
                                formData.details
                            }
                            onChange={
                                handleChange
                            }
                            style={{
                                width: '100%',
                                padding:
                                    '10px 12px',
                                textAlign:
                                    'right',
                                border:
                                    '1px solid #cbd5e1',
                                borderRadius:
                                    '6px',
                                outline:
                                    'none',
                                fontSize:
                                    '13px',
                                background:
                                    '#f8fafc',
                                boxSizing:
                                    'border-box'
                            }}
                        />
                    </div>

                    {/* DATE */}
                    <div>
                        <label
                            style={{
                                display:
                                    'block',
                                textAlign:
                                    'right',
                                marginBottom:
                                    '6px',
                                fontSize:
                                    '13px',
                                fontWeight:
                                    '600',
                                color:
                                    '#334155'
                            }}
                        >
                            تاريخ المعاملة
                        </label>

                        <input
                            type="date"
                            name="date"
                            value={
                                formData.date
                            }
                            onChange={
                                handleChange
                            }
                            style={{
                                width: '100%',
                                padding:
                                    '10px 12px',
                                textAlign:
                                    'right',
                                border:
                                    '1px solid #cbd5e1',
                                borderRadius:
                                    '6px',
                                outline:
                                    'none',
                                fontSize:
                                    '13px',
                                background:
                                    '#f8fafc',
                                boxSizing:
                                    'border-box'
                            }}
                        />
                    </div>

                    {/* NOTES */}
                    <div>
                        <label
                            style={{
                                display:
                                    'block',
                                textAlign:
                                    'right',
                                marginBottom:
                                    '6px',
                                fontSize:
                                    '13px',
                                fontWeight:
                                    '600',
                                color:
                                    '#334155'
                            }}
                        >
                            ملاحظات
                        </label>

                        <input
                            type="text"
                            name="notes"
                            placeholder="ملاحظات إضافية"
                            value={
                                formData.notes
                            }
                            onChange={
                                handleChange
                            }
                            style={{
                                width: '100%',
                                padding:
                                    '10px 12px',
                                textAlign:
                                    'right',
                                border:
                                    '1px solid #cbd5e1',
                                borderRadius:
                                    '6px',
                                outline:
                                    'none',
                                fontSize:
                                    '13px',
                                background:
                                    '#f8fafc',
                                boxSizing:
                                    'border-box'
                            }}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={
                        saving ||
                        employees.length ===
                        0
                    }
                    style={{
                        background:
                            saving ||
                                employees.length ===
                                0
                                ? '#94a3b8'
                                : '#0284c7',
                        color: '#fff',
                        padding:
                            '12px 32px',
                        border: 'none',
                        borderRadius:
                            '6px',
                        cursor:
                            saving ||
                                employees.length ===
                                0
                                ? 'not-allowed'
                                : 'pointer',
                        fontWeight:
                            'bold',
                        fontSize:
                            '13px'
                    }}
                >
                    {saving
                        ? 'جاري الحفظ...'
                        : 'حفظ وتسجيل المعاملة'}
                </button>
            </form>

            {/* TABLE */}
            <div
                style={{
                    background: '#ffffff',
                    border:
                        '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '20px',
                    boxShadow:
                        '0 1px 3px rgba(0,0,0,0.02)'
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent:
                            'space-between',
                        alignItems: 'center',
                        marginBottom:
                            '16px'
                    }}
                >
                    <h4
                        style={{
                            margin: 0,
                            fontSize:
                                '15px',
                            color:
                                '#1e293b',
                            fontWeight:
                                'bold'
                        }}
                    >
                        سجل المعاملات
                    </h4>

                    <span
                        style={{
                            fontSize:
                                '12px',
                            color:
                                '#64748b'
                        }}
                    >
                        إجمالي السجلات: {records.length}
                    </span>
                </div>

                {loading ? (
                    <div
                        style={{
                            padding:
                                '50px',
                            textAlign:
                                'center',
                            color:
                                '#64748b',
                            fontSize:
                                '13px'
                        }}
                    >
                        جاري تحميل المعاملات...
                    </div>
                ) : records.length === 0 ? (
                    <div
                        style={{
                            padding:
                                '50px 20px',
                            textAlign:
                                'center',
                            border:
                                '1px dashed #cbd5e1',
                            borderRadius:
                                '8px',
                            color:
                                '#94a3b8',
                            background:
                                '#f8fafc'
                        }}
                    >
                        <div
                            style={{
                                fontSize:
                                    '30px',
                                marginBottom:
                                    '10px'
                            }}
                        >
                            📋
                        </div>

                        <div
                            style={{
                                fontWeight:
                                    '600',
                                color:
                                    '#64748b',
                                marginBottom:
                                    '5px'
                            }}
                        >
                            لا توجد معاملات مالية
                        </div>

                        <div
                            style={{
                                fontSize:
                                    '12px'
                            }}
                        >
                            ستظهر المعاملات هنا بعد تسجيل
                            أول معاملة في النظام.
                        </div>
                    </div>
                ) : (
                    <div
                        style={{
                            width: '100%',
                            overflowX:
                                'auto'
                        }}
                    >
                        <table
                            style={{
                                width: '100%',
                                borderCollapse:
                                    'collapse',
                                textAlign:
                                    'right',
                                fontSize:
                                    '13px'
                            }}
                        >
                            <thead>
                                <tr
                                    style={{
                                        background:
                                            '#f1f5f9',
                                        color:
                                            '#475569'
                                    }}
                                >
                                    <th
                                        style={{
                                            padding:
                                                '12px 16px',
                                            borderBottom:
                                                '2px solid #e2e8f0',
                                            textAlign:
                                                'center'
                                        }}
                                    >
                                        ID
                                    </th>

                                    <th
                                        style={{
                                            padding:
                                                '12px 16px',
                                            borderBottom:
                                                '2px solid #e2e8f0'
                                        }}
                                    >
                                        الموظف
                                    </th>

                                    <th
                                        style={{
                                            padding:
                                                '12px 16px',
                                            borderBottom:
                                                '2px solid #e2e8f0'
                                        }}
                                    >
                                        نوع المعاملة
                                    </th>

                                    <th
                                        style={{
                                            padding:
                                                '12px 16px',
                                            borderBottom:
                                                '2px solid #e2e8f0'
                                        }}
                                    >
                                        القيمة
                                    </th>

                                    <th
                                        style={{
                                            padding:
                                                '12px 16px',
                                            borderBottom:
                                                '2px solid #e2e8f0'
                                        }}
                                    >
                                        التفاصيل
                                    </th>

                                    <th
                                        style={{
                                            padding:
                                                '12px 16px',
                                            borderBottom:
                                                '2px solid #e2e8f0'
                                        }}
                                    >
                                        التاريخ
                                    </th>

                                    <th
                                        style={{
                                            padding:
                                                '12px 16px',
                                            borderBottom:
                                                '2px solid #e2e8f0'
                                        }}
                                    >
                                        الحالة
                                    </th>

                                    <th
                                        style={{
                                            padding:
                                                '12px 16px',
                                            borderBottom:
                                                '2px solid #e2e8f0',
                                            textAlign:
                                                'center'
                                        }}
                                    >
                                        العمليات
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {records.map(
                                    (
                                        record,
                                        index
                                    ) => {
                                        const typeStyle =
                                            getTypeStyle(
                                                record.type
                                            );

                                        return (
                                            <tr
                                                key={
                                                    record.id
                                                }
                                                style={{
                                                    background:
                                                        index %
                                                            2 ===
                                                            0
                                                            ? '#ffffff'
                                                            : '#fafafa',
                                                    borderBottom:
                                                        '1px solid #f1f5f9'
                                                }}
                                            >
                                                <td
                                                    style={{
                                                        padding:
                                                            '12px 16px',
                                                        textAlign:
                                                            'center',
                                                        color:
                                                            '#64748b'
                                                    }}
                                                >
                                                    {
                                                        record.id
                                                    }
                                                </td>

                                                <td
                                                    style={{
                                                        padding:
                                                            '12px 16px',
                                                        fontWeight:
                                                            '600',
                                                        color:
                                                            '#1e293b'
                                                    }}
                                                >
                                                    {record.employeeName ||
                                                        '—'}
                                                </td>

                                                <td
                                                    style={{
                                                        padding:
                                                            '12px 16px'
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            ...typeStyle,
                                                            padding:
                                                                '5px 10px',
                                                            borderRadius:
                                                                '5px',
                                                            fontSize:
                                                                '11px',
                                                            fontWeight:
                                                                '600'
                                                        }}
                                                    >
                                                        {
                                                            record.type
                                                        }
                                                    </span>
                                                </td>

                                                <td
                                                    style={{
                                                        padding:
                                                            '12px 16px',
                                                        color:
                                                            '#1e293b',
                                                        fontWeight:
                                                            'bold'
                                                    }}
                                                >
                                                    {
                                                        record.value
                                                    }
                                                </td>

                                                <td
                                                    style={{
                                                        padding:
                                                            '12px 16px',
                                                        color:
                                                            '#475569'
                                                    }}
                                                >
                                                    {
                                                        record.details ||
                                                        '—'
                                                    }
                                                </td>

                                                <td
                                                    style={{
                                                        padding:
                                                            '12px 16px',
                                                        color:
                                                            '#475569'
                                                    }}
                                                >
                                                    {
                                                        <td>{formatDate(record.date)}</td>
                                                    }
                                                </td>

                                                <td
                                                    style={{
                                                        padding:
                                                            '12px 16px'
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            background:
                                                                '#dcfce7',
                                                            color:
                                                                '#166534',
                                                            padding:
                                                                '4px 10px',
                                                            borderRadius:
                                                                '4px',
                                                            fontWeight:
                                                                '600',
                                                            fontSize:
                                                                '11px'
                                                        }}
                                                    >
                                                        {
                                                            record.status ||
                                                            'نشطة'
                                                        }
                                                    </span>
                                                </td>

                                                <td
                                                    style={{
                                                        padding:
                                                            '12px 16px',
                                                        textAlign:
                                                            'center'
                                                    }}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleDelete(
                                                                record.id
                                                            )
                                                        }
                                                        style={{
                                                            background:
                                                                '#fee2e2',
                                                            color:
                                                                '#991b1b',
                                                            border:
                                                                '1px solid #fecaca',
                                                            padding:
                                                                '5px 14px',
                                                            cursor:
                                                                'pointer',
                                                            borderRadius:
                                                                '4px',
                                                            fontSize:
                                                                '12px',
                                                            fontWeight:
                                                                '600'
                                                        }}
                                                    >
                                                        حذف
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    }
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}