const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;

const JWT_SECRET =
    process.env.JWT_SECRET ||
    'hr_system_super_secret_change_this';

/* =========================================================
   DATABASE
========================================================= */

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hr_system_db',
    charset: 'utf8mb4'
});

db.connect((err) => {
    if (err) {
        console.error('❌ MySQL connection failed:', err.message);
        return;
    }

    console.log('✅ MySQL connected successfully');

    db.query('SET NAMES utf8mb4', (setErr) => {
        if (setErr) {
            console.error(
                '❌ Failed to set UTF8:',
                setErr.message
            );
        } else {
            console.log('✅ MySQL UTF8MB4 enabled');
        }
    });
});

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

/* =========================================================
   FILE UPLOADS
========================================================= */

const documentsDir = path.join(
    __dirname,
    'uploads',
    'employee-documents'
);

fs.mkdirSync(documentsDir, {
    recursive: true
});

app.use(
    '/uploads',
    express.static(
        path.join(__dirname, 'uploads')
    )
);

const allowedMimeTypes = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const allowedExtensions = new Set([
    '.pdf',
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.doc',
    '.docx'
]);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, documentsDir);
    },

    filename: (req, file, cb) => {
        const extension =
            path.extname(file.originalname).toLowerCase();

        const safeBaseName =
            path
                .basename(
                    file.originalname,
                    extension
                )
                .replace(
                    /[^a-zA-Z0-9\u0600-\u06FF_-]/g,
                    '_'
                )
                .slice(0, 80);

        const uniqueName =
            `${Date.now()}-${Math.round(
                Math.random() * 1e9
            )}-${safeBaseName || 'document'}${extension}`;

        cb(null, uniqueName);
    }
});

const documentUpload = multer({
    storage,

    limits: {
        fileSize: 10 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {
        const extension =
            path.extname(file.originalname).toLowerCase();

        if (
            !allowedMimeTypes.has(file.mimetype) ||
            !allowedExtensions.has(extension)
        ) {
            return cb(
                new Error(
                    'نوع الملف غير مسموح. المسموح: PDF, JPG, PNG, WEBP, DOC, DOCX'
                )
            );
        }

        cb(null, true);
    }
});

/* =========================================================
   AUTH
========================================================= */

function getTokenFromRequest(req) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return null;
    }

    return header.substring(7);
}

function authMiddleware(req, res, next) {
    const token = getTokenFromRequest(req);

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'غير مصرح بالدخول'
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            JWT_SECRET
        );

        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'جلسة الدخول غير صالحة أو انتهت'
        });
    }
}

function adminMiddleware(req, res, next) {
    if (
        !req.user ||
        req.user.role !== 'admin'
    ) {
        return res.status(403).json({
            success: false,
            message: 'صلاحيات Admin مطلوبة'
        });
    }

    next();
}

function isManagerOrAdmin(req, res, next) {
    const allowed = [
        'admin',
        'hr',
        'manager'
    ];

    if (
        !req.user ||
        !allowed.includes(req.user.role)
    ) {
        return res.status(403).json({
            success: false,
            message: 'ليس لديك صلاحية لهذا الإجراء'
        });
    }

    next();
}

function isManagementRole(role) {
    return [
        'admin',
        'hr',
        'manager'
    ].includes(role);
}

async function getCurrentEmployeeId(req) {
    if (!req.user?.id) {
        return null;
    }

    const rows = await query(
        `
        SELECT employee_id
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [req.user.id]
    );

    if (rows.length === 0) {
        return null;
    }

    return rows[0].employee_id
        ? Number(rows[0].employee_id)
        : null;
}

/* =========================================================
   HELPERS
========================================================= */

function formatDate(date) {
    if (!date) {
        return null;
    }

    if (date instanceof Date) {
        return date.toISOString().slice(0, 10);
    }

    return String(date).slice(0, 10);
}

function normalizeDayName(value) {
    if (!value) {
        return '';
    }

    const text =
        String(value)
            .trim()
            .toLowerCase();

    const map = {
        sunday: 'sunday',
        monday: 'monday',
        tuesday: 'tuesday',
        wednesday: 'wednesday',
        thursday: 'thursday',
        friday: 'friday',
        saturday: 'saturday',

        الأحد: 'sunday',
        الاحد: 'sunday',
        الاثنين: 'monday',
        الاتنين: 'monday',
        الثلاثاء: 'tuesday',
        الاربعاء: 'wednesday',
        الأربعاء: 'wednesday',
        الخميس: 'thursday',
        الجمعة: 'friday',
        السبت: 'saturday'
    };

    return map[text] || text;
}

function getDayName(dateString) {
    const date =
        new Date(
            `${dateString}T00:00:00`
        );

    return date
        .toLocaleDateString(
            'en-US',
            {
                weekday: 'long'
            }
        )
        .toLowerCase();
}

function getDaysInRange(
    startDate,
    endDate
) {
    const result = [];

    const current =
        new Date(
            `${startDate}T00:00:00`
        );

    const end =
        new Date(
            `${endDate}T00:00:00`
        );

    while (current <= end) {
        result.push(
            current
                .toISOString()
                .slice(0, 10)
        );

        current.setDate(
            current.getDate() + 1
        );
    }

    return result;
}

async function getSettings() {
    const rows =
        await query(
            'SELECT * FROM settings WHERE id = 1'
        );

    if (rows.length > 0) {
        return rows[0];
    }

    await query(`
        INSERT INTO settings
        (
            id,
            overtime_rate,
            deduction_rate,
            weekly_holiday_1,
            weekly_holiday_2
        )
        VALUES
        (
            1,
            2,
            2,
            'Friday',
            'Saturday'
        )
    `);

    const created =
        await query(
            'SELECT * FROM settings WHERE id = 1'
        );

    return created[0];
}

/* =========================================================
   AUDIT LOG HELPER
========================================================= */

async function createAuditLog(
    req,
    action
) {
    try {
        const forwarded =
            req.headers['x-forwarded-for'];

        const ipAddress =
            forwarded
                ? String(forwarded)
                    .split(',')[0]
                    .trim()
                : (
                    req.socket?.remoteAddress ||
                    req.ip ||
                    null
                );

        const userId =
            req.user?.id
                ? Number(req.user.id)
                : null;

        const adminName =
            req.user?.name ||
            req.user?.username ||
            'System';

        const userAgent =
            req.get('user-agent') || null;

        await query(
            `
            INSERT INTO audit_logs
            (
                user_id,
                admin_name,
                action,
                ip_address,
                user_agent
            )
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                userId,
                adminName,
                String(action).slice(0, 500),
                ipAddress
                    ? String(ipAddress).slice(0, 100)
                    : null,
                userAgent
                    ? String(userAgent).slice(0, 500)
                    : null
            ]
        );
    } catch (error) {
        console.error(
            'AUDIT LOG ERROR:',
            error.message
        );
    }
}

/* =========================================================
   HEALTH
========================================================= */

app.get(
    '/api/health',
    async (req, res) => {
        try {
            await query(
                'SELECT 1 AS ok'
            );

            res.json({
                success: true,
                message:
                    'HR System API is running',
                database: 'connected'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message:
                    'Database connection error',
                error: error.message
            });
        }
    }
);

/* =========================================================
   LOGIN
========================================================= */

app.post(
    '/api/login',
    async (req, res) => {
        try {
            const {
                email,
                username,
                password
            } = req.body;

            const loginValue =
                String(
                    email ||
                    username ||
                    ''
                ).trim();

            if (
                !loginValue ||
                !password
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'أدخل username/email وكلمة المرور'
                });
            }

            const users =
                await query(
                    `
                    SELECT
                        id,
                        name,
                        username,
                        email,
                        password,
                        role,
                        employee_id
                    FROM users
                    WHERE email = ?
                       OR username = ?
                    LIMIT 1
                    `,
                    [
                        loginValue,
                        loginValue
                    ]
                );

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message:
                        'بيانات الدخول غير صحيحة'
                });
            }

            const user = users[0];

            let passwordValid = false;

            try {
                passwordValid =
                    await bcrypt.compare(
                        password,
                        user.password
                    );
            } catch (error) {
                passwordValid = false;
            }

            if (
                !passwordValid &&
                user.password === password
            ) {
                passwordValid = true;

                const hashedPassword =
                    await bcrypt.hash(
                        password,
                        10
                    );

                await query(
                    `
                    UPDATE users
                    SET password = ?
                    WHERE id = ?
                    `,
                    [
                        hashedPassword,
                        user.id
                    ]
                );
            }

            if (!passwordValid) {
                return res.status(401).json({
                    success: false,
                    message:
                        'بيانات الدخول غير صحيحة'
                });
            }

            const safeUser = {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
                employee_id:
                    user.employee_id
                        ? Number(user.employee_id)
                        : null
            };

            const token =
                jwt.sign(
                    safeUser,
                    JWT_SECRET,
                    {
                        expiresIn: '7d'
                    }
                );

            res.json({
                success: true,
                message:
                    'تم تسجيل الدخول بنجاح',
                token,
                user: safeUser
            });

        } catch (error) {
            console.error(
                'LOGIN ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء تسجيل الدخول',
                error: error.message
            });
        }
    }
);

/* =========================================================
   CURRENT USER
========================================================= */

app.get(
    '/api/me',
    authMiddleware,
    async (req, res) => {
        try {
            const users =
                await query(
                    `
                    SELECT
                        id,
                        name,
                        username,
                        email,
                        role,
                        employee_id
                    FROM users
                    WHERE id = ?
                    `,
                    [req.user.id]
                );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        'المستخدم غير موجود'
                });
            }

            const user = {
                ...users[0],
                employee_id:
                    users[0].employee_id
                        ? Number(users[0].employee_id)
                        : null
            };

            res.json({
                success: true,
                user
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'حدث خطأ',
                error: error.message
            });
        }
    }
);

/* =========================================================
   DEPARTMENTS - API & MANAGEMENT (القسم الشغال والجاهز)
========================================================= */

