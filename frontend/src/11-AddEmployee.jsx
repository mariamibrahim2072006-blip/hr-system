import React, { useState } from 'react';
import { UserPlus, Save, IdCard, Briefcase, Clock3 } from 'lucide-react';
import { PageHeader, Card, Field, Alert, API_URL } from './ui';

const departmentsList = [
    { id: 1, name: 'قسم تطوير البرمجيات (Software Development)' },
    { id: 2, name: 'قسم الموارد البشرية (HR)' },
    { id: 3, name: 'قسم التسويق والمبيعات' },
];

const normalizeArabicNumbers = (value = '') => {
    return String(value)
        .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
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
    departure_time: '',
};

export default function AddEmployee() {
    const [formData, setFormData] = useState(emptyForm);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [loading, setLoading] = useState(false);

    const getToken = () => localStorage.getItem('hr_token');

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
            setMessage({ text: 'صيغة الوقت غير صحيحة. مثال: 9 أو 930 أو 09:30', type: 'error' });
            return;
        }

        setFormData((prev) => ({ ...prev, [name]: parsed }));
        setMessage({ text: '', type: '' });
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
        if (formData.salary === '' || Number(formData.salary) < 0 || !Number.isFinite(Number(formData.salary))) {
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
                phone,
                birth_date: formData.birth_date || null,
                gender: formData.gender,
                nationality: formData.nationality.trim(),
                department_id: Number(formData.department_id),
                contract_date: formData.contract_date || null,
                salary: Number(formData.salary),
                attendance_time: attendanceTime,
                departure_time: departureTime,
            };

            const response = await fetch(`${API_URL}/api/employees/add`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(employeeData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'حدث خطأ أثناء حفظ بيانات الموظف');
            }

            setMessage({ text: 'تم إضافة الموظف وحفظه في قاعدة البيانات بنجاح', type: 'success' });
            setFormData({ ...emptyForm });
        } catch (error) {
            console.error('Save employee error:', error);
            setMessage({ text: error.message || 'حدث خطأ أثناء حفظ الموظف', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <PageHeader
                icon={UserPlus}
                title="إضافة موظف جديد"
                desc="سجل البيانات الشخصية وبيانات العمل ومواعيد الحضور - كل الحقول المعلّمة بنجمة مطلوبة"
            />

            {message.text && <Alert type={message.type}>{message.text}</Alert>}

            <form onSubmit={handleSubmit}>
                <Card icon={IdCard} title="البيانات الشخصية" desc="اسم الموظف وبيانات التواصل والهوية">
                    <div className="form-grid-3">
                        <Field label="اسم الموظف" required>
                            <input className="input" name="name" value={formData.name} onChange={handleChange} placeholder="الاسم بالكامل" />
                        </Field>
                        <Field label="رقم الموبايل" required hint="11 رقم يبدأ بـ 010 / 011 / 012 / 015">
                            <input className="input ltr" name="phone" value={formData.phone} onChange={handleChange} placeholder="01XXXXXXXXX" inputMode="numeric" />
                        </Field>
                        <Field label="العنوان" required>
                            <input className="input" name="address" value={formData.address} onChange={handleChange} placeholder="محافظة - مدينة - شارع" />
                        </Field>
                        <Field label="تاريخ الميلاد" required>
                            <input className="input" type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} />
                        </Field>
                        <Field label="النوع">
                            <select className="select" name="gender" value={formData.gender} onChange={handleChange}>
                                <option value="ذكر">ذكر</option>
                                <option value="أنثى">أنثى</option>
                            </select>
                        </Field>
                        <Field label="الجنسية" required>
                            <input className="input" name="nationality" value={formData.nationality} onChange={handleChange} placeholder="مثال: مصري" />
                        </Field>
                    </div>
                </Card>

                <Card icon={Briefcase} title="بيانات العمل" desc="القسم وتاريخ التعاقد والراتب الأساسي">
                    <div className="form-grid-3">
                        <Field label="القسم الإداري" required>
                            <select className="select" name="department_id" value={formData.department_id} onChange={handleChange}>
                                <option value="">اختر القسم</option>
                                {departmentsList.map((dept) => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="تاريخ التعاقد" required>
                            <input className="input" type="date" name="contract_date" value={formData.contract_date} onChange={handleChange} />
                        </Field>
                        <Field label="الراتب الأساسي (ج.م)" required>
                            <input className="input ltr" type="number" min="0" name="salary" value={formData.salary} onChange={handleChange} placeholder="0" />
                        </Field>
                    </div>
                </Card>

                <Card icon={Clock3} title="مواعيد العمل" desc="اكتب الوقت بأي صيغة: 9 أو 930 أو 09:30 أو 5م - وسيتم ضبطها تلقائيًا">
                    <div className="form-grid">
                        <Field label="وقت الحضور" required hint="مثال: 09:00 أو 9ص">
                            <input
                                className="input ltr"
                                name="attendance_time"
                                value={formData.attendance_time}
                                onChange={handleChange}
                                onBlur={() => handleTimeBlur('attendance_time')}
                                placeholder="09:00"
                            />
                        </Field>
                        <Field label="وقت الانصراف" required hint="مثال: 17:00 أو 5م">
                            <input
                                className="input ltr"
                                name="departure_time"
                                value={formData.departure_time}
                                onChange={handleChange}
                                onBlur={() => handleTimeBlur('departure_time')}
                                placeholder="17:00"
                            />
                        </Field>
                    </div>
                    <div className="mt">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            <Save size={15} />
                            {loading ? 'جاري الحفظ...' : 'حفظ الموظف في النظام'}
                        </button>
                    </div>
                </Card>
            </form>
        </div>
    );
}
