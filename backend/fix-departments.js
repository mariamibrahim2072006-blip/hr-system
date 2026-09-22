require('dotenv').config();

const mysql = require('mysql2');

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hr_system_db',
    charset: 'utf8mb4'
});

db.connect(async (err) => {
    if (err) {
        console.error('❌ MySQL connection failed:', err.message);
        process.exit(1);
    }

    try {
        await new Promise((resolve, reject) => {
            db.query('SET NAMES utf8mb4', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        const departments = [
            {
                id: 1,
                name: 'قسم تطوير البرمجيات (Software Development)'
            },
            {
                id: 2,
                name: 'قسم الموارد البشرية (HR)'
            },
            {
                id: 3,
                name: 'قسم التسويق والمبيعات'
            }
        ];

        for (const department of departments) {
            await new Promise((resolve, reject) => {
                db.query(
                    'UPDATE departments SET name = ? WHERE id = ?',
                    [department.name, department.id],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        }

        console.log('✅ Department names fixed successfully');

        db.query(
            'SELECT id, name FROM departments ORDER BY id',
            (err, rows) => {
                if (err) {
                    console.error('❌ SELECT ERROR:', err.message);
                } else {
                    console.table(rows);
                }

                db.end();
            }
        );

    } catch (error) {
        console.error('❌ ERROR:', error.message);
        db.end();
        process.exit(1);
    }
});