async function initDepartmentsTable() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS departments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                manager VARCHAR(255) DEFAULT 'غير محدد',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const columns = await query(`SHOW COLUMNS FROM departments LIKE 'manager'`);
        if (columns.length === 0) {
            await query(`ALTER TABLE departments ADD COLUMN manager VARCHAR(255) DEFAULT 'غير محدد'`);
        }
    } catch (err) {
        console.error("Error initializing departments table:", err);
    }
}

initDepartmentsTable();

app.get(
    '/api/departments',
    authMiddleware,
    async (req, res) => {
        try {
            const departments = await query(`
                SELECT 
                    d.id,
                    d.name,
                    d.manager,
                    COUNT(e.id) as employee_count
                FROM departments d
                LEFT JOIN employees e ON e.department_id = d.id
                GROUP BY d.id, d.name, d.manager
                ORDER BY d.id DESC
            `);

            res.json({
                success: true,
                departments
            });
        } catch (error) {
            console.error('GET DEPARTMENTS ERROR:', error);
            res.status(500).json({
                success: false,
                message: 'حدث خطأ أثناء جلب الأقسام',
                error: error.message
            });
        }
    }
);

app.post(
    '/api/departments',
    authMiddleware,
    isManagerOrAdmin,
    async (req, res) => {
        try {
            const { name, manager } = req.body;

            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'اسم القسم مطلوب'
                });
            }

            const result = await query(
                `INSERT INTO departments (name, manager) VALUES (?, ?)`,
                [name.trim(), manager ? manager.trim() : 'غير محدد']
            );

            res.status(201).json({
                success: true,
                message: 'تم إضافة القسم بنجاح',
                id: result.insertId
            });
        } catch (error) {
            console.error('ADD DEPARTMENT ERROR:', error);
            res.status(500).json({
                success: false,
                message: 'حدث خطأ أثناء حفظ القسم',
                error: error.message
            });
        }
    }
);

app.delete(
    '/api/departments/:id',
    authMiddleware,
    isManagerOrAdmin,
    async (req, res) => {
        try {
            const deptId = req.params.id;

            const employeesInDept = await query(
                `SELECT id FROM employees WHERE department_id = ?`,
                [deptId]
            );

            if (employeesInDept.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'لا يمكن حذف القسم لوجود موظفين مرتبطين به'
                });
            }

            await query(`DELETE FROM departments WHERE id = ?`, [deptId]);

            res.json({
                success: true,
                message: 'تم حذف القسم بنجاح'
            });
        } catch (error) {
            console.error('DELETE DEPARTMENT ERROR:', error);
            res.status(500).json({
                success: false,
                message: 'حدث خطأ أثناء حذف القسم',
                error: error.message
            });
        }
    }
);

/* =========================================================
   EMPLOYEES - GET
========================================================= */

app.get(
    '/api/employees',
    authMiddleware,
    async (req, res) => {
        try {
            let sql = `
                SELECT
                    e.*,
                    d.name AS department_name
                FROM employees e
                LEFT JOIN departments d
                    ON e.department_id = d.id
            `;

            const params = [];

            if (!isManagementRole(req.user.role)) {
                const employeeId =
                    await getCurrentEmployeeId(req);

                if (!employeeId) {
                    return res.status(403).json({
                        success: false,
                        message:
                            'حساب الموظف غير مرتبط بموظف'
                    });
                }

                sql += `
                    WHERE e.id = ?
                `;

                params.push(employeeId);
            }

            sql += `
                ORDER BY e.id DESC
            `;

            const employees =
                await query(
                    sql,
                    params
                );

            res.json({
                success: true,
                employees
            });

        } catch (error) {
            console.error(
                'GET EMPLOYEES ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء جلب الموظفين',
                error: error.message
            });
        }
    }
);

/* =========================================================
   EMPLOYEES - ADD
========================================================= */

app.post(
    '/api/employees/add',
    authMiddleware,
    isManagerOrAdmin,
    async (req, res) => {
        try {
            const {
                name,
                address,
                phone,
                birth_date,
                gender,
                nationality,
                department_id,
                contract_date,
                salary,
                attendance_time,
                departure_time
            } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message:
                        'اسم الموظف مطلوب'
                });
            }

            const departmentId =
                department_id === '' ||
                    department_id === null ||
                    department_id === undefined
                    ? null
                    : Number(department_id);

            if (
                departmentId !== null &&
                (
                    !Number.isInteger(
                        departmentId
                    ) ||
                    departmentId <= 0
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'القسم غير صحيح'
                });
            }

            if (departmentId !== null) {
                const department =
                    await query(
                        `
                        SELECT id
                        FROM departments
                        WHERE id = ?
                        `,
                        [departmentId]
                    );

                if (
                    department.length === 0
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            'القسم غير موجود'
                    });
                }
            }

            const result =
                await query(
                    `
                    INSERT INTO employees
                    (
                        name,
                        address,
                        phone,
                        birth_date,
                        gender,
                        nationality,
                        department_id,
                        contract_date,
                        salary,
                        attendance_time,
                        departure_time
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `,
                    [
                        name,
                        address || null,
                        phone || null,
                        birth_date || null,
                        gender || null,
                        nationality || null,
                        departmentId,
                        contract_date || null,
                        Number(salary) || 0,
                        attendance_time || null,
                        departure_time || null
                    ]
                );

            await createAuditLog(
                req,
                `إضافة موظف جديد: ${name}`
            );

            res.status(201).json({
                success: true,
                message:
                    'تم إضافة الموظف بنجاح',
                employeeId:
                    result.insertId
            });

        } catch (error) {
            console.error(
                'ADD EMPLOYEE ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء إضافة الموظف',
                error: error.message
            });
        }
    }
);

/* =========================================================
   EMPLOYEES - UPDATE
========================================================= */

app.put(
    '/api/employees/update/:id',
    authMiddleware,
    isManagerOrAdmin,
    async (req, res) => {
        try {
            const { id } =
                req.params;

            const {
                name,
                address,
                phone,
                birth_date,
                gender,
                nationality,
                department_id,
                contract_date,
                salary,
                attendance_time,
                departure_time
            } = req.body;

            const departmentId =
                department_id === '' ||
                    department_id === null ||
                    department_id === undefined
                    ? null
                    : Number(department_id);

            if (
                departmentId !== null &&
                (
                    !Number.isInteger(
                        departmentId
                    ) ||
                    departmentId <= 0
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'القسم غير صحيح'
                });
            }

            if (departmentId !== null) {
                const department =
                    await query(
                        `
                        SELECT id
                        FROM departments
                        WHERE id = ?
                        `,
                        [departmentId]
                    );

                if (
                    department.length === 0
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            'القسم غير موجود'
                    });
                }
            }

            const existing =
                await query(
                    `
                    SELECT id, name
                    FROM employees
                    WHERE id = ?
                    `,
                    [id]
                );

            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        'الموظف غير موجود'
                });
            }

            await query(
                `
                UPDATE employees
                SET
                    name = ?,
                    address = ?,
                    phone = ?,
                    birth_date = ?,
                    gender = ?,
                    nationality = ?,
                    department_id = ?,
                    contract_date = ?,
                    salary = ?,
                    attendance_time = ?,
                    departure_time = ?
                WHERE id = ?
                `,
                [
                    name,
                    address || null,
                    phone || null,
                    birth_date || null,
                    gender || null,
                    nationality || null,
                    departmentId,
                    contract_date || null,
                    Number(salary) || 0,
                    attendance_time || null,
                    departure_time || null,
                    id
                ]
            );

            await createAuditLog(
                req,
                `تعديل بيانات الموظف: ${name || existing[0].name}`
            );

            res.json({
                success: true,
                message:
                    'تم تحديث بيانات الموظف'
            });

        } catch (error) {
            console.error(
                'UPDATE EMPLOYEE ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء تحديث الموظف',
                error: error.message
            });
        }
    }
);

/* =========================================================
   EMPLOYEES - DELETE
========================================================= */

app.delete(
    '/api/employees/delete/:id',
    authMiddleware,
    isManagerOrAdmin,
    async (req, res) => {
        try {
            const employee =
                await query(
                    `
                    SELECT name
                    FROM employees
                    WHERE id = ?
                    `,
                    [req.params.id]
                );

            if (employee.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        'الموظف غير موجود'
                });
            }

            await query(
                `
                DELETE FROM employees
                WHERE id = ?
                `,
                [req.params.id]
            );

            await createAuditLog(
                req,
                `حذف الموظف: ${employee[0].name}`
            );

            res.json({
                success: true,
                message:
                    'تم حذف الموظف'
            });

        } catch (error) {
            console.error(
                'DELETE EMPLOYEE ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء حذف الموظف',
                error: error.message
            });
        }
    }
);

/* =========================================================
   SETTINGS - GET
========================================================= */

app.get(
    '/api/settings',
    authMiddleware,
    isManagerOrAdmin,
    async (req, res) => {
        try {
            const settings =
                await getSettings();

            res.json({
                success: true,
                settings
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء جلب الإعدادات',
                error: error.message
            });
        }
    }
);

/* =========================================================
   SETTINGS - UPDATE
========================================================= */

app.post(
    '/api/settings/update',
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const {
                overtime_rate,
                deduction_rate,
                weekly_holiday_1,
                weekly_holiday_2
            } = req.body;

            await query(
                `
                UPDATE settings
                SET
                    overtime_rate = ?,
                    deduction_rate = ?,
                    weekly_holiday_1 = ?,
                    weekly_holiday_2 = ?
                WHERE id = 1
                `,
                [
                    Number(overtime_rate) || 0,
                    Number(deduction_rate) || 0,
                    weekly_holiday_1 ||
                    'Friday',
                    weekly_holiday_2 ||
                    'Saturday'
                ]
            );

            await createAuditLog(
                req,
                'تعديل إعدادات الرواتب والحضور'
            );

            res.json({
                success: true,
                message:
                    'تم تحديث الإعدادات'
            });

        } catch (error) {
            console.error(
                'SETTINGS ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء تحديث الإعدادات',
                error: error.message
            });
        }
    }
);

