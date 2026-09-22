import React, { useEffect, useState } from 'react';

const API_URL = 'http://localhost:5000';

const getToken = () => localStorage.getItem('hr_token');

const authHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
});

const formatDateTime = (value) => {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatHours = (hours) => {
    const numeric = Number(hours);

    if (!Number.isFinite(numeric)) return '-';

    if (numeric === 1) return 'ساعة واحدة';
    if (numeric === 2) return 'ساعتان';
    if (numeric > 2 && numeric < 11) return `${numeric} ساعات`;

    return `${numeric} ساعة`;
};

export default function ComprehensiveHRMS() {
    const [activeSubTab, setActiveSubTab] = useState('archive');

    const [documents, setDocuments] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [employees, setEmployees] = useState([]);

    const [loadingDocuments, setLoadingDocuments] = useState(false);
    const [loadingPermissions, setLoadingPermissions] = useState(false);
    const [loadingAudit, setLoadingAudit] = useState(false);
    const [loadingEmployees, setLoadingEmployees] = useState(false);

    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [isPermModalOpen, setIsPermModalOpen] = useState(false);

    const [savingDoc, setSavingDoc] = useState(false);
    const [savingPerm, setSavingPerm] = useState(false);

    const [docForm, setDocForm] = useState({
        employeeId: '',
        docType: 'عقد العمل الأساسي',
        uploadDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        status: 'ساري',
        file: null,
    });

    const [permForm, setPermForm] = useState({
        employeeId: '',
        date: new Date().toISOString().split('T')[0],
        hours: '1',
        reason: '',
    });

    const [message, setMessage] = useState({
        text: '',
        type: '',
    });

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });

        setTimeout(() => {
            setMessage({ text: '', type: '' });
        }, 3500);
    };

    const handleUnauthorized = () => {
        showMessage('انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.', 'error');
    };

    const parseResponse = async (response) => {
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            return response.json();
        }

        const text = await response.text();

        return {
            success: response.ok,
            message: text,
        };
    };

    // =========================================================
    // تحميل الموظفين
    // =========================================================

    const fetchEmployees = async () => {
        setLoadingEmployees(true);

        try {
            const response = await fetch(`${API_URL}/api/employees`, {
                headers: authHeaders(),
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const data = await parseResponse(response);

            if (!response.ok || data.success === false) {
                throw new Error(data.message || 'فشل تحميل الموظفين');
            }

            const employeeList =
                Array.isArray(data)
                    ? data
                    : data.employees || data.data || [];

            setEmployees(employeeList);
        } catch (error) {
            console.error('Employees error:', error);
            showMessage(error.message || 'حدث خطأ أثناء تحميل الموظفين', 'error');
        } finally {
            setLoadingEmployees(false);
        }
    };

    // =========================================================
    // أرشيف المستندات
    // =========================================================

    const fetchDocuments = async () => {
        setLoadingDocuments(true);

        try {
            const response = await fetch(`${API_URL}/api/employee-documents`, {
                headers: authHeaders(),
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const data = await parseResponse(response);

            if (!response.ok || data.success === false) {
                throw new Error(data.message || 'فشل تحميل المستندات');
            }

            const list =
                Array.isArray(data)
                    ? data
                    : data.documents || data.data || [];

            setDocuments(list);
        } catch (error) {
            console.error('Documents error:', error);
            showMessage(error.message || 'حدث خطأ أثناء تحميل المستندات', 'error');
        } finally {
            setLoadingDocuments(false);
        }
    };

    const handleSaveDoc = async (e) => {
        e.preventDefault();

        if (!docForm.employeeId) {
            showMessage('اختر الموظف أولًا', 'error');
            return;
        }

        if (!docForm.file) {
            showMessage('اختر ملف المستند أولًا', 'error');
            return;
        }

        setSavingDoc(true);

        try {
            const formData = new FormData();

            formData.append('employee_id', docForm.employeeId);
            formData.append('document_type', docForm.docType);
            formData.append('upload_date', docForm.uploadDate);

            if (docForm.expiryDate) {
                formData.append('expiry_date', docForm.expiryDate);
            }

            formData.append('status', docForm.status);
            formData.append('file', docForm.file);

            const response = await fetch(`${API_URL}/api/employee-documents`, {
                method: 'POST',
                headers: authHeaders(),
                body: formData,
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const data = await parseResponse(response);

            if (!response.ok || data.success === false) {
                throw new Error(data.message || 'فشل رفع المستند');
            }

            await fetchDocuments();

            setIsDocModalOpen(false);

            setDocForm({
                employeeId: '',
                docType: 'عقد العمل الأساسي',
                uploadDate: new Date().toISOString().split('T')[0],
                expiryDate: '',
                status: 'ساري',
                file: null,
            });

            showMessage('تم رفع المستند وحفظه في الأرشيف بنجاح');
        } catch (error) {
            console.error('Save document error:', error);
            showMessage(error.message || 'حدث خطأ أثناء رفع المستند', 'error');
        } finally {
            setSavingDoc(false);
        }
    };

    const handleDeleteDoc = async (id) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا المستند نهائيًا من الأرشيف؟')) {
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/api/employee-documents/${id}`,
                {
                    method: 'DELETE',
                    headers: authHeaders(),
                }
            );

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const data = await parseResponse(response);

            if (!response.ok || data.success === false) {
                throw new Error(data.message || 'فشل حذف المستند');
            }

            await fetchDocuments();

            showMessage('تم حذف المستند بنجاح');
        } catch (error) {
            console.error('Delete document error:', error);
            showMessage(error.message || 'حدث خطأ أثناء حذف المستند', 'error');
        }
    };

    const getDocumentUrl = (doc) => {
        if (!doc) return '#';

        const path =
            doc.file_path ||
            doc.filePath ||
            '';

        if (!path) return '#';

        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }

        return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
    };

    // =========================================================
    // الأذونات الساعية
    // =========================================================

    const fetchPermissions = async () => {
        setLoadingPermissions(true);

        try {
            const response = await fetch(`${API_URL}/api/hourly-permissions`, {
                headers: authHeaders(),
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const data = await parseResponse(response);

            if (!response.ok || data.success === false) {
                throw new Error(data.message || 'فشل تحميل الأذونات');
            }

            const list =
                Array.isArray(data)
                    ? data
                    : data.permissions || data.data || [];

            setPermissions(list);
        } catch (error) {
            console.error('Permissions error:', error);
            showMessage(error.message || 'حدث خطأ أثناء تحميل الأذونات', 'error');
        } finally {
            setLoadingPermissions(false);
        }
    };

    const handleSavePerm = async (e) => {
        e.preventDefault();

        if (!permForm.employeeId) {
            showMessage('اختر الموظف أولًا', 'error');
            return;
        }

        const hours = Number(permForm.hours);

        if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
            showMessage('مدة الإذن يجب أن تكون أكبر من 0 وأقل من أو تساوي 24 ساعة', 'error');
            return;
        }

        setSavingPerm(true);

        try {
            const response = await fetch(`${API_URL}/api/hourly-permissions`, {
                method: 'POST',
                headers: {
                    ...authHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    employee_id: Number(permForm.employeeId),
                    permission_date: permForm.date,
                    hours,
                    reason: permForm.reason.trim(),
                }),
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const data = await parseResponse(response);

            if (!response.ok || data.success === false) {
                throw new Error(data.message || 'فشل تسجيل الإذن');
            }

            await fetchPermissions();

            setIsPermModalOpen(false);

            setPermForm({
                employeeId: '',
                date: new Date().toISOString().split('T')[0],
                hours: '1',
                reason: '',
            });

            showMessage('تم تسجيل إذن الاستئذان بنجاح');
        } catch (error) {
            console.error('Save permission error:', error);
            showMessage(error.message || 'حدث خطأ أثناء تسجيل الإذن', 'error');
        } finally {
            setSavingPerm(false);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            const response = await fetch(
                `${API_URL}/api/hourly-permissions/${id}/status`,
                {
                    method: 'PUT',
                    headers: {
                        ...authHeaders(),
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        status: newStatus,
                    }),
                }
            );

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const data = await parseResponse(response);

            if (!response.ok || data.success === false) {
                throw new Error(data.message || 'فشل تحديث حالة الإذن');
            }

            await fetchPermissions();

            showMessage(`تم تحديث حالة الإذن إلى (${newStatus}) بنجاح`);
        } catch (error) {
            console.error('Permission status error:', error);
            showMessage(error.message || 'حدث خطأ أثناء تحديث الحالة', 'error');
        }
    };

    const handleDeletePerm = async (id) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الإذن؟')) {
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/api/hourly-permissions/${id}`,
                {
                    method: 'DELETE',
                    headers: authHeaders(),
                }
            );

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const data = await parseResponse(response);

            if (!response.ok || data.success === false) {
                throw new Error(data.message || 'فشل حذف الإذن');
            }

            await fetchPermissions();

            showMessage('تم حذف الإذن بنجاح');
        } catch (error) {
            console.error('Delete permission error:', error);
            showMessage(error.message || 'حدث خطأ أثناء حذف الإذن', 'error');
        }
    };

    // =========================================================
    // Audit Logs
    // =========================================================

    const fetchAuditLogs = async () => {
        setLoadingAudit(true);

        try {
            const response = await fetch(`${API_URL}/api/audit-logs`, {
                headers: authHeaders(),
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            if (response.status === 403) {
                throw new Error('ليس لديك صلاحية لعرض سجل التدقيق');
            }

            const data = await parseResponse(response);

            if (!response.ok || data.success === false) {
                throw new Error(data.message || 'فشل تحميل سجل التدقيق');
            }

            const list =
                Array.isArray(data)
                    ? data
                    : data.logs || data.auditLogs || data.data || [];

            setAuditLogs(list);
        } catch (error) {
            console.error('Audit logs error:', error);
            showMessage(error.message || 'حدث خطأ أثناء تحميل سجل التدقيق', 'error');
        } finally {
            setLoadingAudit(false);
        }
    };

    const handleClearAudit = async () => {
        if (
            !window.confirm(
                'تحذير: هل أنت متأكد من تفريغ سجل التدقيق بالكامل؟'
            )
        ) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/audit-logs`, {
                method: 'DELETE',
                headers: authHeaders(),
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const data = await parseResponse(response);

            if (!response.ok || data.success === false) {
                throw new Error(data.message || 'فشل تفريغ سجل التدقيق');
            }

            await fetchAuditLogs();

            showMessage('تم تفريغ سجل التدقيق بنجاح');
        } catch (error) {
            console.error('Clear audit error:', error);
            showMessage(error.message || 'حدث خطأ أثناء تفريغ السجل', 'error');
        }
    };

    // =========================================================
    // Initial loading
    // =========================================================

    useEffect(() => {
        fetchEmployees();
        fetchDocuments();
        fetchPermissions();
        fetchAuditLogs();
    }, []);

    // =========================================================
    // UI Helpers
    // =========================================================

    const getEmployeeName = (employeeId) => {
        const employee = employees.find(
            (item) => Number(item.id) === Number(employeeId)
        );

        return employee?.name || '-';
    };

    const getEmployeeId = (item) =>
        item.employee_id ??
        item.employeeId ??
        item.employee?.id;

    const getEmployeeNameFromItem = (item) =>
        item.employee_name ||
        item.employeeName ||
        item.employee?.name ||
        getEmployeeName(getEmployeeId(item));

    const getDocType = (doc) =>
        doc.document_type ||
        doc.docType ||
        '-';

    const getDocUploadDate = (doc) =>
        doc.upload_date ||
        doc.uploadDate ||
        '-';

    const getDocExpiryDate = (doc) =>
        doc.expiry_date ||
        doc.expiryDate ||
        '';

    const getDocStatus = (doc) =>
        doc.status ||
        'ساري';

    const getPermissionDate = (permission) =>
        permission.permission_date ||
        permission.date ||
        '-';

    const getPermissionHours = (permission) =>
        permission.hours;

    const getPermissionReason = (permission) =>
        permission.reason ||
        '-';

    const getPermissionStatus = (permission) =>
        permission.status ||
        'معلق';

    const getAuditAdmin = (log) =>
        log.admin_name ||
        log.adminName ||
        '-';

    const getAuditAction = (log) =>
        log.action ||
        '-';

    const getAuditTimestamp = (log) =>
        log.created_at ||
        log.timestamp ||
        '-';

    const getAuditIP = (log) =>
        log.ip_address ||
        log.ip ||
        '-';

    return (
        <div
            style={{
                padding: '24px',
                fontFamily: 'Tahoma, Arial, sans-serif',
                direction: 'rtl',
                background: '#f8fafc',
                minHeight: '100vh',
                boxSizing: 'border-box',
            }}
        >
            {/* =====================================================
                العنوان الرئيسي التوضيحي للنظام
            ====================================================== */}

            <div
                style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '16px 24px',
                    marginBottom: '24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                }}
            >
                <div>
                    <h2
                        style={{
                            margin: 0,
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: '#1e293b',
                        }}
                    >
                        إدارة المستندات، الأذونات، وسجل العمليات
                    </h2>

                    <p
                        style={{
                            margin: '4px 0 0',
                            fontSize: '12px',
                            color: '#64748b',
                        }}
                    >
                        هذه اللوحة مخصصة لإدارة الأرشيف الرقمي للموظفين، متابعة أذونات ساعات العمل، ومراقبة حركة المشرفين في النظام
                    </p>
                </div>

                {message.text && (
                    <span
                        style={{
                            padding: '8px 14px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            background:
                                message.type === 'success'
                                    ? '#dcfce7'
                                    : '#fee2e2',
                            color:
                                message.type === 'success'
                                    ? '#166534'
                                    : '#991b1b',
                        }}
                    >
                        {message.text}
                    </span>
                )}
            </div>

            {/* =====================================================
                Tabs التنقل التوضيحية
            ====================================================== */}

            <div
                style={{
                    display: 'flex',
                    gap: '10px',
                    marginBottom: '24px',
                    flexWrap: 'wrap',
                }}
            >
                <button
                    onClick={() => setActiveSubTab('archive')}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '6px',
                        border: 'none',
                        background:
                            activeSubTab === 'archive'
                                ? '#0284c7'
                                : '#ffffff',
                        color:
                            activeSubTab === 'archive'
                                ? '#fff'
                                : '#334155',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}
                >
                    📁 1. أرشيف العقود والمستندات
                </button>

                <button
                    onClick={() => setActiveSubTab('permissions')}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '6px',
                        border: 'none',
                        background:
                            activeSubTab === 'permissions'
                                ? '#0284c7'
                                : '#ffffff',
                        color:
                            activeSubTab === 'permissions'
                                ? '#fff'
                                : '#334155',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}
                >
                    ⏰ 2. أذونات ساعات العمل اليومية
                </button>

                <button
                    onClick={() => setActiveSubTab('audit')}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '6px',
                        border: 'none',
                        background:
                            activeSubTab === 'audit'
                                ? '#0284c7'
                                : '#ffffff',
                        color:
                            activeSubTab === 'audit'
                                ? '#fff'
                                : '#334155',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}
                >
                    🛡️ 3. سجل التدقيق والرقابة الأمنية
                </button>
            </div>

            {/* =====================================================
                Main Content Area
            ====================================================== */}

            <div
                style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
            >
                {/* =================================================
                    DOCUMENTS SECTION
                ================================================== */}

                {activeSubTab === 'archive' && (
                    <div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '16px',
                                flexWrap: 'wrap',
                                gap: '10px',
                            }}
                        >
                            <div>
                                <h4
                                    style={{
                                        margin: 0,
                                        fontSize: '15px',
                                        color: '#1e293b',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    أرشيف عقود ومستندات العاملين
                                </h4>

                                <p
                                    style={{
                                        margin: '5px 0 0',
                                        fontSize: '12px',
                                        color: '#64748b',
                                    }}
                                >
                                    هنا يمكنك رفع وعرض المستندات الرسمية (عقود، بطاقات، شهادات) لكل موظف وتتبع صلاحيتها.
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    setDocForm({
                                        employeeId: '',
                                        docType: 'عقد العمل الأساسي',
                                        uploadDate: new Date()
                                            .toISOString()
                                            .split('T')[0],
                                        expiryDate: '',
                                        status: 'ساري',
                                        file: null,
                                    });

                                    setIsDocModalOpen(true);
                                }}
                                style={{
                                    background: '#0284c7',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                }}
                            >
                                + رفع مستند / عقد جديد
                            </button>
                        </div>

                        <div
                            style={{
                                width: '100%',
                                overflowX: 'auto',
                            }}
                        >
                            <table
                                style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    textAlign: 'right',
                                    fontSize: '13px',
                                }}
                            >
                                <thead>
                                    <tr
                                        style={{
                                            background: '#f1f5f9',
                                            color: '#475569',
                                        }}
                                    >
                                        <th style={thStyle}>اسم الموظف</th>
                                        <th style={thStyle}>نوع المستند</th>
                                        <th style={thStyle}>اسم الملف</th>
                                        <th style={thStyle}>تاريخ الرفع</th>
                                        <th style={thStyle}>تاريخ الانتهاء</th>
                                        <th style={thStyle}>الحالة</th>
                                        <th
                                            style={{
                                                ...thStyle,
                                                textAlign: 'center',
                                            }}
                                        >
                                            العمليات
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {loadingDocuments ? (
                                        <tr>
                                            <td
                                                colSpan="7"
                                                style={emptyStyle}
                                            >
                                                جاري تحميل المستندات...
                                            </td>
                                        </tr>
                                    ) : documents.length > 0 ? (
                                        documents.map((doc) => (
                                            <tr
                                                key={doc.id}
                                                style={{
                                                    borderBottom:
                                                        '1px solid #f1f5f9',
                                                }}
                                            >
                                                <td style={tdStyleBold}>
                                                    {getEmployeeNameFromItem(
                                                        doc
                                                    )}
                                                </td>

                                                <td
                                                    style={{
                                                        ...tdStyle,
                                                        color: '#0284c7',
                                                    }}
                                                >
                                                    {getDocType(doc)}
                                                </td>

                                                <td style={tdStyle}>
                                                    {doc.file_name ||
                                                        doc.fileName ||
                                                        '-'}
                                                </td>

                                                <td style={tdStyle}>
                                                    {getDocUploadDate(doc)}
                                                </td>

                                                <td style={tdStyle}>
                                                    {getDocExpiryDate(doc) ||
                                                        '-'}
                                                </td>

                                                <td style={tdStyle}>
                                                    <span
                                                        style={getStatusStyle(
                                                            getDocStatus(doc)
                                                        )}
                                                    >
                                                        {getDocStatus(doc)}
                                                    </span>
                                                </td>

                                                <td
                                                    style={{
                                                        ...tdStyle,
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent:
                                                                'center',
                                                            gap: '6px',
                                                            flexWrap: 'wrap',
                                                        }}
                                                    >
                                                        <a
                                                            href={getDocumentUrl(
                                                                doc
                                                            )}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                background:
                                                                    '#e0f2fe',
                                                                color: '#0369a1',
                                                                border: '1px solid #bae6fd',
                                                                padding:
                                                                    '4px 9px',
                                                                borderRadius:
                                                                    '4px',
                                                                cursor: 'pointer',
                                                                fontSize: '11px',
                                                                fontWeight:
                                                                    'bold',
                                                                textDecoration:
                                                                    'none',
                                                            }}
                                                        >
                                                            عرض
                                                        </a>

                                                        <button
                                                            onClick={() =>
                                                                handleDeleteDoc(
                                                                    doc.id
                                                                )
                                                            }
                                                            style={{
                                                                background:
                                                                    '#fee2e2',
                                                                color: '#991b1b',
                                                                border: '1px solid #fecaca',
                                                                padding:
                                                                    '4px 9px',
                                                                borderRadius:
                                                                    '4px',
                                                                cursor: 'pointer',
                                                                fontSize: '11px',
                                                                fontWeight:
                                                                    'bold',
                                                            }}
                                                        >
                                                            حذف
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan="7"
                                                style={emptyStyle}
                                            >
                                                لا توجد مستندات محفوظة حاليًا في الأرشيف
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* =================================================
                    PERMISSIONS SECTION
                ================================================== */}

                {activeSubTab === 'permissions' && (
                    <div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '16px',
                                flexWrap: 'wrap',
                                gap: '10px',
                            }}
                        >
                            <div>
                                <h4
                                    style={{
                                        margin: 0,
                                        fontSize: '15px',
                                        color: '#1e293b',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    سجل أذونات الاستئذان الساعية
                                </h4>

                                <p
                                    style={{
                                        margin: '5px 0 0',
                                        fontSize: '12px',
                                        color: '#64748b',
                                    }}
                                >
                                    تسجيل ومتابعة ساعات الاستئذان الطارئة للموظفين مع إمكانية القبول أو الرفض الإداري.
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    setPermForm({
                                        employeeId: '',
                                        date: new Date()
                                            .toISOString()
                                            .split('T')[0],
                                        hours: '1',
                                        reason: '',
                                    });

                                    setIsPermModalOpen(true);
                                }}
                                style={{
                                    background: '#0284c7',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                }}
                            >
                                + تسجيل إذن جديد
                            </button>
                        </div>

                        <div
                            style={{
                                width: '100%',
                                overflowX: 'auto',
                            }}
                        >
                            <table
                                style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    textAlign: 'right',
                                    fontSize: '13px',
                                }}
                            >
                                <thead>
                                    <tr
                                        style={{
                                            background: '#f1f5f9',
                                            color: '#475569',
                                        }}
                                    >
                                        <th style={thStyle}>اسم الموظف</th>
                                        <th style={thStyle}>التاريخ</th>
                                        <th style={thStyle}>المدة</th>
                                        <th style={thStyle}>السبب</th>
                                        <th style={thStyle}>الحالة</th>
                                        <th
                                            style={{
                                                ...thStyle,
                                                textAlign: 'center',
                                            }}
                                        >
                                            الاعتماد والقرارات
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {loadingPermissions ? (
                                        <tr>
                                            <td
                                                colSpan="6"
                                                style={emptyStyle}
                                            >
                                                جاري تحميل الأذونات...
                                            </td>
                                        </tr>
                                    ) : permissions.length > 0 ? (
                                        permissions.map((permission) => {
                                            const status =
                                                getPermissionStatus(
                                                    permission
                                                );

                                            return (
                                                <tr
                                                    key={permission.id}
                                                    style={{
                                                        borderBottom:
                                                            '1px solid #f1f5f9',
                                                    }}
                                                >
                                                    <td style={tdStyleBold}>
                                                        {getEmployeeNameFromItem(
                                                            permission
                                                        )}
                                                    </td>

                                                    <td style={tdStyle}>
                                                        {getPermissionDate(
                                                            permission
                                                        )}
                                                    </td>

                                                    <td
                                                        style={{
                                                            ...tdStyle,
                                                            color: '#0284c7',
                                                            fontWeight: 'bold',
                                                        }}
                                                    >
                                                        {formatHours(
                                                            getPermissionHours(
                                                                permission
                                                            )
                                                        )}
                                                    </td>

                                                    <td style={tdStyle}>
                                                        {getPermissionReason(
                                                            permission
                                                        )}
                                                    </td>

                                                    <td style={tdStyle}>
                                                        <span
                                                            style={getStatusStyle(
                                                                status
                                                            )}
                                                        >
                                                            {status}
                                                        </span>
                                                    </td>

                                                    <td
                                                        style={{
                                                            ...tdStyle,
                                                            textAlign: 'center',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                justifyContent:
                                                                    'center',
                                                                gap: '6px',
                                                                flexWrap:
                                                                    'wrap',
                                                            }}
                                                        >
                                                            {status !==
                                                                'مقبول' && (
                                                                    <button
                                                                        onClick={() =>
                                                                            handleStatusChange(
                                                                                permission.id,
                                                                                'مقبول'
                                                                            )
                                                                        }
                                                                        style={{
                                                                            background:
                                                                                '#dcfce7',
                                                                            color: '#166534',
                                                                            border: '1px solid #bbf7d0',
                                                                            padding:
                                                                                '4px 8px',
                                                                            borderRadius:
                                                                                '4px',
                                                                            cursor: 'pointer',
                                                                            fontSize:
                                                                                '11px',
                                                                            fontWeight:
                                                                                'bold',
                                                                        }}
                                                                    >
                                                                        قبول
                                                                    </button>
                                                                )}

                                                            {status !==
                                                                'مرفوض' && (
                                                                    <button
                                                                        onClick={() =>
                                                                            handleStatusChange(
                                                                                permission.id,
                                                                                'مرفوض'
                                                                            )
                                                                        }
                                                                        style={{
                                                                            background:
                                                                                '#fee2e2',
                                                                            color: '#991b1b',
                                                                            border: '1px solid #fecaca',
                                                                            padding:
                                                                                '4px 8px',
                                                                            borderRadius:
                                                                                '4px',
                                                                            cursor: 'pointer',
                                                                            fontSize:
                                                                                '11px',
                                                                            fontWeight:
                                                                                'bold',
                                                                        }}
                                                                    >
                                                                        رفض
                                                                    </button>
                                                                )}

                                                            <button
                                                                onClick={() =>
                                                                    handleDeletePerm(
                                                                        permission.id
                                                                    )
                                                                }
                                                                style={{
                                                                    background:
                                                                        '#f1f5f9',
                                                                    color: '#64748b',
                                                                    border: '1px solid #cbd5e1',
                                                                    padding:
                                                                        '4px 8px',
                                                                    borderRadius:
                                                                        '4px',
                                                                    cursor: 'pointer',
                                                                    fontSize:
                                                                        '11px',
                                                                }}
                                                            >
                                                                حذف
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan="6"
                                                style={emptyStyle}
                                            >
                                                لا توجد أذونات مسجلة حاليًا
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* =================================================
                    AUDIT LOGS SECTION
                ================================================== */}

                {activeSubTab === 'audit' && (
                    <div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '16px',
                                flexWrap: 'wrap',
                                gap: '10px',
                            }}
                        >
                            <div>
                                <h4
                                    style={{
                                        margin: 0,
                                        fontSize: '15px',
                                        color: '#1e293b',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    سجل التدقيق والمراقبة الأمنية
                                </h4>

                                <p
                                    style={{
                                        margin: '5px 0 0',
                                        fontSize: '12px',
                                        color: '#64748b',
                                    }}
                                >
                                    متابعة جميع العمليات الحساسة التي يقوم بها المسؤولون في النظام (إضافة، تعديل، حذف، تسجيل دخول).
                                </p>
                            </div>

                            {auditLogs.length > 0 && (
                                <button
                                    onClick={handleClearAudit}
                                    style={{
                                        background: '#fee2e2',
                                        color: '#991b1b',
                                        border: '1px solid #fecaca',
                                        padding: '6px 14px',
                                        borderRadius: '6px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                    }}
                                >
                                    تفريغ السجل
                                </button>
                            )}
                        </div>

                        <div
                            style={{
                                width: '100%',
                                overflowX: 'auto',
                            }}
                        >
                            <table
                                style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    textAlign: 'right',
                                    fontSize: '13px',
                                }}
                            >
                                <thead>
                                    <tr
                                        style={{
                                            background: '#f1f5f9',
                                            color: '#475569',
                                        }}
                                    >
                                        <th style={thStyle}>
                                            المسؤول / المستخدم
                                        </th>

                                        <th style={thStyle}>
                                            الإجراء المنجز
                                        </th>

                                        <th style={thStyle}>
                                            التاريخ والوقت
                                        </th>

                                        <th style={thStyle}>
                                            عنوان الـ IP
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {loadingAudit ? (
                                        <tr>
                                            <td
                                                colSpan="4"
                                                style={emptyStyle}
                                            >
                                                جاري تحميل سجل التدقيق...
                                            </td>
                                        </tr>
                                    ) : auditLogs.length > 0 ? (
                                        auditLogs.map((log) => (
                                            <tr
                                                key={log.id}
                                                style={{
                                                    borderBottom:
                                                        '1px solid #f1f5f9',
                                                }}
                                            >
                                                <td
                                                    style={{
                                                        ...tdStyle,
                                                        fontWeight: '600',
                                                    }}
                                                >
                                                    {getAuditAdmin(log)}
                                                </td>

                                                <td
                                                    style={{
                                                        ...tdStyle,
                                                        color: '#1e293b',
                                                    }}
                                                >
                                                    {getAuditAction(log)}
                                                </td>

                                                <td
                                                    style={{
                                                        ...tdStyle,
                                                        color: '#64748b',
                                                    }}
                                                >
                                                    {formatDateTime(
                                                        getAuditTimestamp(log)
                                                    )}
                                                </td>

                                                <td
                                                    style={{
                                                        ...tdStyle,
                                                        color: '#0284c7',
                                                        fontFamily:
                                                            'monospace',
                                                    }}
                                                >
                                                    {getAuditIP(log)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan="4"
                                                style={emptyStyle}
                                            >
                                                سجل التدقيق فارغ حاليًا
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* =====================================================
                DOCUMENT MODAL
            ====================================================== */}

            {isDocModalOpen && (
                <div style={overlayStyle}>
                    <div style={modalStyle}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '18px',
                            }}
                        >
                            <h3
                                style={{
                                    margin: 0,
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    color: '#1e293b',
                                }}
                            >
                                رفع عقد / مستند جديد
                            </h3>

                            <button
                                type="button"
                                onClick={() => setIsDocModalOpen(false)}
                                style={closeButtonStyle}
                            >
                                ×
                            </button>
                        </div>

                        <form
                            onSubmit={handleSaveDoc}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                            }}
                        >
                            <div>
                                <label style={labelStyle}>
                                    اختر الموظف
                                </label>

                                <select
                                    value={docForm.employeeId}
                                    onChange={(e) =>
                                        setDocForm({
                                            ...docForm,
                                            employeeId: e.target.value,
                                        })
                                    }
                                    style={inputStyle}
                                    required
                                >
                                    <option value="">
                                        {loadingEmployees
                                            ? 'جاري تحميل الموظفين...'
                                            : '-- اختر الموظف --'}
                                    </option>

                                    {employees.map((employee) => (
                                        <option
                                            key={employee.id}
                                            value={employee.id}
                                        >
                                            {employee.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={labelStyle}>
                                    نوع المستند
                                </label>

                                <select
                                    value={docForm.docType}
                                    onChange={(e) =>
                                        setDocForm({
                                            ...docForm,
                                            docType: e.target.value,
                                        })
                                    }
                                    style={inputStyle}
                                >
                                    <option value="عقد العمل الأساسي">
                                        عقد العمل الأساسي
                                    </option>

                                    <option value="صورة بطاقة الرقم القومي">
                                        صورة بطاقة الرقم القومي
                                    </option>

                                    <option value="شهادة التخرج / المؤهل">
                                        شهادة التخرج / المؤهل
                                    </option>

                                    <option value="شهادة إتمام الخدمة العسكرية">
                                        شهادة إتمام الخدمة العسكرية
                                    </option>

                                    <option value="صحيفة الحالة الجنائية">
                                        صحيفة الحالة الجنائية
                                    </option>

                                    <option value="مستند آخر">
                                        مستند آخر
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label style={labelStyle}>
                                    ملف المستند (PDF, صور, Word)
                                </label>

                                <input
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                                    onChange={(e) =>
                                        setDocForm({
                                            ...docForm,
                                            file: e.target.files?.[0] || null,
                                        })
                                    }
                                    style={{
                                        ...inputStyle,
                                        padding: '7px',
                                    }}
                                    required
                                />

                                {docForm.file && (
                                    <div
                                        style={{
                                            marginTop: '5px',
                                            fontSize: '11px',
                                            color: '#0284c7',
                                        }}
                                    >
                                        الملف المختار:{' '}
                                        {docForm.file.name}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label style={labelStyle}>
                                    تاريخ الرفع
                                </label>

                                <input
                                    type="date"
                                    value={docForm.uploadDate}
                                    onChange={(e) =>
                                        setDocForm({
                                            ...docForm,
                                            uploadDate: e.target.value,
                                        })
                                    }
                                    style={inputStyle}
                                    required
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>
                                    تاريخ الانتهاء (اختياري)
                                </label>

                                <input
                                    type="date"
                                    value={docForm.expiryDate}
                                    onChange={(e) =>
                                        setDocForm({
                                            ...docForm,
                                            expiryDate: e.target.value,
                                        })
                                    }
                                    style={inputStyle}
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>
                                    الحالة
                                </label>

                                <select
                                    value={docForm.status}
                                    onChange={(e) =>
                                        setDocForm({
                                            ...docForm,
                                            status: e.target.value,
                                        })
                                    }
                                    style={inputStyle}
                                >
                                    <option value="ساري">ساري</option>
                                    <option value="مؤرشف">مؤرشف</option>
                                    <option value="منتهي الصلاحية">
                                        منتهي الصلاحية
                                    </option>
                                </select>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: '10px',
                                    marginTop: '10px',
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsDocModalOpen(false)
                                    }
                                    style={cancelButtonStyle}
                                    disabled={savingDoc}
                                >
                                    إلغاء
                                </button>

                                <button
                                    type="submit"
                                    style={primaryButtonStyle}
                                    disabled={savingDoc}
                                >
                                    {savingDoc
                                        ? 'جاري الرفع...'
                                        : 'رفع وحفظ المستند'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =====================================================
                PERMISSION MODAL
            ====================================================== */}

            {isPermModalOpen && (
                <div style={overlayStyle}>
                    <div style={modalStyle}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '18px',
                            }}
                        >
                            <h3
                                style={{
                                    margin: 0,
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    color: '#1e293b',
                                }}
                            >
                                تسجیل إذن استئذان ساعي للموظف
                            </h3>

                            <button
                                type="button"
                                onClick={() => setIsPermModalOpen(false)}
                                style={closeButtonStyle}
                            >
                                ×
                            </button>
                        </div>

                        <form
                            onSubmit={handleSavePerm}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                            }}
                        >
                            <div>
                                <label style={labelStyle}>
                                    اختر الموظف
                                </label>

                                <select
                                    value={permForm.employeeId}
                                    onChange={(e) =>
                                        setPermForm({
                                            ...permForm,
                                            employeeId: e.target.value,
                                        })
                                    }
                                    style={inputStyle}
                                    required
                                >
                                    <option value="">
                                        {loadingEmployees
                                            ? 'جاري تحميل الموظفين...'
                                            : '-- اختر الموظف --'}
                                    </option>

                                    {employees.map((employee) => (
                                        <option
                                            key={employee.id}
                                            value={employee.id}
                                        >
                                            {employee.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={labelStyle}>
                                    تاريخ الإذن
                                </label>

                                <input
                                    type="date"
                                    value={permForm.date}
                                    onChange={(e) =>
                                        setPermForm({
                                            ...permForm,
                                            date: e.target.value,
                                        })
                                    }
                                    style={inputStyle}
                                    required
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>
                                    عدد ساعات الاستئذان
                                </label>

                                <input
                                    type="number"
                                    min="0.25"
                                    max="24"
                                    step="0.25"
                                    value={permForm.hours}
                                    onChange={(e) =>
                                        setPermForm({
                                            ...permForm,
                                            hours: e.target.value,
                                        })
                                    }
                                    style={inputStyle}
                                    required
                                />

                                <small
                                    style={{
                                        display: 'block',
                                        marginTop: '4px',
                                        color: '#94a3b8',
                                        fontSize: '10px',
                                    }}
                                >
                                    يمكنك إدخال (0.5) نصف ساعة، أو (1) ساعة كاملة، وهكذا.
                                </small>
                            </div>

                            <div>
                                <label style={labelStyle}>
                                    سبب الاستئذان
                                </label>

                                <textarea
                                    placeholder="اكتب سبب الاستئذان (مثلاً: ظرف عائلي طارئ)..."
                                    value={permForm.reason}
                                    onChange={(e) =>
                                        setPermForm({
                                            ...permForm,
                                            reason: e.target.value,
                                        })
                                    }
                                    style={{
                                        ...inputStyle,
                                        minHeight: '80px',
                                        resize: 'vertical',
                                    }}
                                />
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: '10px',
                                    marginTop: '10px',
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsPermModalOpen(false)
                                    }
                                    style={cancelButtonStyle}
                                    disabled={savingPerm}
                                >
                                    إلغاء
                                </button>

                                <button
                                    type="submit"
                                    style={primaryButtonStyle}
                                    disabled={savingPerm}
                                >
                                    {savingPerm
                                        ? 'جاري الحفظ...'
                                        : 'حفظ إذن الاستئذان'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================================
// Shared Styles
// =============================================================

const thStyle = {
    padding: '12px',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap',
};

const tdStyle = {
    padding: '12px',
    color: '#475569',
};

const tdStyleBold = {
    padding: '12px',
    fontWeight: '600',
    color: '#1e293b',
};

const emptyStyle = {
    padding: '35px',
    textAlign: 'center',
    color: '#94a3b8',
};

const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(15, 23, 42, 0.45)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: '20px',
    boxSizing: 'border-box',
};

const modalStyle = {
    background: '#fff',
    padding: '24px',
    borderRadius: '10px',
    width: '440px',
    maxWidth: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
};

const inputStyle = {
    width: '100%',
    padding: '9px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    boxSizing: 'border-box',
    fontFamily: 'Tahoma, Arial, sans-serif',
    fontSize: '12px',
    background: '#fff',
};

const labelStyle = {
    display: 'block',
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '5px',
    fontWeight: 'bold',
};

const primaryButtonStyle = {
    background: '#0284c7',
    color: '#fff',
    border: 'none',
    padding: '8px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
};

const cancelButtonStyle = {
    background: '#f1f5f9',
    color: '#475569',
    border: '1px solid #cbd5e1',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
};

const closeButtonStyle = {
    background: '#f1f5f9',
    border: 'none',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '20px',
    lineHeight: '20px',
    color: '#64748b',
};

const getStatusStyle = (status) => {
    let background = '#fef3c7';
    let color = '#b45309';

    if (
        status === 'ساري' ||
        status === 'مقبول'
    ) {
        background = '#dcfce7';
        color = '#166534';
    } else if (
        status === 'مرفوض' ||
        status === 'منتهي الصلاحية'
    ) {
        background = '#fee2e2';
        color = '#991b1b';
    } else if (status === 'مؤرشف') {
        background = '#fef3c7';
        color = '#b45309';
    }

    return {
        background,
        color,
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 'bold',
        display: 'inline-block',
    };
};