import React from 'react';
import { Inbox } from 'lucide-react';

/* Shared UI building blocks for PIONEERS HRMS (RTL, Cairo font). */

export function PageHeader({ icon: Icon, title, desc, children }) {
    return (
        <div className="page-head">
            <div className="page-head-text">
                <h2 className="page-title">
                    {Icon && (
                        <span className="page-title-icon">
                            <Icon size={19} strokeWidth={2.3} />
                        </span>
                    )}
                    {title}
                </h2>
                {desc && <p className="page-desc">{desc}</p>}
            </div>
            {children && <div className="page-actions">{children}</div>}
        </div>
    );
}

export function Card({ icon: Icon, title, desc, actions, children, flush = false, style }) {
    return (
        <div className="card" style={style}>
            {(title || actions) && (
                <div className="card-head">
                    <div className="card-head-main">
                        {Icon && (
                            <span className="card-icon">
                                <Icon size={17} strokeWidth={2.3} />
                            </span>
                        )}
                        <div>
                            <h3 className="card-title">{title}</h3>
                            {desc && <p className="card-desc">{desc}</p>}
                        </div>
                    </div>
                    {actions}
                </div>
            )}
            <div className={flush ? 'card-body-flush' : 'card-body'}>{children}</div>
        </div>
    );
}

export function Stat({ icon: Icon, color = 'blue', label, value, sub }) {
    return (
        <div className="stat">
            <div className={`stat-icon ${color}`}>
                {Icon && <Icon size={21} strokeWidth={2.3} />}
            </div>
            <div className="stat-info">
                <div className="stat-label">{label}</div>
                <div className="stat-value">{value}</div>
                {sub && <div className="stat-sub">{sub}</div>}
            </div>
        </div>
    );
}

export function Empty({ icon: Icon = Inbox, title, text, action }) {
    return (
        <div className="empty">
            <div className="empty-icon">
                <Icon size={28} strokeWidth={1.8} />
            </div>
            <h3 className="empty-title">{title}</h3>
            {text && <p className="empty-text">{text}</p>}
            {action}
        </div>
    );
}

export function Loading({ text = 'جاري تحميل البيانات...' }) {
    return (
        <div className="loading-box">
            <span className="spin" />
            {text}
        </div>
    );
}

export function Alert({ type = 'success', children }) {
    return <div className={`alert alert-${type}`}>{children}</div>;
}

export function Badge({ tone = 'gray', children }) {
    return <span className={`badge b-${tone}`}>{children}</span>;
}

export function Field({ label, hint, required, children }) {
    return (
        <div className="field">
            {label && (
                <label className="field-label">
                    {label} {required && <span className="req">*</span>}
                </label>
            )}
            {children}
            {hint && <span className="field-hint">{hint}</span>}
        </div>
    );
}

export function Modal({ open, onClose, title, sub, children, footer, wide = false }) {
    if (!open) return null;
    return (
        <div
            className="modal-veil"
            onClick={(e) => {
                if (e.target === e.currentTarget && onClose) onClose();
            }}
        >
            <div className="modal" style={wide ? { maxWidth: '680px' } : undefined}>
                <div className="modal-head">
                    <div>
                        <h3 className="modal-title">{title}</h3>
                        {sub && <p className="modal-sub">{sub}</p>}
                    </div>
                    {onClose && (
                        <button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق">
                            ✕
                        </button>
                    )}
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-foot">{footer}</div>}
            </div>
        </div>
    );
}

export const getToken = () => localStorage.getItem('hr_token');

export const authHeaders = (json = false) => ({
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

export const API_URL = 'http://localhost:5000';

export const getToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const extractArray = (data, keys = []) => {
    if (Array.isArray(data)) return data;
    for (const key of keys) {
        if (Array.isArray(data?.[key])) return data[key];
    }
    if (Array.isArray(data?.data)) return data.data;
    return [];
};