/* =========================================================
   USERS - GET
========================================================= */

app.get(
    '/api/users',
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const users =
                await query(`
                    SELECT
                        id,
                        name,
                        username,
                        email,
                        role,
                        employee_id
                    FROM users
                    ORDER BY id DESC
                `);

            res.json({
                success: true,
                users
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء جلب المستخدمين',
                error: error.message
            });
        }
    }
);

/* =========================================================
   USERS - ADD
========================================================= */

app.post(
    '/api/users/add',
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const {
                name,
                username,
                email,
                password,
                role,
                employee_id
            } = req.body;

            if (
                !name ||
                !email ||
                !password
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'الاسم والإيميل والباسورد مطلوبين'
                });
            }

            const allowedRoles = [
                'admin',
                'hr',
                'manager',
                'employee'
            ];

            const finalRole =
                role || 'employee';

            if (
                !allowedRoles.includes(
                    finalRole
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'نوع المستخدم غير صحيح'
                });
            }

            let employeeId = null;

            if (
                employee_id !== undefined &&
                employee_id !== null &&
                employee_id !== ''
            ) {
                employeeId =
                    Number(employee_id);

                if (
                    !Number.isInteger(
                        employeeId
                    ) ||
                    employeeId <= 0
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            'رقم الموظف غير صحيح'
                    });
                }

                const employee =
                    await query(
                        `
                        SELECT id
                        FROM employees
                        WHERE id = ?
                        LIMIT 1
                        `,
                        [employeeId]
                    );

                if (
                    employee.length === 0
                ) {
                    return res.status(404).json({
                        success: false,
                        message:
                            'الموظف المرتبط بالحساب غير موجود'
                    });
                }
            }

            if (
                finalRole === 'employee' &&
                !employeeId
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'يجب ربط حساب Employee بموظف'
                });
            }

            if (employeeId) {
                const existingLink =
                    await query(
                        `
                        SELECT id
                        FROM users
                        WHERE employee_id = ?
                        LIMIT 1
                        `,
                        [employeeId]
                    );

                if (
                    existingLink.length > 0
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            'هذا الموظف مرتبط بالفعل بحساب مستخدم'
                    });
                }
            }

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );

            const result =
                await query(
                    `
                    INSERT INTO users
                    (
                        name,
                        username,
                        email,
                        password,
                        role,
                        employee_id
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    `,
                    [
                        name,
                        username || null,
                        email,
                        hashedPassword,
                        finalRole,
                        employeeId
                    ]
                );

            await createAuditLog(
                req,
                `إنشاء مستخدم جديد: ${name}`
            );

            res.status(201).json({
                success: true,
                message:
                    'تم إنشاء المستخدم',
                userId:
                    result.insertId
            });

        } catch (error) {
            console.error(
                'ADD USER ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء إنشاء المستخدم',
                error: error.message
            });
        }
    }
);

/* =========================================================
   USERS - DELETE
========================================================= */

app.delete(
    '/api/users/delete/:id',
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            if (
                Number(req.params.id) ===
                Number(req.user.id)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'لا يمكنك حذف حسابك الحالي'
                });
            }

            const user =
                await query(
                    `
                    SELECT
                        name
                    FROM users
                    WHERE id = ?
                    `,
                    [req.params.id]
                );

            if (user.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        'المستخدم غير موجود'
                });
            }

            await query(
                `
                DELETE FROM users
                WHERE id = ?
                `,
                [req.params.id]
            );

            await createAuditLog(
                req,
                `حذف المستخدم: ${user[0].name}`
            );

            res.json({
                success: true,
                message:
                    'تم حذف المستخدم'
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء حذف المستخدم',
                error: error.message
            });
        }
    }
);

/* =========================================================
   DASHBOARD STATS
========================================================= */

app.get(
    '/api/dashboard/stats',
    authMiddleware,
    async (req, res) => {
        try {
            const today =
                new Date()
                    .toISOString()
                    .slice(0, 10);

            if (
                isManagementRole(
                    req.user.role
                )
            ) {
                const settings =
                    await getSettings();

                const employeeResult =
                    await query(`
                        SELECT COUNT(*) AS count
                        FROM employees
                    `);

                const pendingLeavesResult =
                    await query(`
                        SELECT COUNT(*) AS count
                        FROM leaves
                        WHERE status = 'معلق'
                    `);

                const presentResult =
                    await query(
                        `
                        SELECT
                            COUNT(DISTINCT employee_id)
                            AS count
                        FROM attendance
                        WHERE attendance_date = ?
                        AND status LIKE 'حاضر%'
                        `,
                        [today]
                    );

                const payrollResult =
                    await query(`
                        SELECT COUNT(*) AS count
                        FROM employees
                        WHERE salary > 0
                    `);

                const stats = {
                    employees:
                        Number(
                            employeeResult[0].count
                        ) || 0,

                    presentToday:
                        Number(
                            presentResult[0].count
                        ) || 0,

                    pendingLeaves:
                        Number(
                            pendingLeavesResult[0].count
                        ) || 0,

                    payrollRecords:
                        Number(
                            payrollResult[0].count
                        ) || 0
                };

                return res.json({
                    success: true,
                    stats,
                    date: today,
                    settings
                });
            }

            const employeeId =
                await getCurrentEmployeeId(req);

            if (!employeeId) {
                return res.status(403).json({
                    success: false,
                    message:
                        'حساب الموظف غير مرتبط بموظف'
                });
            }

            const presentResult =
                await query(
                    `
                    SELECT COUNT(*) AS count
                    FROM attendance
                    WHERE employee_id = ?
                    AND attendance_date = ?
                    AND status LIKE 'حاضر%'
                    `,
                    [
                        employeeId,
                        today
                    ]
                );

            const pendingLeavesResult =
                await query(
                    `
                    SELECT COUNT(*) AS count
                    FROM leaves
                    WHERE employee_id = ?
                    AND status = 'معلق'
                    `,
                    [employeeId]
                );

            const payrollResult =
                await query(
                    `
                    SELECT COUNT(*) AS count
                    FROM payroll
                    WHERE employee_id = ?
                    `,
                    [employeeId]
                );

            res.json({
                success: true,

                stats: {
                    employees: 1,

                    presentToday:
                        Number(
                            presentResult[0].count
                        ) || 0,

                    pendingLeaves:
                        Number(
                            pendingLeavesResult[0].count
                        ) || 0,

                    payrollRecords:
                        Number(
                            payrollResult[0].count
                        ) || 0
                },

                date: today
            });

        } catch (error) {
            console.error(
                'DASHBOARD STATS ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء جلب إحصائيات Dashboard',
                error: error.message
            });
        }
    }
);

/* =========================================================
   ATTENDANCE - GET
========================================================= */

app.get(
    '/api/attendance',
    authMiddleware,
    async (req, res) => {
        try {
            const date =
                req.query.date ||
                new Date()
                    .toISOString()
                    .slice(0, 10);

            const settings =
                await getSettings();

            const weeklyDays = [
                normalizeDayName(
                    settings.weekly_holiday_1
                ),
                normalizeDayName(
                    settings.weekly_holiday_2
                )
            ];

            const dayName =
                getDayName(date);

            const officialHoliday =
                await query(
                    `
                    SELECT *
                    FROM official_holidays
                    WHERE holiday_date = ?
                    LIMIT 1
                    `,
                    [date]
                );

            let approvedLeavesSql = `
                SELECT
                    employee_id,
                    employee_name
                FROM leaves
                WHERE status = 'مقبول'
                AND start_date <= ?
                AND end_date >= ?
            `;

            const approvedLeavesParams = [
                date,
                date
            ];

            if (!isManagementRole(req.user.role)) {
                const currentEmployeeId =
                    await getCurrentEmployeeId(req);

                if (!currentEmployeeId) {
                    return res.status(403).json({
                        success: false,
                        message:
                            'حساب الموظف غير مرتبط بموظف'
                    });
                }

                approvedLeavesSql += `
                    AND employee_id = ?
                `;

                approvedLeavesParams.push(
                    currentEmployeeId
                );
            }

            const approvedLeaves =
                await query(
                    approvedLeavesSql,
                    approvedLeavesParams
                );

            const leaveMap =
                new Map();

            approvedLeaves.forEach(
                (leave) => {
                    if (leave.employee_id) {
                        leaveMap.set(
                            Number(
                                leave.employee_id
                            ),
                            true
                        );
                    }
                }
            );

            let attendanceSql = `
                SELECT
                    e.id AS employee_id,
                    e.name AS employee_name,
                    e.attendance_time,
                    e.departure_time,
                    d.name AS department_name,

                    a.id,
                    a.attendance_date,
                    a.check_in,
                    a.check_out,
                    a.status,
                    a.overtime_hours,
                    a.notes

                FROM employees e

                LEFT JOIN departments d
                    ON e.department_id = d.id

                LEFT JOIN attendance a
                    ON e.id = a.employee_id
                    AND a.attendance_date = ?
            `;

            const attendanceParams = [date];

            if (!isManagementRole(req.user.role)) {
                const currentEmployeeId =
                    await getCurrentEmployeeId(req);

                if (!currentEmployeeId) {
                    return res.status(403).json({
                        success: false,
                        message:
                            'حساب الموظف غير مرتبط بموظف'
                    });
                }

                attendanceSql += `
                    WHERE e.id = ?
                `;

                attendanceParams.push(
                    currentEmployeeId
                );
            }

            attendanceSql += `
                ORDER BY e.id ASC
            `;

            const rows =
                await query(
                    attendanceSql,
                    attendanceParams
                );

            const attendanceList =
                rows.map((row) => {
                    let status =
                        row.status;

                    const checkIn =
                        row.check_in;

                    const checkOut =
                        row.check_out;

                    if (!status) {
                        if (
                            weeklyDays.includes(
                                dayName
                            )
                        ) {
                            status =
                                'عطلة أسبوعية';
                        } else if (
                            officialHoliday.length > 0
                        ) {
                            status =
                                'إجازة رسمية';
                        } else if (
                            leaveMap.has(
                                Number(
                                    row.employee_id
                                )
                            )
                        ) {
                            status =
                                'إجازة';
                        } else {
                            status =
                                'غائب';
                        }
                    }

                    return {
                        id:
                            row.id ||
                            row.employee_id,

                        employee_id:
                            row.employee_id,

                        employeeName:
                            row.employee_name,

                        department:
                            row.department_name ||
                            '-',

                        date,

                        checkIn:
                            checkIn || '-',

                        checkOut:
                            checkOut || '-',

                        status,

                        overtime_hours:
                            Number(
                                row.overtime_hours
                            ) || 0,

                        notes:
                            row.notes || '',

                        attendance_time:
                            row.attendance_time,

                        departure_time:
                            row.departure_time
                    };
                });

            const presentCount =
                attendanceList.filter(
                    (item) =>
                        String(
                            item.status
                        ).startsWith('حاضر')
                ).length;

            const absentCount =
                attendanceList.filter(
                    (item) =>
                        item.status ===
                        'غائب'
                ).length;

            res.json({
                success: true,
                date,
                attendance:
                    attendanceList,

                summary: {
                    present:
                        presentCount,

                    absent:
                        absentCount,

                    total:
                        attendanceList.length
                }
            });

        } catch (error) {
            console.error(
                'GET ATTENDANCE ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء جلب الحضور',
                error: error.message
            });
        }
    }
);

