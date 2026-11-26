import React from 'react';

export default function Landing({ onSelect }) {
  const page = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box', background: 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 55%,#38bdf8 100%)', fontFamily: 'Segoe UI, Tahoma, Arial, sans-serif' };
  const card = { width: '100%', maxWidth: '460px', background: '#fff', borderRadius: '16px', padding: '36px 28px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', textAlign: 'center', boxSizing: 'border-box' };
  const btn = (primary) => ({ display: 'block', width: '100%', padding: '16px 18px', marginTop: '14px', borderRadius: '12px', fontSize: '17px', fontWeight: 700, cursor: 'pointer', border: primary ? 'none' : '2px solid #0284c7', background: primary ? '#0284c7' : '#fff', color: primary ? '#fff' : '#0284c7', boxSizing: 'border-box' });
  return (
    <div style={page}>
      <div style={card}>
        <div style={{ fontSize: '40px' }}>🏢</div>
        <h1 style={{ margin: '8px 0 4px', color: '#0c4a6e', fontSize: '26px' }}>PIONEERS HRMS</h1>
        <p style={{ margin: '0 0 22px', color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>نظام إدارة الموارد البشرية<br />Human Resources Management System</p>
        <button type="button" style={btn(true)} onClick={() => onSelect('admin')}>
          دخول الإدارة<br /><span style={{ fontSize: '13px', fontWeight: 500, opacity: 0.9 }}>Management login</span>
        </button>
        <button type="button" style={btn(false)} onClick={() => onSelect('employee')}>
          دخول الموظفين<br /><span style={{ fontSize: '13px', fontWeight: 500, opacity: 0.8 }}>Employee login / sign up</span>
        </button>
        <p style={{ marginTop: '22px', color: '#94a3b8', fontSize: '12px' }}>الحضور · الرواتب · الموظفون · الإجازات</p>
      </div>
    </div>
  );
}
