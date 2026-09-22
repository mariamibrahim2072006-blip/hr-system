import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000';

export default function Departments() {
    const [departments, setDepartments] = useState([]);
    const [deptName, setDeptName] = useState('');
    const [managerName, setManagerName] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });

    const getHeaders = () => {
        const token = localStorage.getItem('hr_token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        };
    };

    const loadDepartments = async () => {
        try {
            const response = await fetch(`${API_URL}/api/departments`, {
                headers: getHeaders()
            });
            const data = await response.json().catch(() => ([]));
            if (response.ok) {
                setDepartments(Array.isArray(data) ? data : data.departments || []);
            }
        } catch (error) {
            console.error('LOAD DEPARTMENTS ERROR:', error);
        }
    };

    useEffect(() => {
        loadDepartments();
    }, []);

    const handleAddDepartment = async (e) => {
        e.preventDefault();
        if (!deptName.trim()) {
            setMessage({ text: 'من فضلك أدخل اسم القسم', type: 'error' });
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/departments`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    name: deptName.trim(),
                    manager: managerName.trim() || 'غير محدد'
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || 'حدث خطأ أثناء حفظ القسم');
            }

            setMessage({ text: 'تم إضافة القسم بنجاح', type: 'success' });
            setDeptName('');
            setManagerName('');
            loadDepartments();
        } catch (error) {
            setMessage({ text: error.message || 'تعذر حفظ القسم', type: 'error' });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا القسم؟')) return;

        try {
            const response = await fetch(`${API_URL}/api/departments/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });

            if (!response.ok) {
                throw new Error('حدث خطأ أثناء حذف القسم');
            }

            setDepartments(departments.filter(d => (d.id || d._id) !== id));
            setMessage({ text: 'تم حذف القسم بنجاح', type: 'success' });
        } catch (error) {
            setMessage({ text: error.message || 'تعذر حذف القسم', type: 'error' });
        }
    };

    return (
        <div style={{ padding: '24px', fontFamily: 'Tahoma, Arial, sans-serif', direction: 'rtl', background: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>

            {/* عنوان الصفحة العصري */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>إدارة الأقسام والوظائف</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>إدارة الأقسام الإدارية وتحديد مسؤوليها لربطها بملفات الموظفين</p>
                </div>
                {message.text && (
                    <div style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', background: message.type === 'success' ? '#dcfce7' : '#fee2e2', color: message.type === 'success' ? '#166534' : '#991b1b' }}>
                        {message.text}
                    </div>
                )}
            </div>

            {/* نموذج إضافة قسم جديد */}
            <form onSubmit={handleAddDepartment} style={{ background: '#ffffff', padding: '24px', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <h4 style={{ margin: '0 0 20px 0', fontSize: '15px', color: '#0284c7', borderBottom: '2px solid #f0f9ff', paddingBottom: '10px', fontWeight: 'bold' }}>إضافة قسم جديد</h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <label style={{ display: 'block', textAlign: 'right', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>اسم القسم</label>
                        <input
                            type="text"
                            placeholder="مثال: قسم تقنية المعلومات"
                            value={deptName}
                            onChange={(e) => setDeptName(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontSize: '13px', background: '#f8fafc', boxSizing: 'border-box' }}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', textAlign: 'right', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>مسؤول القسم (اختياري)</label>
                        <input
                            type="text"
                            placeholder="اسم المسؤول"
                            value={managerName}
                            onChange={(e) => setManagerName(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontSize: '13px', background: '#f8fafc', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    style={{ background: '#0284c7', color: '#fff', padding: '12px 32px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                >
                    حفظ القسم
                </button>
            </form>

            {/* جدول عرض الأقسام */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#1e293b', fontWeight: 'bold', textAlign: 'right' }}>الأقسام المسجلة في النظام</h4>

                <div style={{ width: '100%', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9', color: '#475569' }}>
                                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0', textAlign: 'center', width: '60px' }}>ID</th>
                                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0' }}>اسم القسم</th>
                                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0' }}>مسؤول القسم</th>
                                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0', textAlign: 'center', width: '120px' }}>العمليات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {departments.length > 0 ? (
                                departments.map((dept, idx) => (
                                    <tr key={dept.id || dept._id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1e293b' }}>{dept.name}</td>
                                        <td style={{ padding: '12px 16px', color: '#475569' }}>{dept.manager || '—'}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => handleDelete(dept.id || dept._id)}
                                                style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '5px 14px', cursor: 'pointer', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}
                                            >
                                                حذف
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>لا توجد أقسام مسجلة حالياً في قاعدة البيانات</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}