/* =========================================================
   ATTENDANCE - UPSERT
========================================================= */

app.put(
    '/api/attendance/:employeeId',
    authMiddleware,
    isManagerOrAdmin,
    async (req, res) => {
        try {
            const employeeId =
                Number(
                    req.params.employeeId
                );

            const {
                attendance_date,
                check_in,
                check_out,
                status,
                overtime_hours,
                notes
            } = req.body;

            if (
                !Number.isInteger(
                    employeeId
                ) ||
                employeeId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'رقم الموظف غير صحيح'
                });
            }

            const date =
                String(
                    attendance_date || ''
                ).trim();

            if (
                !/^\d{4}-\d{2}-\d{2}$/.test(
                    date
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'تاريخ الحضور غير صحيح'
                });
            }

            const employee =
                await query(
                    `
                    SELECT
                        id,
                        name
                    FROM employees
                    WHERE id = ?
                    `,
                    [employeeId]
                );

            if (employee.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        'الموظف غير موجود'
                });
            }

            const checkIn =
                String(
                    check_in || ''
                ).trim() || null;

            const checkOut =
                String(
                    check_out || ''
                ).trim() || null;

            const cleanNotes =
                String(
                    notes || ''
                ).trim() || null;

            const overtime =
                Number(
                    overtime_hours
                );

            const overtimeHours =
                Number.isFinite(
                    overtime
                ) &&
                    overtime >= 0
                    ? overtime
                    : 0;

            const allowedStatuses = [
                'حاضر',
                'غائب',
                'متأخر',
                'مغادرة مبكرة',
                'إجازة',
                'إجازة رسمية',
                'عطلة أسبوعية',
                'معلق'
            ];

            let attendanceStatus =
                String(
                    status || ''
                ).trim();

            if (
                !attendanceStatus ||
                !allowedStatuses.includes(
                    attendanceStatus
                )
            ) {
                attendanceStatus =
                    checkIn
                        ? 'حاضر'
                        : 'غائب';
            }

            await query(
                `
                INSERT INTO attendance
                (
                    employee_id,
                    attendance_date,
                    check_in,
                    check_out,
                    status,
                    overtime_hours,
                    notes
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)

                ON DUPLICATE KEY UPDATE
                    check_in =
                        VALUES(check_in),

                    check_out =
                        VALUES(check_out),

                    status =
                        VALUES(status),

                    overtime_hours =
                        VALUES(overtime_hours),

                    notes =
                        VALUES(notes)
                `,
                [
                    employeeId,
                    date,
                    checkIn,
                    checkOut,
                    attendanceStatus,
                    overtimeHours,
                    cleanNotes
                ]
            );

            await createAuditLog(
                req,
                `تحديث حضور الموظف ${employee[0].name} بتاريخ ${date}: ${attendanceStatus}`
            );

            res.json({
                success: true,
                message:
                    'تم تحديث الحضور بنجاح',

                attendance: {
                    employee_id:
                        employeeId,

                    attendance_date:
                        date,

                    check_in:
                        checkIn,

                    check_out:
                        checkOut,

                    status:
                        attendanceStatus,

                    overtime_hours:
                        overtimeHours,

                    notes:
                        cleanNotes
                }
            });

        } catch (error) {
            console.error(
                'UPSERT ATTENDANCE ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء تحديث الحضور',
                error: error.message
            });
        }
    }
);

/* =========================================================
   LEAVES - GET
========================================================= */

app.get(
    '/api/leaves',
    authMiddleware,
    async (req, res) => {
        try {
            let sql = `
                SELECT
                    id,
                    employee_id,
                    employee_name AS employeeName,
                    type,
                    start_date AS startDate,
                    end_date AS endDate,
                    reason,
                    status,
                    created_at
                FROM leaves
            `;

            const params = [];

            if (!isManagementRole(req.user.role)) {
                const employeeId =
                    await getCurrentEmployeeId(req);

                if (!employeeId) {
                    return res.status(403).json({
                        success: false,
                        message:
                            'حساب الموظف غير مرتبط بموظف'
                    });
                }

                sql += `
                    WHERE employee_id = ?
                `;

                params.push(employeeId);
            }

            sql += `
                ORDER BY id DESC
            `;

            const leaves =
                await query(
                    sql,
                    params
                );

            res.json({
                success: true,
                leaves
            });

        } catch (error) {
            console.error(
                'GET LEAVES ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء جلب الإجازات',
                error: error.message
            });
        }
    }
);

/* =========================================================
   LEAVES - ADD
========================================================= */

app.post(
    '/api/leaves',
    authMiddleware,
    async (req, res) => {
        try {
            const {
                employee_id,
                employeeName,
                type,
                startDate,
                endDate,
                reason,
                status
            } = req.body;

            if (
                !startDate ||
                !endDate
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'تاريخ البداية والنهاية مطلوبين'
                });
            }

            let employeeId;
            let finalEmployeeName;
            let finalStatus;

            if (!isManagementRole(req.user.role)) {
                employeeId =
                    await getCurrentEmployeeId(req);

                if (!employeeId) {
                    return res.status(403).json({
                        success: false,
                        message:
                            'حساب الموظف غير مرتبط بموظف'
                    });
                }

                const employee =
                    await query(
                        `
                        SELECT
                            id,
                            name
                        FROM employees
                        WHERE id = ?
                        LIMIT 1
                        `,
                        [employeeId]
                    );

                if (employee.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message:
                            'الموظف غير موجود'
                    });
                }

                finalEmployeeName =
                    employee[0].name;

                finalStatus = 'معلق';
            } else {
                if (!employeeName) {
                    return res.status(400).json({
                        success: false,
                        message:
                            'اسم الموظف مطلوب'
                    });
                }

                employeeId =
                    employee_id || null;

                if (!employeeId) {
                    const employee =
                        await query(
                            `
                            SELECT id
                            FROM employees
                            WHERE name = ?
                            LIMIT 1
                            `,
                            [employeeName]
                        );

                    if (
                        employee.length > 0
                    ) {
                        employeeId =
                            employee[0].id;
                    }
                }

                if (employeeId) {
                    const employee =
                        await query(
                            `
                            SELECT
                                id,
                                name
                            FROM employees
                            WHERE id = ?
                            `,
                            [employeeId]
                        );

                    if (
                        employee.length === 0
                    ) {
                        return res.status(404).json({
                            success: false,
                            message:
                                'الموظف غير موجود'
                        });
                    }

                    finalEmployeeName =
                        employee[0].name;
                } else {
                    finalEmployeeName =
                        employeeName;
                }

                finalStatus =
                    status || 'معلق';
            }

            const allowedStatuses = [
                'معلق',
                'مقبول',
                'مرفوض'
            ];

            if (
                !allowedStatuses.includes(
                    finalStatus
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'حالة الإجازة غير صحيحة'
                });
            }

            const result =
                await query(
                    `
                    INSERT INTO leaves
                    (
                        employee_id,
                        employee_name,
                        type,
                        start_date,
                        end_date,
                        reason,
                        status
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    `,
                    [
                        employeeId || null,
                        finalEmployeeName,
                        type ||
                        'إجازة سنوية',
                        startDate,
                        endDate,
                        reason || null,
                        finalStatus
                    ]
                );

            await createAuditLog(
                req,
                `إضافة طلب إجازة للموظف ${finalEmployeeName}`
            );

            res.status(201).json({
                success: true,
                message:
                    'تم إضافة طلب الإجازة',
                id:
                    result.insertId
            });

        } catch (error) {
            console.error(
                'ADD LEAVE ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء إضافة الإجازة',
                error: error.message
            });
        }
    }
);

/* =========================================================
   LEAVES - UPDATE STATUS
========================================================= */

app.put(
    '/api/leaves/:id/status',
    authMiddleware,
    isManagerOrAdmin,
    async (req, res) => {
        try {
            const { status } =
                req.body;

            const allowedStatuses = [
                'معلق',
                'مقبول',
                'مرفوض'
            ];

            if (
                !allowedStatuses.includes(
                    status
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'حالة الإجازة غير صحيحة'
                });
            }

            const leave =
                await query(
                    `
                    SELECT
                        id,
                        employee_name
                    FROM leaves
                    WHERE id = ?
                    `,
                    [req.params.id]
                );

            if (leave.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        'طلب الإجازة غير موجود'
                });
            }

            await query(
                `
                UPDATE leaves
                SET status = ?
                WHERE id = ?
                `,
                [
                    status,
                    req.params.id
                ]
            );

            await createAuditLog(
                req,
                `تحديث حالة إجازة ${leave[0].employee_name} إلى ${status}`
            );

            res.json({
                success: true,
                message:
                    'تم تحديث حالة الإجازة'
            });

        } catch (error) {
            console.error(
                'UPDATE LEAVE ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء تحديث الإجازة',
                error: error.message
            });
        }
    }
);

