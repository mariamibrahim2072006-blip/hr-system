import React, { useState } from 'react';

const API_URL = 'http://localhost:5000';

const departmentsList = [
    { id: 1, name: 'قسم تطوير البرمجيات (Software Development)' },
    { id: 2, name: 'قسم الموارد البشرية (HR)' },
    { id: 3, name: 'قسم التسويق والمبيعات' }
];

const normalizeArabicNumbers = (value = '') => {
    return String(value)
        .replace(/[٠-٩]/g, (digit) =>
            String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))
        )
        .replace(/٫/g, '.');
};

const parseSmartTime = (value) => {
    if (!value) return '';

    let input = normalizeArabicNumbers(value).trim().toLowerCase();
    input = input.replace(/\s+/g, ' ');

    const isPM = input.includes('pm') || input.includes('م') || input.includes('مساء');
    const isAM = input.includes('am') || input.includes('ص') || input.includes('صباح');

    input = input
        .replace(/am|pm/gi, '')
        .replace(/[صم]/g, '')
        .replace(/صباح|مساء/g, '')
        .trim();

    let hours;
    let minutes;

    if (input.includes(':')) {
        const parts = input.split(':');
        hours = Number(parts[0]);
        minutes = Number(parts[1] || 0);
    } else {
        const digits = input.replace(/\D/g, '');
        if (!digits) return '';

        if (digits.length <= 2) {
            hours = Number(digits);
            minutes = 0;
        } else if (digits.length === 3) {
            hours = Number(digits.slice(0, 1));
            minutes = Number(digits.slice(1));
        } else if (digits.length === 4) {
            hours = Number(digits.slice(0, 2));
            minutes = Number(digits.slice(2));
        } else {
            return '';
        }
    }

    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
        return '';
    }

    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    if (hours < 0 || hours > 23) return '';

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const getTimeMinutes = (time) => {
    if (!time) return null;
    const normalized = parseSmartTime(time);
    if (!normalized) return null;

    const [hours, minutes] = normalized.split(':').map(Number);
    return hours * 60 + minutes;
};

const emptyForm = {
    name: '',
    address: '',
    phone: '',
    birth_date: '',
    gender: 'ذكر',
    nationality: '',
    department_id: '',
    contract_date: '',
    salary: '',
    attendance_time: '',
    departure_time: ''
};

