import React, { useEffect, useState } from 'react';

const API_URL = 'http://localhost:5000/api';

const getAuthHeaders = (includeJson = false) => {
    const token = localStorage.getItem('hr_token');

    return {
        ...(includeJson
            ? { 'Content-Type': 'application/json' }
            : {}),
        Authorization: `Bearer ${token}`
    };
};

const roleLabels = {
    admin: 'مدير النظام',
    hr: 'الموارد البشرية',
    manager: 'مدير',
    employee: 'موظف'
};

const roleColors = {
    admin: {
        background: '#e0f2fe',
        color: '#0369a1',
        border: '#bae6fd'
    },
    hr: {
        background: '#dcfce7',
        color: '#166534',
        border: '#bbf7d0'
    },
    manager: {
        background: '#fef3c7',
        color: '#92400e',
        border: '#fde68a'
    },
    employee: {
        background: '#f1f5f9',
        color: '#475569',
        border: '#e2e8f0'
    }
};

const emptyForm = {
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'admin',
    employee_id: ''
};

export default function Users() {
    const [users, setUsers] = useState([]);
    const [employees, setEmployees] = useState([]);

    const [loading, setLoading] = useState(true);
    const [employeesLoading, setEmployeesLoading] = useState(false);

    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [showForm, setShowForm] = useState(false);

    const [formData, setFormData] =
        useState(emptyForm);

    // =========================
    // FETCH USERS
    // =========================

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError('');

            const token =
                localStorage.getItem('hr_token');

            if (!token) {
                setError(
                    'جلسة تسجيل الدخول غير موجودة. من فضلك سجل الدخول مرة أخرى.'
                );
                return;
            }

            const response = await fetch(
                `${API_URL}/users`,
                {
                    method: 'GET',
                    headers: getAuthHeaders()
                }
            );

            const data = await response.json();

            if (response.status === 401) {
                setError(
                    'انتهت جلسة تسجيل الدخول أو الـ Token غير صالح. من فضلك سجل الدخول مرة أخرى.'
                );
                return;
            }

            if (response.status === 403) {
                setError(
                    'ليس لديك صلاحية للوصول إلى مستخدمي النظام.'
                );
                return;
            }

            if (
                !response.ok ||
                !data.success
            ) {
                throw new Error(
                    data.message ||
                    'فشل تحميل المستخدمين'
                );
            }

            setUsers(
                Array.isArray(data.users)
                    ? data.users
                    : []
            );

        } catch (err) {
            console.error(
                'Fetch users error:',
                err
            );

            setError(
                err.message ||
                'تعذر الاتصال بالخادم'
            );
        } finally {
            setLoading(false);
        }
    };

    // =========================
    // FETCH EMPLOYEES
    // =========================

    const fetchEmployees = async () => {
        try {
            setEmployeesLoading(true);

            const response = await fetch(
                `${API_URL}/employees`,
                {
                    method: 'GET',
                    headers: getAuthHeaders()
                }
            );

            const data = await response.json();

            if (response.status === 401) {
                setError(
                    'انتهت جلسة تسجيل الدخول أو الـ Token غير صالح.'
                );
                return;
            }

            if (response.status === 403) {
                setError(
                    'ليس لديك صلاحية للوصول إلى الموظفين.'
                );
                return;
            }

            if (
                !response.ok ||
                !data.success
            ) {
                throw new Error(
                    data.message ||
                    'فشل تحميل الموظفين'
                );
            }

            setEmployees(
                Array.isArray(data.employees)
                    ? data.employees
                    : []
            );

        } catch (err) {
            console.error(
                'Fetch employees error:',
                err
            );

            setError(
                err.message ||
                'تعذر تحميل الموظفين'
            );
        } finally {
            setEmployeesLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchEmployees();
    }, []);

    // =========================
    // FORM
    // =========================

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => {
            const updated = {
                ...prev,
                [name]:
                    name === 'username'
                        ? value.replace(/\s/g, '')
                        : value
            };

            // Employee ID is only used
            // when role = employee.
            if (
                name === 'role' &&
                value !== 'employee'
            ) {
                updated.employee_id = '';
            }

            return updated;
        });

        setError('');
        setSuccess('');
    };

    const resetForm = () => {
        setFormData({
            ...emptyForm
        });
    };

    const handleToggleForm = () => {
        setShowForm((prev) => !prev);

        setError('');
        setSuccess('');

        if (showForm) {
            resetForm();
        }
    };

    // =========================
    // AVAILABLE EMPLOYEES
    // =========================

    const linkedEmployeeIds = new Set(
        users
            .filter(
                (user) =>
                    user.employee_id !== null &&
                    user.employee_id !== undefined &&
                    user.employee_id !== ''
            )
            .map((user) =>
                Number(user.employee_id)
            )
    );

    const availableEmployees =
        employees.filter(
            (employee) =>
                !linkedEmployeeIds.has(
                    Number(employee.id)
                )
        );

    // =========================
    // ADD USER
    // =========================

    const handleAddUser = async (e) => {
        e.preventDefault();

        setError('');
        setSuccess('');

        const name =
            formData.name.trim();

        const username =
            formData.username.trim();

        const email =
            formData.email
                .trim()
                .toLowerCase();

        const password =
            formData.password;

        if (!name) {
            setError(
                'من فضلك أدخل اسم المستخدم.'
            );
            return;
        }

        if (name.length < 2) {
            setError(
                'اسم المستخدم يجب أن يكون حرفين على الأقل.'
            );
            return;
        }

        if (!username) {
            setError(
                'من فضلك أدخل Username.'
            );
            return;
        }

        if (
            !/^[a-zA-Z0-9_.-]+$/.test(
                username
            )
        ) {
            setError(
                'Username يجب أن يحتوي على حروف إنجليزية أو أرقام أو _ أو - أو . فقط.'
            );
            return;
        }

        if (!email) {
            setError(
                'من فضلك أدخل البريد الإلكتروني.'
            );
            return;
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                email
            )
        ) {
            setError(
                'من فضلك أدخل بريدًا إلكترونيًا صحيحًا.'
            );
            return;
        }

        if (!password) {
            setError(
                'من فضلك أدخل كلمة المرور.'
            );
            return;
        }

        if (password.length < 6) {
            setError(
                'كلمة المرور يجب أن تكون 6 أحرف على الأقل.'
            );
            return;
        }

        if (!formData.role) {
            setError(
                'من فضلك اختر صلاحية المستخدم.'
            );
            return;
        }

        // =========================
        // EMPLOYEE LINK VALIDATION
        // =========================

        if (
            formData.role === 'employee' &&
            !formData.employee_id
        ) {
            setError(
                'من فضلك اختر الموظف المرتبط بهذا الحساب.'
            );
            return;
        }

        try {
            setSaving(true);

            const payload = {
                name,
                username,
                email,
                password,
                role: formData.role,
                employee_id:
                    formData.role === 'employee'
                        ? Number(
                            formData.employee_id
                        )
                        : null
            };

            const response = await fetch(
                `${API_URL}/users/add`,
                {
                    method: 'POST',
                    headers:
                        getAuthHeaders(true),
                    body: JSON.stringify(
                        payload
                    )
                }
            );

            const data =
                await response.json();

            if (response.status === 401) {
                setError(
                    'انتهت جلسة تسجيل الدخول أو الـ Token غير صالح.'
                );
                return;
            }

            if (response.status === 403) {
                setError(
                    'ليس لديك صلاحية لإضافة مستخدمين.'
                );
                return;
            }

            if (
                !response.ok ||
                !data.success
            ) {
                throw new Error(
                    data.message ||
                    'فشل إضافة المستخدم'
                );
            }

            setSuccess(
                data.message ||
                'تمت إضافة المستخدم بنجاح.'
            );

            resetForm();

            setShowForm(false);

            await fetchUsers();
            await fetchEmployees();

        } catch (err) {
            console.error(
                'Add user error:',
                err
            );

            setError(
                err.message ||
                'تعذر إضافة المستخدم.'
            );
        } finally {
            setSaving(false);
        }
    };

    // =========================
    // DELETE USER
    // =========================

    const handleDeleteUser = async (user) => {
        const confirmed =
            window.confirm(
                `هل أنت متأكد من حذف المستخدم "${user.name}"؟\n\nلا يمكن التراجع عن عملية الحذف.`
            );

        if (!confirmed) {
            return;
        }

        setError('');
        setSuccess('');
        setDeletingId(user.id);

        try {
            const response = await fetch(
                `${API_URL}/users/delete/${user.id}`,
                {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                }
            );

            const data =
                await response.json();

            if (response.status === 401) {
                setError(
                    'انتهت جلسة تسجيل الدخول أو الـ Token غير صالح.'
                );
                return;
            }

            if (response.status === 403) {
                setError(
                    'ليس لديك صلاحية لحذف المستخدمين.'
                );
                return;
            }

            if (
                !response.ok ||
                !data.success
            ) {
                throw new Error(
                    data.message ||
                    'فشل حذف المستخدم'
                );
            }

            setSuccess(
                data.message ||
                'تم حذف المستخدم بنجاح.'
            );

            setUsers((prevUsers) =>
                prevUsers.filter(
                    (item) =>
                        item.id !== user.id
                )
            );

        } catch (err) {
            console.error(
                'Delete user error:',
                err
            );

            setError(
                err.message ||
                'تعذر حذف المستخدم.'
            );
        } finally {
            setDeletingId(null);
        }
    };

    // =========================
    // GET EMPLOYEE NAME
    // =========================

    const getEmployeeName = (employeeId) => {
        if (!employeeId) {
            return null;
        }

        const employee =
            employees.find(
                (item) =>
                    Number(item.id) ===
                    Number(employeeId)
            );

        return employee || null;
    };

    // =========================
    // STYLES
    // =========================

    const inputStyle = {
        width: '100%',
        padding: '10px 12px',
        marginTop: '7px',
        boxSizing: 'border-box',
        border: '1px solid #cbd5e1',
        borderRadius: '6px',
        background: '#f8fafc',
        color: '#1e293b',
        fontSize: '13px',
        outline: 'none',
        direction: 'rtl'
    };

    const labelStyle = {
        display: 'block',
        color: '#334155',
        fontSize: '13px',
        fontWeight: '600',
        textAlign: 'right'
    };

    const cardStyle = {
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        boxShadow:
            '0 1px 3px rgba(0,0,0,0.02)'
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
            {/* =========================
                HEADER
            ========================= */}

            <div
                style={{
                    ...cardStyle,
                    padding: '16px 24px',
                    marginBottom: '24px',
                    display: 'flex',
                    justifyContent:
                        'space-between',
                    alignItems: 'center',
                    gap: '20px',
                    flexWrap: 'wrap'
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
                        مستخدمو النظام
                    </h2>

                    <p
                        style={{
                            margin: '5px 0 0',
                            color: '#64748b',
                            fontSize: '12px'
                        }}
                    >
                        إدارة المستخدمين
                        والصلاحيات الخاصة
                        بالنظام
                    </p>
                </div>

                <button
                    type="button"
                    onClick={
                        handleToggleForm
                    }
                    style={{
                        background:
                            showForm
                                ? '#64748b'
                                : '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '10px 18px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 'bold'
                    }}
                >
                    {showForm
                        ? 'إلغاء'
                        : 'إضافة مستخدم جديد'}
                </button>
            </div>

            {/* =========================
                MESSAGES
            ========================= */}

            {error && (
                <div
                    style={{
                        marginBottom: '16px',
                        padding: '11px 16px',
                        borderRadius: '7px',
                        background: '#fee2e2',
                        border:
                            '1px solid #fecaca',
                        color: '#991b1b',
                        fontSize: '13px',
                        fontWeight: '600'
                    }}
                >
                    {error}
                </div>
            )}

            {success && (
                <div
                    style={{
                        marginBottom: '16px',
                        padding: '11px 16px',
                        borderRadius: '7px',
                        background: '#dcfce7',
                        border:
                            '1px solid #bbf7d0',
                        color: '#166534',
                        fontSize: '13px',
                        fontWeight: '600'
                    }}
                >
                    {success}
                </div>
            )}

            {/* =========================
                ADD USER FORM
            ========================= */}

            {showForm && (
                <form
                    onSubmit={handleAddUser}
                    style={{
                        ...cardStyle,
                        padding: '24px',
                        marginBottom: '24px'
                    }}
                >
                    <h3
                        style={{
                            margin: '0 0 20px',
                            fontSize: '15px',
                            color: '#0284c7',
                            borderBottom:
                                '2px solid #f0f9ff',
                            paddingBottom: '10px'
                        }}
                    >
                        إضافة مستخدم جديد
                    </h3>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fit, minmax(240px, 1fr))',
                            gap: '18px'
                        }}
                    >
                        {/* NAME */}

                        <div>
                            <label
                                style={labelStyle}
                            >
                                الاسم
                            </label>

                            <input
                                type="text"
                                name="name"
                                value={
                                    formData.name
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="اسم المستخدم"
                                autoComplete="name"
                                style={inputStyle}
                                required
                            />
                        </div>

                        {/* USERNAME */}

                        <div>
                            <label
                                style={labelStyle}
                            >
                                Username
                            </label>

                            <input
                                type="text"
                                name="username"
                                value={
                                    formData.username
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="username"
                                autoComplete="username"
                                style={{
                                    ...inputStyle,
                                    direction: 'ltr',
                                    textAlign: 'left'
                                }}
                                required
                            />

                            <small
                                style={{
                                    display: 'block',
                                    marginTop: '5px',
                                    color: '#64748b',
                                    fontSize: '10px',
                                    textAlign: 'right'
                                }}
                            >
                                حروف إنجليزية
                                وأرقام و _ - .
                            </small>
                        </div>

                        {/* EMAIL */}

                        <div>
                            <label
                                style={labelStyle}
                            >
                                البريد الإلكتروني
                            </label>

                            <input
                                type="email"
                                name="email"
                                value={
                                    formData.email
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="user@example.com"
                                autoComplete="email"
                                style={{
                                    ...inputStyle,
                                    direction: 'ltr',
                                    textAlign: 'left'
                                }}
                                required
                            />
                        </div>

                        {/* PASSWORD */}

                        <div>
                            <label
                                style={labelStyle}
                            >
                                كلمة المرور
                            </label>

                            <input
                                type="password"
                                name="password"
                                value={
                                    formData.password
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="6 أحرف على الأقل"
                                autoComplete="new-password"
                                minLength="6"
                                style={{
                                    ...inputStyle,
                                    direction: 'ltr',
                                    textAlign: 'left'
                                }}
                                required
                            />
                        </div>

                        {/* ROLE */}

                        <div>
                            <label
                                style={labelStyle}
                            >
                                الصلاحية
                            </label>

                            <select
                                name="role"
                                value={
                                    formData.role
                                }
                                onChange={
                                    handleChange
                                }
                                style={inputStyle}
                            >
                                <option value="admin">
                                    مدير النظام
                                </option>

                                <option value="hr">
                                    الموارد البشرية
                                </option>

                                <option value="manager">
                                    مدير
                                </option>

                                <option value="employee">
                                    موظف
                                </option>
                            </select>
                        </div>

                        {/* EMPLOYEE LINK
                            Only appears for Employee role
                        */}

                        {formData.role ===
                            'employee' && (
                                <div>
                                    <label
                                        style={
                                            labelStyle
                                        }
                                    >
                                        ربط بالموظف
                                    </label>

                                    <select
                                        name="employee_id"
                                        value={
                                            formData.employee_id
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        style={
                                            inputStyle
                                        }
                                        required
                                    >
                                        <option value="">
                                            {employeesLoading
                                                ? 'جاري تحميل الموظفين...'
                                                : 'اختر الموظف'}
                                        </option>

                                        {availableEmployees.map(
                                            (
                                                employee
                                            ) => (
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

                                                    {employee.phone
                                                        ? ` — ${employee.phone}`
                                                        : ''}

                                                    {` — ID: ${employee.id}`}
                                                </option>
                                            )
                                        )}
                                    </select>

                                    {!employeesLoading &&
                                        availableEmployees.length ===
                                        0 && (
                                            <small
                                                style={{
                                                    display:
                                                        'block',
                                                    marginTop:
                                                        '5px',
                                                    color:
                                                        '#64748b',
                                                    fontSize:
                                                        '10px',
                                                    textAlign:
                                                        'right'
                                                }}
                                            >
                                                لا يوجد موظفين
                                                متاحين للربط.
                                            </small>
                                        )}

                                    {!employeesLoading &&
                                        availableEmployees.length >
                                        0 && (
                                            <small
                                                style={{
                                                    display:
                                                        'block',
                                                    marginTop:
                                                        '5px',
                                                    color:
                                                        '#64748b',
                                                    fontSize:
                                                        '10px',
                                                    textAlign:
                                                        'right'
                                                }}
                                            >
                                                اختر الموظف
                                                الفعلي الذي
                                                سيستخدم هذا
                                                الحساب.
                                            </small>
                                        )}
                                </div>
                            )}
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            marginTop: '22px',
                            background: '#0284c7',
                            color: '#ffffff',
                            padding: '11px 24px',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: saving
                                ? 'not-allowed'
                                : 'pointer',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            opacity: saving ? 0.7 : 1
                        }}
                    >
                        {saving
                            ? 'جاري الإضافة...'
                            : 'إضافة المستخدم'}
                    </button>
                </form>
            )}

            {/* =========================
                USERS TABLE
            ========================= */}

            <div
                style={{
                    ...cardStyle,
                    overflow: 'hidden'
                }}
            >
                <div
                    style={{
                        padding: '18px 20px',
                        borderBottom:
                            '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent:
                            'space-between',
                        alignItems: 'center',
                        gap: '15px'
                    }}
                >
                    <h3
                        style={{
                            margin: 0,
                            fontSize: '15px',
                            color: '#1e293b'
                        }}
                    >
                        قائمة مستخدمي النظام
                    </h3>

                    {!loading && (
                        <span
                            style={{
                                background:
                                    '#e0f2fe',
                                color: '#0369a1',
                                padding: '5px 11px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: 'bold'
                            }}
                        >
                            عدد المستخدمين:{' '}
                            {users.length}
                        </span>
                    )}
                </div>

                {loading ? (
                    <div
                        style={{
                            padding: '45px',
                            textAlign: 'center',
                            color: '#64748b',
                            fontSize: '13px'
                        }}
                    >
                        جاري تحميل
                        المستخدمين...
                    </div>
                ) : users.length === 0 ? (
                    <div
                        style={{
                            padding: '45px',
                            textAlign: 'center',
                            color: '#64748b',
                            fontSize: '13px'
                        }}
                    >
                        لا يوجد مستخدمون
                        حاليًا.
                    </div>
                ) : (
                    <div
                        style={{
                            width: '100%',
                            overflowX: 'auto'
                        }}
                    >
                        <table
                            style={{
                                width: '100%',
                                minWidth: '800px',
                                borderCollapse:
                                    'collapse',
                                fontSize: '13px'
                            }}
                        >
                            <thead>
                                <tr
                                    style={{
                                        background:
                                            '#f1f5f9',
                                        color: '#475569'
                                    }}
                                >
                                    <th
                                        style={{
                                            padding:
                                                '12px 14px',
                                            textAlign:
                                                'center',
                                            borderBottom:
                                                '2px solid #e2e8f0'
                                        }}
                                    >
                                        ID
                                    </th>

                                    <th
                                        style={{
                                            padding:
                                                '12px 14px',
                                            textAlign:
                                                'right',
                                            borderBottom:
                                                '2px solid #e2e8f0'
                                        }}
                                    >
                                        الاسم
                                    </th>

                                    <th
                                        style={{
                                            padding:
                                                '12px 14px',
                                            textAlign:
                                                'left',
                                            borderBottom:
                                                '2px solid #e2e8f0'
                                        }}
                                    >
                                        Username
                                    </th>

                                    <th
                                        style={{
                                            padding:
                                                '12px 14px',
                                            textAlign:
                                                'left',
                                            borderBottom:
                                                '2px solid #e2e8f0'
                                        }}
                                    >
                                        Email
                                    </th>

                                    <th
                                        style={{
                                            padding:
                                                '12px 14px',
                                            textAlign:
                                                'center',
                                            borderBottom:
                                                '2px solid #e2e8f0'
                                        }}
                                    >
                                        الصلاحية
                                    </th>

                                    <th
                                        style={{
                                            padding:
                                                '12px 14px',
                                            textAlign:
                                                'center',
                                            borderBottom:
                                                '2px solid #e2e8f0'
                                        }}
                                    >
                                        الموظف
                                    </th>

                                    <th
                                        style={{
                                            padding:
                                                '12px 14px',
                                            textAlign:
                                                'center',
                                            borderBottom:
                                                '2px solid #e2e8f0',
                                            width: '100px'
                                        }}
                                    >
                                        الإجراءات
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {users.map(
                                    (
                                        user,
                                        index
                                    ) => {
                                        const role =
                                            user.role ||
                                            'employee';

                                        const roleStyle =
                                            roleColors[
                                            role
                                            ] ||
                                            roleColors.employee;

                                        const employee =
                                            getEmployeeName(
                                                user.employee_id
                                            );

                                        return (
                                            <tr
                                                key={
                                                    user.id
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
                                                            '12px 14px',
                                                        textAlign:
                                                            'center',
                                                        color:
                                                            '#64748b'
                                                    }}
                                                >
                                                    {
                                                        user.id
                                                    }
                                                </td>

                                                <td
                                                    style={{
                                                        padding:
                                                            '12px 14px',
                                                        color:
                                                            '#1e293b',
                                                        fontWeight:
                                                            '600',
                                                        whiteSpace:
                                                            'nowrap'
                                                    }}
                                                >
                                                    {
                                                        user.name
                                                    }
                                                </td>

                                                <td
                                                    style={{
                                                        padding:
                                                            '12px 14px',
                                                        direction:
                                                            'ltr',
                                                        textAlign:
                                                            'left',
                                                        color:
                                                            '#475569',
                                                        whiteSpace:
                                                            'nowrap'
                                                    }}
                                                >
                                                    {
                                                        user.username ||
                                                        '-'
                                                    }
                                                </td>

                                                <td
                                                    style={{
                                                        padding:
                                                            '12px 14px',
                                                        direction:
                                                            'ltr',
                                                        textAlign:
                                                            'left',
                                                        color:
                                                            '#475569',
                                                        whiteSpace:
                                                            'nowrap'
                                                    }}
                                                >
                                                    {
                                                        user.email
                                                    }
                                                </td>

                                                <td
                                                    style={{
                                                        padding:
                                                            '12px 14px',
                                                        textAlign:
                                                            'center'
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            display:
                                                                'inline-block',
                                                            padding:
                                                                '5px 11px',
                                                            borderRadius:
                                                                '20px',
                                                            background:
                                                                roleStyle.background,
                                                            color:
                                                                roleStyle.color,
                                                            border:
                                                                `1px solid ${roleStyle.border}`,
                                                            fontSize:
                                                                '11px',
                                                            fontWeight:
                                                                'bold',
                                                            whiteSpace:
                                                                'nowrap'
                                                        }}
                                                    >
                                                        {roleLabels[
                                                            role
                                                        ] ||
                                                            role}
                                                    </span>
                                                </td>

                                                {/* EMPLOYEE */}

                                                <td
                                                    style={{
                                                        padding:
                                                            '12px 14px',
                                                        textAlign:
                                                            'center',
                                                        color:
                                                            '#475569'
                                                    }}
                                                >
                                                    {employee ? (
                                                        <div>
                                                            <div
                                                                style={{
                                                                    fontWeight:
                                                                        '600',
                                                                    color:
                                                                        '#1e293b',
                                                                    whiteSpace:
                                                                        'nowrap'
                                                                }}
                                                            >
                                                                {
                                                                    employee.name
                                                                }
                                                            </div>

                                                            <small
                                                                style={{
                                                                    display:
                                                                        'block',
                                                                    marginTop:
                                                                        '3px',
                                                                    color:
                                                                        '#64748b',
                                                                    fontSize:
                                                                        '10px'
                                                                }}
                                                            >
                                                                ID:{' '}
                                                                {
                                                                    employee.id
                                                                }

                                                                {employee.phone
                                                                    ? ` • ${employee.phone}`
                                                                    : ''}
                                                            </small>
                                                        </div>
                                                    ) : (
                                                        <span
                                                            style={{
                                                                color:
                                                                    '#94a3b8',
                                                                fontSize:
                                                                    '11px'
                                                            }}
                                                        >
                                                            غير مرتبط
                                                        </span>
                                                    )}
                                                </td>

                                                <td
                                                    style={{
                                                        padding:
                                                            '12px 14px',
                                                        textAlign:
                                                            'center'
                                                    }}
                                                >
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            deletingId ===
                                                            user.id
                                                        }
                                                        onClick={() =>
                                                            handleDeleteUser(
                                                                user
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
                                                                '6px 12px',
                                                            borderRadius:
                                                                '5px',
                                                            cursor:
                                                                deletingId ===
                                                                    user.id
                                                                    ? 'not-allowed'
                                                                    : 'pointer',
                                                            fontSize:
                                                                '12px',
                                                            fontWeight:
                                                                '600',
                                                            opacity:
                                                                deletingId ===
                                                                    user.id
                                                                    ? 0.6
                                                                    : 1
                                                        }}
                                                    >
                                                        {deletingId ===
                                                            user.id
                                                            ? 'جاري الحذف...'
                                                            : 'حذف'}
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