/* =========================================================
   LEAVES - DELETE
========================================================= */

app.delete(
    '/api/leaves/:id',
    authMiddleware,
    async (req, res) => {
        try {
            const leave =
                await query(
                    `
                    SELECT
                        id,
                        employee_id,
                        employee_name,
                        status
                    FROM leaves
                    WHERE id = ?
                    `,
                    [req.params.id]
                );

            if (leave.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        'طلب الإجازة غير موجود'
                });
            }

            if (!isManagementRole(req.user.role)) {
                const currentEmployeeId =
                    await getCurrentEmployeeId(req);

                if (!currentEmployeeId) {
                    return res.status(403).json({
                        success: false,
                        message:
                            'حساب الموظف غير مرتبط بموظف'
                    });
                }

                if (
                    Number(
                        leave[0].employee_id
                    ) !==
                    Number(
                        currentEmployeeId
                    )
                ) {
                    return res.status(403).json({
                        success: false,
                        message:
                            'لا يمكنك حذف طلب موظف آخر'
                    });
                }

                if (
                    leave[0].status !==
                    'معلق'
                ) {
                    return res.status(403).json({
                        success: false,
                        message:
                            'لا يمكن حذف طلب الإجازة بعد مراجعته'
                    });
                }
            }

            await query(
                `
                DELETE FROM leaves
                WHERE id = ?
                `,
                [req.params.id]
            );

            await createAuditLog(
                req,
                `حذف طلب إجازة الموظف ${leave[0].employee_name}`
            );

            res.json({
                success: true,
                message:
                    'تم حذف الإجازة'
            });

        } catch (error) {
            console.error(
                'DELETE LEAVE ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء حذف الإجازة',
                error: error.message
            });
        }
    }
);

/* =========================================================
   OFFICIAL HOLIDAYS - GET
========================================================= */

app.get(
    '/api/official-holidays',
    authMiddleware,
    async (req, res) => {
        try {
            const holidays =
                await query(`
                    SELECT
                        id,
                        name,
                        holiday_date AS date
                    FROM official_holidays
                    ORDER BY holiday_date ASC
                `);

            res.json({
                success: true,
                holidays
            });

        } catch (error) {
            console.error(
                'GET HOLIDAYS ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء جلب العطلات الرسمية',
                error: error.message
            });
        }
    }
);

/* =========================================================
   OFFICIAL HOLIDAYS - ADD
========================================================= */

app.post(
    '/api/official-holidays',
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const {
                name,
                date,
                holiday_date
            } = req.body;

            const finalDate =
                date || holiday_date;

            if (
                !name ||
                !finalDate
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'اسم العطلة والتاريخ مطلوبان'
                });
            }

            const result =
                await query(
                    `
                    INSERT INTO official_holidays
                    (
                        name,
                        holiday_date
                    )
                    VALUES (?, ?)
                    `,
                    [
                        name,
                        finalDate
                    ]
                );

            await createAuditLog(
                req,
                `إضافة عطلة رسمية: ${name} بتاريخ ${finalDate}`
            );

            res.status(201).json({
                success: true,
                message:
                    'تم إضافة العطلة الرسمية',
                id:
                    result.insertId
            });

        } catch (error) {
            console.error(
                'ADD HOLIDAY ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء إضافة العطلة الرسمية',
                error: error.message
            });
        }
    }
);

/* =========================================================
   OFFICIAL HOLIDAYS - DELETE
========================================================= */

app.delete(
    '/api/official-holidays/:id',
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const holiday =
                await query(
                    `
                    SELECT
                        id,
                        name
                    FROM official_holidays
                    WHERE id = ?
                    `,
                    [req.params.id]
                );

            if (holiday.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        'العطلة غير موجودة'
                });
            }

            await query(
                `
                DELETE FROM official_holidays
                WHERE id = ?
                `,
                [req.params.id]
            );

            await createAuditLog(
                req,
                `حذف العطلة الرسمية: ${holiday[0].name}`
            );

            res.json({
                success: true,
                message:
                    'تم حذف العطلة الرسمية'
            });

        } catch (error) {
            console.error(
                'DELETE HOLIDAY ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء حذف العطلة الرسمية',
                error: error.message
            });
        }
    }
);

/* =========================================================
   LOANS & DEDUCTIONS - GET
========================================================= */

app.get(
    '/api/loans-deductions',
    authMiddleware,
    async (req, res) => {
        try {
            let sql = `
                SELECT
                    ld.id,
                    ld.employee_id,
                    e.name AS employeeName,
                    ld.type,
                    ld.value,
                    ld.details,
                    ld.date,
                    ld.status,
                    ld.notes
                FROM loans_deductions ld
                LEFT JOIN employees e
                    ON ld.employee_id = e.id
            `;

            const params = [];

            if (!isManagementRole(req.user.role)) {
                const employeeId =
                    await getCurrentEmployeeId(req);

                if (!employeeId) {
                    return res.status(403).json({
                        success: false,
                        message:
                            'حساب الموظف غير مرتبط بموظف'
                    });
                }

                sql += `
                    WHERE ld.employee_id = ?
                `;

                params.push(employeeId);
            }

            sql += `
                ORDER BY ld.id DESC
            `;

            const records =
                await query(
                    sql,
                    params
                );

            res.json({
                success: true,
                records
            });

        } catch (error) {
            console.error(
                'GET LOANS & DEDUCTIONS ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء جلب المعاملات المالية',
                error: error.message
            });
        }
    }
);

/* =========================================================
   LOANS & DEDUCTIONS - ADD
========================================================= */