export default function AddEmployee() {
    const [formData, setFormData] = useState(emptyForm);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [loading, setLoading] = useState(false);

    const getToken = () => localStorage.getItem('hr_token');

    const getHeaders = (includeJson = false) => {
        const headers = {
            Authorization: `Bearer ${getToken()}`
        };
        if (includeJson) {
            headers['Content-Type'] = 'application/json';
        }
        return headers;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'phone') {
            const cleaned = value.replace(/\D/g, '').slice(0, 11);
            setFormData((prev) => ({ ...prev, phone: cleaned }));
            return;
        }

        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleTimeBlur = (name) => {
        const rawValue = formData[name];
        if (!rawValue) return;

        const parsed = parseSmartTime(rawValue);
        if (!parsed) {
            setMessage({
                text: 'صيغة الوقت غير صحيحة. مثال: 9 أو 930 أو 09:30',
                type: 'error'
            });
            return;
        }

        setFormData((prev) => ({ ...prev, [name]: parsed }));
        setMessage({ text: '', type: '' });
    };

    const resetForm = () => {
        setFormData({ ...emptyForm });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const phone = formData.phone.trim();

        if (!/^(010|011|012|015)\d{8}$/.test(phone)) {
            setMessage({ text: 'من فضلك ادخل رقم موبايل مصري صحيح مكون من 11 رقم', type: 'error' });
            return;
        }

        if (!formData.name.trim()) {
            setMessage({ text: 'من فضلك ادخل اسم الموظف', type: 'error' });
            return;
        }

        if (!formData.address.trim()) {
            setMessage({ text: 'من فضلك ادخل العنوان', type: 'error' });
            return;
        }

        if (!formData.birth_date) {
            setMessage({ text: 'من فضلك اختر تاريخ الميلاد', type: 'error' });
            return;
        }

        if (!formData.nationality.trim()) {
            setMessage({ text: 'من فضلك ادخل الجنسية', type: 'error' });
            return;
        }

        if (!formData.department_id) {
            setMessage({ text: 'من فضلك اختر القسم الإداري', type: 'error' });
            return;
        }

        if (!formData.contract_date) {
            setMessage({ text: 'من فضلك اختر تاريخ التعاقد', type: 'error' });
            return;
        }

        if (
            formData.salary === '' ||
            Number(formData.salary) < 0 ||
            !Number.isFinite(Number(formData.salary))
        ) {
            setMessage({ text: 'من فضلك ادخل راتب صحيح', type: 'error' });
            return;
        }

        const attendanceTime = parseSmartTime(formData.attendance_time);
        const departureTime = parseSmartTime(formData.departure_time);

        if (!attendanceTime || !departureTime) {
            setMessage({ text: 'من فضلك ادخل أوقات حضور وانصراف صحيحة', type: 'error' });
            return;
        }

        if (getTimeMinutes(attendanceTime) === getTimeMinutes(departureTime)) {
            setMessage({ text: 'موعد الانصراف يجب أن يكون مختلفًا عن موعد الحضور', type: 'error' });
            return;
        }

        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            const employeeData = {
                name: formData.name.trim(),
                address: formData.address.trim(),
                phone: phone,
                birth_date: formData.birth_date || null,
                gender: formData.gender,
                nationality: formData.nationality.trim(),
                department_id: Number(formData.department_id),
                contract_date: formData.contract_date || null,
                salary: Number(formData.salary),
                attendance_time: attendanceTime,
                departure_time: departureTime
            };

            const response = await fetch(`${API_URL}/api/employees/add`, {
                method: 'POST',
                headers: getHeaders(true),
                body: JSON.stringify(employeeData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'حدث خطأ أثناء حفظ بيانات الموظف');
            }

            setMessage({
                text: 'تم إضافة الموظف وحفظه في قاعدة البيانات بنجاح',
                type: 'success'
            });

            resetForm();
        } catch (error) {
            console.error('Save employee error:', error);
            setMessage({
                text: error.message || 'حدث خطأ أثناء حفظ الموظف',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '10px 14px',
        textAlign: 'right',
        border: '1px solid #cbd5e1',
        borderRadius: '7px',
        outline: 'none',
        fontSize: '13px',
        background: '#f8fafc',
        boxSizing: 'border-box'
    };

    const labelStyle = {
        display: 'block',
        textAlign: 'right',
        marginBottom: '6px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#334155'
    };

    const fieldWrapperStyle = {
        marginBottom: '16px'
    };

    const cardStyle = {
        background: '#ffffff',
        padding: '24px',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
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
                    alignItems: 'center',
                    gap: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
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
                        إضافة موظف جديد
                    </h2>
                    <p
                        style={{
                            margin: '4px 0 0',
                            fontSize: '12px',
                            color: '#64748b'
                        }}
                    >
                        تسجيل بيانات موظف جديد وتحديد مواعيد العمل والراتب
                    </p>
                </div>

                {message.text && (
                    <div
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            background:
                                message.type === 'success' ? '#dcfce7' : '#fee2e2',
                            color:
                                message.type === 'success' ? '#166534' : '#991b1b'
                        }}
                    >
                        {message.text}
                    </div>
                )}
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns:
                            'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '24px',
                        marginBottom: '24px'
                    }}
                >
                    {/* WORK DATA */}
                    <div style={cardStyle}>
                        <div>
                            <h4
                                style={{
                                    margin: '0 0 20px 0',
                                    fontSize: '15px',
                                    color: '#0284c7',
                                    borderBottom: '2px solid #f0f9ff',
                                    paddingBottom: '10px',
                                    fontWeight: 'bold'
                                }}
                            >
                                بيانات العمل والتعاقد
                            </h4>

                            <div style={fieldWrapperStyle}>
                                <label style={labelStyle}>القسم التابع له</label>
                                <select
                                    name="department_id"
                                    value={formData.department_id}
                                    onChange={handleChange}
                                    style={inputStyle}
                                    required
                                >
                                    <option value="">اختر القسم الإداري</option>
                                    {departmentsList.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={fieldWrapperStyle}>
                                <label style={labelStyle}>تاريخ التعاقد</label>
                                <input
                                    type="date"
                                    name="contract_date"
                                    value={formData.contract_date}
                                    onChange={handleChange}
                                    style={inputStyle}
                                    required
                                />
                            </div>

                            <div style={fieldWrapperStyle}>
                                <label style={labelStyle}>الراتب الأساسي (ج.م)</label>
                                <input
                                    type="number"
                                    name="salary"
                                    min="0"
                                    step="0.01"
                                    placeholder="أدخل الراتب بالجنيه المصري"
                                    value={formData.salary}
                                    onChange={handleChange}
                                    style={inputStyle}
                                    required
                                />
                            </div>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '12px'
                                }}
                            >
                                <div>
                                    <label style={labelStyle}>موعد الحضور</label>
                                    <input
                                        type="text"
                                        name="attendance_time"
                                        inputMode="numeric"
                                        placeholder="مثال: 9 أو 930"
                                        value={formData.attendance_time}
                                        onChange={handleChange}
                                        onBlur={() => handleTimeBlur('attendance_time')}
                                        style={inputStyle}
                                        required
                                    />
                                </div>

                                <div>
                                    <label style={labelStyle}>موعد الانصراف</label>
                                    <input
                                        type="text"
                                        name="departure_time"
                                        inputMode="numeric"
                                        placeholder="مثال: 16 أو 1630"
                                        value={formData.departure_time}
                                        onChange={handleChange}
                                        onBlur={() => handleTimeBlur('departure_time')}
                                        style={inputStyle}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PERSONAL DATA */}
                    <div style={cardStyle}>
                        <div>
                            <h4
                                style={{
                                    margin: '0 0 20px 0',
                                    fontSize: '15px',
                                    color: '#0284c7',
                                    borderBottom: '2px solid #f0f9ff',
                                    paddingBottom: '10px',
                                    fontWeight: 'bold'
                                }}
                            >
                                البيانات الأساسية للموظف
                            </h4>

                            <div style={fieldWrapperStyle}>
                                <label style={labelStyle}>اسم الموظف</label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="اسم الموظف الرباعي"
                                    value={formData.name}
                                    onChange={handleChange}
                                    style={inputStyle}
                                    required
                                />
                            </div>

                            <div style={fieldWrapperStyle}>
                                <label style={labelStyle}>العنوان</label>
                                <input
                                    type="text"
                                    name="address"
                                    placeholder="العنوان بالتفصيل"
                                    value={formData.address}
                                    onChange={handleChange}
                                    style={inputStyle}
                                    required
                                />
                            </div>

                            <div style={fieldWrapperStyle}>
                                <label style={labelStyle}>رقم الهاتف</label>
                                <input
                                    type="text"
                                    name="phone"
                                    inputMode="numeric"
                                    maxLength="11"
                                    placeholder="010xxxxxxxx"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    style={inputStyle}
                                    required
                                />
                            </div>

                            <div style={fieldWrapperStyle}>
                                <label style={labelStyle}>تاريخ الميلاد</label>
                                <input
                                    type="date"
                                    name="birth_date"
                                    value={formData.birth_date}
                                    onChange={handleChange}
                                    style={inputStyle}
                                    required
                                />
                            </div>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '12px'
                                }}
                            >
                                <div>
                                    <label style={labelStyle}>النوع</label>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        style={inputStyle}
                                    >
                                        <option value="ذكر">ذكر</option>
                                        <option value="أنثى">أنثى</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={labelStyle}>الجنسية</label>
                                    <input
                                        type="text"
                                        name="nationality"
                                        placeholder="الجنسية"
                                        value={formData.nationality}
                                        onChange={handleChange}
                                        style={inputStyle}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SUBMIT BUTTON */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            background: '#0284c7',
                            color: '#fff',
                            padding: '12px 32px',
                            border: 'none',
                            borderRadius: '7px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            fontSize: '13px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'جاري الحفظ...' : 'إضافة الموظف'}
                    </button>
                </div>
            </form>
        </div>
    );
}