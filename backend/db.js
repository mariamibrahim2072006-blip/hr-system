const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hr_system_db',
    charset: 'utf8mb4',
    dateStrings: ['DATE'],
    waitForConnections: true,
    connectionLimit: 5,
    ssl: process.env.DB_SSL === 'false' ? undefined : { minVersion: 'TLSv1.2', rejectUnauthorized: true }
});

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

const tables = [
`CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    manager VARCHAR(255) DEFAULT 'غير محدد',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NULL,
    phone VARCHAR(50) NULL,
    birth_date DATE NULL,
    gender VARCHAR(30) NULL,
    nationality VARCHAR(100) NULL,
    department_id INT NULL,
    contract_date DATE NULL,
    salary DECIMAL(12,2) DEFAULT 0,
    attendance_time VARCHAR(20) NULL,
    departure_time VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'employee',
    employee_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_username (username)
)`,
`CREATE TABLE IF NOT EXISTS settings (
    id INT PRIMARY KEY,
    overtime_rate DECIMAL(6,2) DEFAULT 2,
    deduction_rate DECIMAL(6,2) DEFAULT 2,
    weekly_holiday_1 VARCHAR(20) DEFAULT 'Friday',
    weekly_holiday_2 VARCHAR(20) DEFAULT 'Saturday'
)`,
`CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    admin_name VARCHAR(255) NULL,
    action TEXT NULL,
    ip_address VARCHAR(100) NULL,
    user_agent VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    check_in VARCHAR(20) NULL,
    check_out VARCHAR(20) NULL,
    status VARCHAR(50) NULL,
    overtime_hours DECIMAL(6,2) DEFAULT 0,
    notes TEXT NULL,
    UNIQUE KEY uq_att (employee_id, attendance_date)
)`,
`CREATE TABLE IF NOT EXISTS leaves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NULL,
    employee_name VARCHAR(255) NULL,
    type VARCHAR(100) NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    reason TEXT NULL,
    status VARCHAR(50) DEFAULT 'معلق',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS official_holidays (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    holiday_date DATE NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS loans_deductions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    type VARCHAR(50) NULL,
    value DECIMAL(12,2) DEFAULT 0,
    details TEXT NULL,
    date DATE NULL,
    status VARCHAR(50) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS employee_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    document_type VARCHAR(100) NULL,
    file_name VARCHAR(500) NULL,
    file_path VARCHAR(500) NULL,
    upload_date DATE NULL,
    expiry_date DATE NULL,
    status VARCHAR(50) NULL,
    uploaded_by VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS hourly_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    permission_date DATE NOT NULL,
    hours DECIMAL(5,2) DEFAULT 1,
    reason TEXT NULL,
    status VARCHAR(50) DEFAULT 'معلق',
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS document_files (
    name VARCHAR(255) PRIMARY KEY,
    mime_type VARCHAR(100) NULL,
    data LONGBLOB NULL
)`,
`CREATE TABLE IF NOT EXISTS payroll (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    payroll_month VARCHAR(20) NOT NULL,
    base_salary DECIMAL(12,2) DEFAULT 0,
    present_days INT DEFAULT 0,
    absence_days INT DEFAULT 0,
    overtime_hours DECIMAL(8,2) DEFAULT 0,
    overtime_amount DECIMAL(12,2) DEFAULT 0,
    deduction_amount DECIMAL(12,2) DEFAULT 0,
    net_salary DECIMAL(12,2) DEFAULT 0,
    UNIQUE KEY uq_payroll (employee_id, payroll_month)
)`
];

let ready = null;
function ensureSchema() {
    if (!ready) {
        ready = (async () => {
            await query('SET NAMES utf8mb4');
            for (const sql of tables) await query(sql);
            await query(`INSERT IGNORE INTO settings (id, overtime_rate, deduction_rate, weekly_holiday_1, weekly_holiday_2) VALUES (1, 2, 2, 'Friday', 'Saturday')`);
            const rows = await query('SELECT COUNT(*) AS c FROM users');
            if (Number(rows[0].c) === 0 && process.env.ADMIN_PASSWORD) {
                const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
                await query(
                    'INSERT INTO users (name, username, email, password, role) VALUES (?, ?, ?, ?, ?)',
                    ['System Admin', process.env.ADMIN_USERNAME || 'admin', process.env.ADMIN_EMAIL || 'admin@pioneers.local', hash, 'admin']
                );
            }
        })().catch((e) => { ready = null; throw e; });
    }
    return ready;
}

module.exports = { pool, query, ensureSchema };