app.post(
    '/api/loans-deductions',
    authMiddleware,
    isManagerOrAdmin,
    async (req, res) => {
        try {
            const {
                employee_id,
                type,
                value,
                details,
                date,
                status,
                notes
            } = req.body;

            if (
                !employee_id ||
                !type ||
                value === undefined ||
                value === null ||
                value === '' ||
                !date
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'الموظف ونوع المعاملة والقيمة والتاريخ مطلوبين'
                });
            }

            const employee =
                await query(
                    `
                    SELECT
                        id,
                        name,
                        salary
                    FROM employees
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [employee_id]
                );

            if (employee.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        'الموظف غير موجود'
                });
            }

            let numericValue = Number(value);

            if (
                !Number.isFinite(
                    numericValue
                ) ||
                numericValue < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'قيمة المعاملة غير صحيحة'
                });
            }

            if (type === 'خصم ساعات' || type === 'إضافة ساعات') {
                const baseSalary = Number(employee[0].salary || 0);
                const hourRate = baseSalary / 30 / 8;
                if (numericValue <= 24) {
                    numericValue = numericValue * hourRate;
                }
            }

            const result =
                await query(
                    `
                    INSERT INTO loans_deductions
                    (
                        employee_id,
                        type,
                        value,
                        details,
                        date,
                        status,
                        notes
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    `,
                    [
                        employee_id,
                        type,
                        numericValue,
                        details || null,
                        date,
                        status || 'نشطة',
                        notes || null
                    ]
                );

            await createAuditLog(
                req,
                `إضافة معاملة مالية للموظف ${employee[0].name}: ${type} بقيمة ${numericValue.toFixed(2)}`
            );

            res.status(201).json({
                success: true,
                message:
                    'تم تسجيل المعاملة بنجاح',
                id:
                    result.insertId
            });

        } catch (error) {
            console.error(
                'ADD LOAN & DEDUCTION ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء تسجيل المعاملة',
                error: error.message
            });
        }
    }
);

/* =========================================================
   LOANS & DEDUCTIONS - DELETE
========================================================= */

app.delete(
    '/api/loans-deductions/:id',
    authMiddleware,
    isManagerOrAdmin,
    async (req, res) => {
        try {
            const record =
                await query(
                    `
                    SELECT
                        ld.id,
                        e.name AS employeeName,
                        ld.type,
                        ld.value
                    FROM loans_deductions ld
                    LEFT JOIN employees e
                        ON ld.employee_id = e.id
                    WHERE ld.id = ?
                    `,
                    [req.params.id]
                );

            if (record.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        'المعاملة غير موجودة'
                });
            }

            await query(
                `
                DELETE FROM loans_deductions
                WHERE id = ?
                `,
                [req.params.id]
            );

            await createAuditLog(
                req,
                `حذف معاملة مالية للموظف ${record[0].employeeName || 'غير معروف'}: ${record[0].type}`
            );

            res.json({
                success: true,
                message:
                    'تم حذف المعاملة بنجاح'
            });

        } catch (error) {
            console.error(
                'DELETE LOAN & DEDUCTION ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء حذف المعاملة',
                error: error.message
            });
        }
    }
);

/* =========================================================
   EMPLOYEE DOCUMENTS - GET
========================================================= */

app.get(
    '/api/employee-documents',
    authMiddleware,
    async (req, res) => {
        try {
            let sql = `
                SELECT
                    ed.id,
                    ed.employee_id,
                    e.name AS employeeName,
                    ed.document_type AS documentType,
                    ed.file_name AS fileName,
                    ed.file_path AS filePath,
                    DATE_FORMAT(
                        ed.upload_date,
                        '%Y-%m-%d'
                    ) AS uploadDate,
                    DATE_FORMAT(
                        ed.expiry_date,
                        '%Y-%m-%d'
                    ) AS expiryDate,
                    ed.status,
                    ed.uploaded_by AS uploadedBy,
                    u.name AS uploadedByName,
                    ed.created_at,
                    ed.updated_at
                FROM employee_documents ed
                INNER JOIN employees e
                    ON ed.employee_id = e.id
                LEFT JOIN users u
                    ON ed.uploaded_by = u.id
            `;

            const params = [];

            if (!isManagementRole(req.user.role)) {
                const employeeId =
                    await getCurrentEmployeeId(req);

                if (!employeeId) {
                    return res.status(403).json({
                        success: false,
                        message:
                            'حساب الموظف غير مرتبط بموظف'
                    });
                }

                sql += `
                    WHERE ed.employee_id = ?
                `;

                params.push(employeeId);
            }

            sql += `
                ORDER BY ed.id DESC
            `;

            const documents =
                await query(
                    sql,
                    params
                );

            const formatted =
                documents.map(
                    (document) => ({
                        ...document,
                        url:
                            document.filePath
                                ? `/uploads/${String(
                                    document.filePath
                                )
                                    .replace(
                                        /\\/g,
                                        '/'
                                    )
                                    .replace(
                                        /^uploads\//,
                                        ''
                                    )}`
                                : null
                    })
                );

            res.json({
                success: true,
                documents:
                    formatted
            });

        } catch (error) {
            console.error(
                'GET DOCUMENTS ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء جلب المستندات',
                error: error.message
            });
        }
    }
);

/* =========================================================
   EMPLOYEE DOCUMENTS - ADD
========================================================= */

app.post(
    '/api/employee-documents',
    authMiddleware,
    isManagerOrAdmin,
    (req, res, next) => {
        documentUpload.single('file')(
            req,
            res,
            (error) => {
                if (error) {
                    console.error(
                        'DOCUMENT UPLOAD ERROR:',
                        error
                    );

                    return res.status(400).json({
                        success: false,
                        message:
                            error.code ===
                                'LIMIT_FILE_SIZE'
                                ? 'حجم الملف يجب ألا يتجاوز 10MB'
                                : error.message ||
                                'فشل رفع الملف'
                    });
                }

                next();
            }
        );
    },
    async (req, res) => {
        try {
            const {
                employee_id,
                document_type,
                upload_date,
                expiry_date,
                status
            } = req.body;

            if (!employee_id) {
                if (req.file) {
                    fs.unlink(
                        req.file.path,
                        () => { }
                    );
                }

                return res.status(400).json({
                    success: false,
                    message:
                        'اختيار الموظف مطلوب'
                });
            }

            if (!document_type) {
                if (req.file) {
                    fs.unlink(
                        req.file.path,
                        () => { }
                    );
                }

                return res.status(400).json({
                    success: false,
                    message:
                        'نوع المستند مطلوب'
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message:
                        'يجب اختيار ملف لرفعه'
                });
            }

            const employee =
                await query(
                    `
                    SELECT
                        id,
                        name
                    FROM employees
                    WHERE id = ?
                    `,
                    [employee_id]
                );

            if (employee.length === 0) {
                fs.unlink(
                    req.file.path,
                    () => { }
                );

                return res.status(404).json({
                    success: false,
                    message:
                        'الموظف غير موجود'
                });
            }

            const uploadDate =
                upload_date ||
                new Date()
                    .toISOString()
                    .slice(0, 10);

            const allowedStatuses = [
                'ساري',
                'مؤرشف',
                'منتهي'
            ];

            const finalStatus =
                status || 'ساري';

            if (
                !allowedStatuses.includes(
                    finalStatus
                )
            ) {
                fs.unlink(
                    req.file.path,
                    () => { }
                );

                return res.status(400).json({
                    success: false,
                    message:
                        'حالة المستند غير صحيحة'
                });
            }

            const relativePath =
                path
                    .relative(
                        __dirname,
                        req.file.path
                    )
                    .replace(
                        /\\/g,
                        '/'
                    );

            const result =
                await query(
                    `
                    INSERT INTO employee_documents
                    (
                        employee_id,
                        document_type,
                        file_name,
                        file_path,
                        upload_date,
                        expiry_date,
                        status,
                        uploaded_by
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `,
                    [
                        Number(employee_id),
                        document_type,
                        req.file.originalname,
                        relativePath,
                        uploadDate,
                        expiry_date ||
                        null,
                        finalStatus,
                        req.user.id
                    ]
                );

            await createAuditLog(
                req,
                `رفع مستند للموظف ${employee[0].name}: ${document_type} - ${req.file.originalname}`
            );

            res.status(201).json({
                success: true,
                message:
                    'تم رفع المستند بنجاح',
                id:
                    result.insertId,

                document: {
                    id:
                        result.insertId,

                    employee_id:
                        Number(
                            employee_id
                        ),

                    employeeName:
                        employee[0].name,

                    documentType:
                        document_type,

                    fileName:
                        req.file.originalname,

                    uploadDate,

                    expiryDate:
                        expiry_date ||
                        null,

                    status:
                        finalStatus,

                    url:
                        `/uploads/${path
                            .relative(
                                path.join(
                                    __dirname,
                                    'uploads'
                                ),
                                req.file.path
                            )
                            .replace(
                                /\\/g,
                                '/'
                            )}`
                }
            });

        } catch (error) {
            if (req.file) {
                fs.unlink(
                    req.file.path,
                    () => { }
                );
            }

            console.error(
                'ADD DOCUMENT ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء حفظ المستند',
                error: error.message
            });
        }
    }
);

/* =========================================================
   EMPLOYEE DOCUMENTS - UPDATE
========================================================= */

app.put(
    '/api/employee-documents/:id',
    authMiddleware,
    isManagerOrAdmin,
    async (req, res) => {
        try {
            const {
                document_type,
                expiry_date,
                status
            } = req.body;

            const existing =
                await query(
                    `
                    SELECT
                        id,
                        document_type
                    FROM employee_documents
                    WHERE id = ?
                    `,
                    [req.params.id]
                );

            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        'المستند غير موجود'
                });
            }

            const allowedStatuses = [
                'ساري',
                'مؤرشف',
                'منتهي'
            ];

            if (
                status &&
                !allowedStatuses.includes(
                    status
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'حالة المستند غير صحيحة'
                });
            }

            await query(
                `
                UPDATE employee_documents
                SET
                    document_type =
                        COALESCE(?, document_type),

                    expiry_date =
                        ?,

                    status =
                        COALESCE(?, status)

                WHERE id = ?
                `,
                [
                    document_type ||
                    null,

                    expiry_date ||
                    null,

                    status ||
                    null,

                    req.params.id
                ]
            );

            await createAuditLog(
                req,
                `تعديل مستند رقم ${req.params.id}`
            );

            res.json({
                success: true,
                message:
                    'تم تحديث المستند'
            });

        } catch (error) {
            console.error(
                'UPDATE DOCUMENT ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء تحديث المستند',
                error: error.message
            });
        }
    }
);

/* =========================================================
   EMPLOYEE DOCUMENTS - DELETE
========================================================= */

app.delete(
    '/api/employee-documents/:id',
    authMiddleware,
    isManagerOrAdmin,
    async (req, res) => {
        try {
            const documents =
                await query(
                    `
                    SELECT
                        id,
                        employee_id,
                        document_type,
                        file_name,
                        file_path
                    FROM employee_documents
                    WHERE id = ?
                    `,
                    [req.params.id]
                );

            if (documents.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        'المستند غير موجود'
                });
            }

            const document =
                documents[0];

            const employee =
                await query(
                    `
                    SELECT name
                    FROM employees
                    WHERE id = ?
                    `,
                    [document.employee_id]
                );

            await query(
                `
                DELETE FROM employee_documents
                WHERE id = ?
                `,
                [req.params.id]
            );

            if (document.file_path) {
                const physicalPath =
                    path.isAbsolute(
                        document.file_path
                    )
                        ? document.file_path
                        : path.join(
                            __dirname,
                            document.file_path
                        );

                fs.unlink(
                    physicalPath,
                    (error) => {
                        if (
                            error &&
                            error.code !==
                            'ENOENT'
                        ) {
                            console.error(
                                'DELETE DOCUMENT FILE ERROR:',
                                error.message
                            );
                        }
                    }
                );
            }

            await createAuditLog(
                req,
                `حذف مستند ${document.document_type} للموظف ${employee[0]?.name || document.employee_id}`
            );

            res.json({
                success: true,
                message:
                    'تم حذف المستند'
            });

        } catch (error) {
            console.error(
                'DELETE DOCUMENT ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء حذف المستند',
                error: error.message
            });
        }
    }
);

/* =========================================================
   HOURLY PERMISSIONS - GET
========================================================= */

app.get(
    '/api/hourly-permissions',
    authMiddleware,
    isManagerOrAdmin,
    async (req, res) => {
        try {
            const permissions =
                await query(`
                    SELECT
                        hp.id,
                        hp.employee_id,
                        e.name AS employeeName,
                        DATE_FORMAT(
                            hp.permission_date,
                            '%Y-%m-%d'
                        ) AS date,
                        hp.hours,
                        hp.reason,
                        hp.status,
                        hp.created_by AS createdBy,
                        u.name AS createdByName,
                        hp.created_at,
                        hp.updated_at
                    FROM hourly_permissions hp
                    INNER JOIN employees e
                        ON hp.employee_id = e.id
                    LEFT JOIN users u
                        ON hp.created_by = u.id
                    ORDER BY
                        hp.permission_date DESC,
                        hp.id DESC
                `);

            res.json({
                success: true,
                permissions
            });

        } catch (error) {
            console.error(
                'GET HOURLY PERMISSIONS ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء جلب أذونات الساعات',
                error: error.message
            });
        }
    }
);

/* =========================================================
   HOURLY PERMISSIONS - ADD
========================================================= */

app.post(
    '/api/hourly-permissions',
    authMiddleware,
    isManagerOrAdmin,
    async (req, res) => {
        try {
            const {
                employee_id,
                date,
                permission_date,
                hours,
                reason,
                status
            } = req.body;

            const finalDate =
                date ||
                permission_date;

            if (
                !employee_id ||
                !finalDate ||
                hours === undefined ||
                hours === null ||
                hours === ''
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'الموظف والتاريخ وعدد الساعات مطلوبين'
                });
            }

            const numericHours =
                Number(hours);

            if (
                !Number.isFinite(
                    numericHours
                ) ||
                numericHours <= 0 ||
                numericHours > 24
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'عدد الساعات يجب أن يكون أكبر من 0 وأقصاه 24 ساعة'
                });
            }

            if (
                !/^\d{4}-\d{2}-\d{2}$/.test(
                    String(finalDate)
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'تاريخ الإذن غير صحيح'
                });
            }

            const employee =
                await query(
                    `
                    SELECT
                        id,
                        name
                    FROM employees
                    WHERE id = ?
                    `,
                    [employee_id]
                );

            if (employee.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        'الموظف غير موجود'
                });
            }

            const allowedStatuses = [
                'معلق',
                'مقبول',
                'مرفوض'
            ];

            const finalStatus =
                status || 'معلق';

            if (
                !allowedStatuses.includes(
                    finalStatus
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'حالة الإذن غير صحيحة'
                });
            }

            const result =
                await query(
                    `
                    INSERT INTO hourly_permissions
                    (
                        employee_id,
                        permission_date,
                        hours,
                        reason,
                        status,
                        created_by
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    `,
                    [
                        Number(
                            employee_id
                        ),
                        finalDate,
                        numericHours,
                        reason ||
                        null,
                        finalStatus,
                        req.user.id
                    ]
                );

            await createAuditLog(
                req,
                `إضافة إذن ساعات للموظف ${employee[0].name}: ${numericHours} ساعة بتاريخ ${finalDate}`
            );

            res.status(201).json({
                success: true,
                message:
                    'تم إضافة إذن الساعات',
                id:
                    result.insertId
            });

        } catch (error) {
            console.error(
                'ADD HOURLY PERMISSION ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء إضافة إذن الساعات',
                error: error.message
            });
        }
    }
);

/* =========================================================
   HOURLY PERMISSIONS - UPDATE STATUS
========================================================= */

app.put(
    '/api/hourly-permissions/:id/status',
    authMiddleware,
    isManagerOrAdmin,
    async (req, res) => {
        try {
            const {
                status
            } = req.body;

            const allowedStatuses = [
                'معلق',
                'مقبول',
                'مرفوض'
            ];

            if (
                !allowedStatuses.includes(
                    status
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'حالة الإذن غير صحيحة'
                });
            }

            const permission =
                await query(
                    `
                    SELECT
                        hp.id,
                        e.name AS employeeName
                    FROM hourly_permissions hp
                    INNER JOIN employees e
                        ON hp.employee_id = e.id
                    WHERE hp.id = ?
                    `,
                    [req.params.id]
                );

            if (
                permission.length === 0
            ) {
                return res.status(404).json({
                    success: false,
                    message:
                        'الإذن غير موجود'
                });
            }

            await query(
                `
                UPDATE hourly_permissions
                SET status = ?
                WHERE id = ?
                `,
                [
                    status,
                    req.params.id
                ]
            );

            await createAuditLog(
                req,
                `تحديث إذن ساعات الموظف ${permission[0].employeeName} إلى ${status}`
            );

            res.json({
                success: true,
                message:
                    'تم تحديث حالة الإذن'
            });

        } catch (error) {
            console.error(
                'UPDATE HOURLY PERMISSION ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء تحديث حالة الإذن',
                error: error.message
            });
        }
    }
);

/* =========================================================
   HOURLY PERMISSIONS - DELETE
========================================================= */

app.delete(
    '/api/hourly-permissions/:id',
    authMiddleware,
    isManagerOrAdmin,
    async (req, res) => {
        try {
            const permission =
                await query(
                    `
                    SELECT
                        hp.id,
                        e.name AS employeeName
                    FROM hourly_permissions hp
                    INNER JOIN employees e
                        ON hp.employee_id = e.id
                    WHERE hp.id = ?
                    `,
                    [req.params.id]
                );

            if (
                permission.length === 0
            ) {
                return res.status(404).json({
                    success: false,
                    message:
                        'الإذن غير موجود'
                });
            }

            await query(
                `
                DELETE FROM hourly_permissions
                WHERE id = ?
                `,
                [req.params.id]
            );

            await createAuditLog(
                req,
                `حذف إذن ساعات الموظف ${permission[0].employeeName}`
            );

            res.json({
                success: true,
                message:
                    'تم حذف إذن الساعات'
            });

        } catch (error) {
            console.error(
                'DELETE HOURLY PERMISSION ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء حذف إذن الساعات',
                error: error.message
            });
        }
    }
);

/* =========================================================
   AUDIT LOGS - GET
========================================================= */

app.get(
    '/api/audit-logs',
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const limit =
                Math.min(
                    Math.max(
                        Number(
                            req.query.limit
                        ) || 200,
                        1
                    ),
                    1000
                );

            const logs =
                await query(
                    `
                    SELECT
                        id,
                        user_id AS userId,
                        admin_name AS adminName,
                        action,
                        ip_address AS ipAddress,
                        user_agent AS userAgent,
                        created_at AS timestamp
                    FROM audit_logs
                    ORDER BY id DESC
                    LIMIT ?
                    `,
                    [limit]
                );

            res.json({
                success: true,
                logs
            });

        } catch (error) {
            console.error(
                'GET AUDIT LOGS ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء جلب سجل العمليات',
                error: error.message
            });
        }
    }
);

/* =========================================================
   AUDIT LOGS - DELETE ALL
========================================================= */

app.delete(
    '/api/audit-logs',
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            await query(
                'DELETE FROM audit_logs'
            );

            await createAuditLog(
                req,
                'مسح سجل العمليات Audit Logs'
            );

            res.json({
                success: true,
                message:
                    'تم مسح سجل العمليات'
            });

        } catch (error) {
            console.error(
                'DELETE AUDIT LOGS ERROR:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    'حدث خطأ أثناء مسح سجل العمليات',
                error: error.message
            });
        }
    }
);

/* =========================================================
   SALARIES
========================================================= */

app.get(
    '/api/salaries',
    authMiddleware,
    async (req, res) => {
        try {
            const now = new Date();

            const requestedMonth =
                req.query.month ||
                `${now.getFullYear()}-${String(
                    now.getMonth() + 1
                ).padStart(2, '0')}`;

            const [year, month] =
                requestedMonth
                    .split('-')
                    .map(Number);

            if (
                !Number.isInteger(year) ||
                !Number.isInteger(month) ||
                month < 1 ||
                month > 12
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'صيغة الشهر غير صحيحة'
                });
            }

            const monthStart =
                `${year}-${String(
                    month
                ).padStart(2, '0')}-01`;

            const lastDay =
                new Date(
                    Date.UTC(
                        year,
                        month,
                        0
                    )
                ).getUTCDate();

            const monthEnd =
                `${year}-${String(
                    month
                ).padStart(2, '0')}-${String(
                    lastDay
                ).padStart(2, '0')}`;

            let calculationEnd =
                monthEnd;

            if (
                year ===
                now.getFullYear() &&
                month ===
                now.getMonth() + 1
            ) {
                calculationEnd =
                    `${now.getFullYear()}-${String(
                        now.getMonth() + 1
                    ).padStart(2, '0')}-${String(
                        now.getDate()
                    ).padStart(2, '0')}`;
            }

            const parseDateOnly =
                (dateString) => {
                    const [
                        y,
                        m,
                        d
                    ] =
                        String(
                            dateString
                        )
                            .slice(0, 10)
                            .split('-')
                            .map(Number);

                    return new Date(
                        Date.UTC(
                            y,
                            m - 1,
                            d
                        )
                    );
                };

            const dateToString =
                (date) => {
                    return `${date.getUTCFullYear()}-${String(
                        date.getUTCMonth() + 1
                    ).padStart(2, '0')}-${String(
                        date.getUTCDate()
                    ).padStart(2, '0')}`;
                };

            const getDateRangeSafe =
                (
                    startDate,
                    endDate
                ) => {
                    const dates = [];

                    let current =
                        parseDateOnly(
                            startDate
                        );

                    const end =
                        parseDateOnly(
                            endDate
                        );

                    while (
                        current <= end
                    ) {
                        dates.push(
                            dateToString(
                                current
                            )
                        );

                        current =
                            new Date(
                                current.getTime() +
                                24 *
                                60 *
                                60 *
                                1000
                            );
                    }

                    return dates;
                };

            const getDayNameSafe =
                (dateString) => {
                    const date =
                        parseDateOnly(
                            dateString
                        );

                    const names = [
                        'Sunday',
                        'Monday',
                        'Tuesday',
                        'Wednesday',
                        'Thursday',
                        'Friday',
                        'Saturday'
                    ];

                    return names[
                        date.getUTCDay()
                    ];
                };

            const settings =
                await getSettings();

            const weeklyHoliday1 =
                normalizeDayName(
                    settings.weekly_holiday_1
                );

            const weeklyHoliday2 =
                normalizeDayName(
                    settings.weekly_holiday_2
                );

            const overtimeMultiplier =
                Number(
                    settings.overtime_rate
                );

            const deductionMultiplier =
                Number(
                    settings.deduction_rate
                );

            const safeOvertimeMultiplier =
                Number.isFinite(
                    overtimeMultiplier
                )
                    ? overtimeMultiplier
                    : 1.5;

            const safeDeductionMultiplier =
                Number.isFinite(
                    deductionMultiplier
                )
                    ? deductionMultiplier
                    : 1;

            const holidays =
                await query(
                    `
                    SELECT
                        DATE_FORMAT(
                            holiday_date,
                            '%Y-%m-%d'
                        ) AS holiday_date
                    FROM official_holidays
                    WHERE holiday_date
                        BETWEEN ?
                        AND ?
                    `,
                    [
                        monthStart,
                        calculationEnd
                    ]
                );

            const officialHolidaySet =
                new Set(
                    holidays.map(
                        (holiday) =>
                            String(
                                holiday.holiday_date
                            ).slice(
                                0,
                                10
                            )
                    )
                );

            let employeesSql = `
                SELECT
                    id,
                    name,
                    salary
                FROM employees
            `;

            const employeesParams = [];

            if (!isManagementRole(req.user.role)) {
                const employeeId =
                    await getCurrentEmployeeId(req);

                if (!employeeId) {
                    return res.status(403).json({
                        success: false,
                        message:
                            'حساب الموظف غير مرتبط بموظف'
                    });
                }

                employeesSql += `
                    WHERE id = ?
                `;

                employeesParams.push(
                    employeeId
                );
            }

            employeesSql += `
                ORDER BY id ASC
            `;

            const employees =
                await query(
                    employeesSql,
                    employeesParams
                );

            const allDays =
                getDateRangeSafe(
                    monthStart,
                    calculationEnd
                );

            const workDays =
                allDays.filter(
                    (date) => {
                        const dayName =
                            normalizeDayName(
                                getDayNameSafe(
                                    date
                                )
                            );

                        if (
                            dayName ===
                            weeklyHoliday1 ||
                            dayName ===
                            weeklyHoliday2
                        ) {
                            return false;
                        }

                        if (
                            officialHolidaySet.has(
                                date
                            )
                        ) {
                            return false;
                        }

                        return true;
                    }
                );

            const results = [];

            for (
                const employee
                of employees
            ) {
                const attendanceRows =
                    await query(
                        `
                        SELECT
                            DATE_FORMAT(
                                attendance_date,
                                '%Y-%m-%d'
                            ) AS attendance_date,
                            check_in,
                            check_out,
                            status,
                            overtime_hours
                        FROM attendance
                        WHERE employee_id = ?
                        AND attendance_date
                            BETWEEN ?
                            AND ?
                        ORDER BY
                            attendance_date ASC
                        `,
                        [
                            employee.id,
                            monthStart,
                            calculationEnd
                        ]
                    );

                const attendanceMap =
                    new Map();

                attendanceRows.forEach(
                    (row) => {
                        const date =
                            String(
                                row.attendance_date
                            ).slice(
                                0,
                                10
                            );

                        attendanceMap.set(
                            date,
                            row
                        );
                    }
                );

                const approvedLeaves =
                    await query(
                        `
                        SELECT
                            DATE_FORMAT(
                                start_date,
                                '%Y-%m-%d'
                            ) AS start_date,
                            DATE_FORMAT(
                                end_date,
                                '%Y-%m-%d'
                            ) AS end_date
                        FROM leaves
                        WHERE status = 'مقبول'
                        AND (
                            employee_id = ?
                            OR employee_name = ?
                        )
                        AND start_date <= ?
                        AND end_date >= ?
                        `,
                        [
                            employee.id,
                            employee.name,
                            calculationEnd,
                            monthStart
                        ]
                    );

                const leaveDays =
                    new Set();

                approvedLeaves.forEach(
                    (leave) => {
                        let start =
                            String(
                                leave.start_date
                            ).slice(
                                0,
                                10
                            );

                        let end =
                            String(
                                leave.end_date
                            ).slice(
                                0,
                                10
                            );

                        if (
                            start <
                            monthStart
                        ) {
                            start =
                                monthStart;
                        }

                        if (
                            end >
                            calculationEnd
                        ) {
                            end =
                                calculationEnd;
                        }

                        getDateRangeSafe(
                            start,
                            end
                        ).forEach(
                            (date) =>
                                leaveDays.add(
                                    date
                                )
                        );
                    }
                );

                let presentDays = 0;
                let absenceDays = 0;

                for (
                    const date
                    of workDays
                ) {
                    if (
                        leaveDays.has(
                            date
                        )
                    ) {
                        continue;
                    }

                    const attendance =
                        attendanceMap.get(
                            date
                        );

                    if (!attendance) {
                        absenceDays++;
                        continue;
                    }

                    const status =
                        String(
                            attendance.status ||
                            ''
                        ).trim();

                    const hasCheckIn =
                        attendance.check_in !==
                        null &&
                        attendance.check_in !==
                        undefined &&
                        String(
                            attendance.check_in
                        ).trim() !== '';

                    const isPresent =
                        status.startsWith(
                            'حاضر'
                        ) ||
                        status ===
                        'متأخر' ||
                        (
                            hasCheckIn &&
                            !status.startsWith(
                                'غائب'
                            )
                        );

                    const isAbsent =
                        status.startsWith(
                            'غائب'
                        );

                    if (isPresent) {
                        presentDays++;
                    } else if (
                        isAbsent
                    ) {
                        absenceDays++;
                    } else {
                        absenceDays++;
                    }
                }

                let overtimeHours = 0;

                attendanceRows.forEach(
                    (row) => {
                        const date =
                            String(
                                row.attendance_date
                            ).slice(
                                0,
                                10
                            );

                        if (
                            !workDays.includes(
                                date
                            )
                        ) {
                            return;
                        }

                        const hours =
                            Number(
                                row.overtime_hours
                            );

                        if (
                            Number.isFinite(
                                hours
                            ) &&
                            hours > 0
                        ) {
                            overtimeHours +=
                                hours;
                        }
                    }
                );

                const salaryNumber =
                    Number(
                        employee.salary
                    );

                const baseSalary =
                    Number.isFinite(
                        salaryNumber
                    )
                        ? salaryNumber
                        : 0;

                const dayRate =
                    baseSalary / 22;

                const hourRate =
                    dayRate / 8;

                const attendanceOvertimeAmount =
                    overtimeHours *
                    hourRate *
                    safeOvertimeMultiplier;

                const absenceDeduction =
                    absenceDays *
                    dayRate *
                    (
                        safeDeductionMultiplier /
                        2
                    );

                const loansData = await query(
                    `
                    SELECT
                        type,
                        value
                    FROM loans_deductions
                    WHERE employee_id = ?
                    AND status = 'نشطة'
                    AND (
                        date BETWEEN ? AND ?
                        OR DATE_FORMAT(date, '%Y-%m') = ?
                    )
                    `,
                    [employee.id, monthStart, monthEnd, requestedMonth]
                );

                let manualDeductions = 0;
                let manualAdditions = 0;

                loansData.forEach((loan) => {
                    const val = Number(loan.value || 0);
                    if (
                        loan.type === 'سلفة مالية' ||
                        loan.type === 'خصم ساعات' ||
                        loan.type === 'جزاء إداري / خصم'
                    ) {
                        manualDeductions += val;
                    } else if (
                        loan.type === 'إضافة ساعات' ||
                        loan.type === 'مكافأة استثنائية'
                    ) {
                        manualAdditions += val;
                    }
                });

                const deductionAmount = absenceDeduction + manualDeductions;
                const totalOvertimeAmount = attendanceOvertimeAmount + manualAdditions;

                const netSalary =
                    Math.max(
                        0,
                        baseSalary +
                        totalOvertimeAmount -
                        deductionAmount
                    );

                const payrollMonth =
                    `${year}-${String(
                        month
                    ).padStart(
                        2,
                        '0'
                    )}-01`;

                await query(
                    `
                    INSERT INTO payroll
                    (
                        employee_id,
                        payroll_month,
                        base_salary,
                        present_days,
                        absence_days,
                        overtime_hours,
                        overtime_amount,
                        deduction_amount,
                        net_salary
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

                    ON DUPLICATE KEY UPDATE
                        base_salary =
                            VALUES(base_salary),

                        present_days =
                            VALUES(present_days),

                        absence_days =
                            VALUES(absence_days),

                        overtime_hours =
                            VALUES(overtime_hours),

                        overtime_amount =
                            VALUES(overtime_amount),

                        deduction_amount =
                            VALUES(deduction_amount),

                        net_salary =
                            VALUES(net_salary)
                    `,
                    [
                        employee.id,
                        payrollMonth,
                        baseSalary,
                        presentDays,
                        absenceDays,
                        Number(
                            overtimeHours.toFixed(
                                2
                            )
                        ),
                        Number(
                            totalOvertimeAmount.toFixed(
                                2
                            )
                        ),
                        Number(
                            deductionAmount.toFixed(
                                2
                            )
                        ),
                        Number(
                            netSalary.toFixed(
                                2
                            )
                        )
                    ]
                );

                results.push({
                    id: employee.id,
                    employee_id: employee.id,
                    name: employee.name,
                    salary: baseSalary,
                    base_salary: baseSalary,
                    present_days: presentDays,
                    absence_days: absenceDays,
                    overtime_hours: Number(overtimeHours.toFixed(2)),
                    overtime_amount: Number(totalOvertimeAmount.toFixed(2)),
                    deduction_amount: Number(deductionAmount.toFixed(2)),
                    net_salary: Number(netSalary.toFixed(2))
                });
            }

            res.json({
                success: true,
                month: requestedMonth,
                calculation_start: monthStart,
                calculation_end: calculationEnd,
                working_days: workDays.length,
                working_dates: workDays,
                salaries: results
            });

        } catch (error) {
            console.error('SALARIES ERROR:', error);
            res.status(500).json({
                success: false,
                message: 'حدث خطأ أثناء حساب الرواتب',
                error: error.message
            });
        }
    }
);

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use(
    (error, req, res, next) => {
        console.error(
            'GLOBAL SERVER ERROR:',
            error
        );

        if (
            res.headersSent
        ) {
            return next(error);
        }

        res.status(500).json({
            success: false,
            message:
                'حدث خطأ غير متوقع في السيرفر',

            error:
                process.env.NODE_ENV ===
                    'production'
                    ? undefined
                    : error.message
        });
    }
);

/* =========================================================
   START SERVER
========================================================= */

app.listen(
    PORT,
    () => {
        console.log('');

        console.log(
            '===================================='
        );

        console.log(
            '🚀 HR System Backend'
        );

        console.log(
            `📡 http://localhost:${PORT}`
        );

        console.log(
            '🗄️ MySQL Database Connected'
        );

        console.log(
            '📁 Employee Documents Upload Enabled'
        );

        console.log(
            '📝 Audit Logs Enabled'
        );

        console.log(
            '⏱️ Hourly Permissions Enabled'
        );

        console.log(
            '===================================='
        );
    }
);