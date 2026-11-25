import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { pool } from './db.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5003;
const JWT_SECRET = process.env.JWT_SECRET || 'oms_admin_jwt_secret_secure_key_2026_mde';

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === 'null') return callback(null, true);

      const isLocalhost =
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        origin.startsWith('app://') ||
        origin.startsWith('file://');

      if (
        isLocalhost ||
        origin.endsWith('.github.io') ||
        origin.endsWith('.vercel.app') ||
        origin === 'https://matrix-data-egypt.github.io'
      ) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);
app.use(express.json());

// Auth Middleware for Admin
interface AuthRequest extends Request {
  user?: any;
}

const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader ? (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader.split(' ')[1]) : undefined;

    if (!token) {
      res.status(401).json({ success: false, message: 'مطلوب تسجيل الدخول كمسؤول' });
      return;
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    const { rows } = await pool.query(
      `SELECT id, name, email, username, role, "systemAccess", "isActive" FROM "public"."users" WHERE id = $1`,
      [decoded.id]
    );

    if (rows.length === 0 || !rows[0].isActive) {
      res.status(403).json({ success: false, message: 'الحساب غير مفعّل أو غير موجود' });
      return;
    }

    const user = rows[0];
    if (user.role !== 'ADMIN' && user.systemAccess !== 'ALL') {
      res.status(403).json({ success: false, message: 'ليس لديك صلاحية إدارة المستخدمين (Admin only)' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'جلسة الدخول غير صالحة أو منتهية' });
  }
};

// ----------------- ROUTES -----------------

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    system: 'OMS Admin Hub',
    developer: 'MDE – Matrix Data Egypt',
    timestamp: new Date().toISOString(),
  });
});

// Admin Login
app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { loginIdentifier, password } = req.body;
    const identifier = (loginIdentifier || '').trim();

    if (!identifier || !password) {
      res.status(400).json({ success: false, message: 'اسم المستخدم وكلمة المرور مطلوبان' });
      return;
    }

    const { rows } = await pool.query(
      `SELECT id, name, email, username, "passwordHash", role, "systemAccess", "isActive", phone
       FROM "public"."users"
       WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)
       LIMIT 1`,
      [identifier]
    );

    if (rows.length === 0) {
      res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة' });
      return;
    }

    const user = rows[0];

    if (!user.isActive) {
      res.status(403).json({ success: false, message: 'هذا الحساب غير مفعّل' });
      return;
    }

    // Only Admin or ALL access allowed in Admin Portal
    if (user.role !== 'ADMIN' && user.systemAccess !== 'ALL') {
      res.status(403).json({
        success: false,
        message: 'عفواً، هذه البوابة مخصصة للإدارة ومديري النظام فقط.',
      });
      return;
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة' });
      return;
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        systemAccess: user.systemAccess,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح إلى لوحة الإدارة',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          systemAccess: user.systemAccess,
          phone: user.phone,
        },
      },
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تسجيل الدخول' });
  }
});

// Get current admin profile
app.get('/api/auth/me', requireAdmin, (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: req.user });
});

// List all users
app.get('/api/users', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, username, role, "systemAccess", phone, "isActive", "createdAt", "updatedAt"
       FROM "public"."users"
       ORDER BY "createdAt" DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('get users error:', error);
    res.status(500).json({ success: false, message: 'خطأ أثناء جلب المستخدمين' });
  }
});

// Create new user
const createUserSchema = z.object({
  name: z.string().min(2, 'الاسم الكامل مطلوب'),
  username: z.string().min(3, 'اسم المستخدم يجب ألا يقل عن 3 أحرف'),
  email: z.string().email('صيغة البريد الإلكتروني غير صحيحة'),
  password: z.string().min(6, 'كلمة المرور يجب ألا تقل عن 6 أحرف'),
  phone: z.string().optional(),
  role: z.string().default('ACCOUNTANT'),
  systemAccess: z.enum(['INVOICE', 'MEDIA', 'ALL']).default('INVOICE'),
});

app.post('/api/users', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.errors });
      return;
    }

    const { name, username, email, password, phone, role, systemAccess } = parsed.data;

    const existing = await pool.query(
      `SELECT id, email, username FROM "public"."users" WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2)`,
      [email.trim(), username.trim()]
    );

    if (existing.rows.length > 0) {
      const match = existing.rows[0];
      if (match.email.toLowerCase() === email.trim().toLowerCase()) {
        res.status(400).json({ success: false, message: 'هذا البريد الإلكتروني مسجل بالفعل لمستخدم آخر' });
        return;
      }
      if (match.username && match.username.toLowerCase() === username.trim().toLowerCase()) {
        res.status(400).json({ success: false, message: 'اسم المستخدم هذا مستخدم بالفعل، اختر اسماً آخر' });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newId = crypto.randomUUID();

    const insertQuery = `
      INSERT INTO "public"."users" (
        "id", "name", "username", "email", "passwordHash", "phone", "role", "systemAccess", "isActive", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::"public"."UserRole", $8, true, NOW(), NOW())
      RETURNING id, name, username, email, phone, role, "systemAccess", "isActive", "createdAt"
    `;

    let validRole = 'ACCOUNTANT';
    if (['ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT', 'SALES'].includes(role)) {
      validRole = role;
    }

    const { rows } = await pool.query(insertQuery, [
      newId,
      name.trim(),
      username.trim(),
      email.trim(),
      passwordHash,
      phone?.trim() || null,
      validRole,
      systemAccess,
    ]);

    res.status(201).json({
      success: true,
      data: rows[0],
      message: `تم إنشاء المستخدم (${name.trim()}) بنجاح وتحديد اختصاصه على [${systemAccess === 'MEDIA' ? 'قسم الميديا فقط' : systemAccess === 'INVOICE' ? 'قسم الفواتير فقط' : 'كافة الأنظمة'}]`,
    });
  } catch (error: any) {
    console.error('create user error:', error);
    res.status(500).json({ success: false, message: 'خطأ أثناء إنشاء المستخدم: ' + error.message });
  }
});
// Update user details & system access
app.put('/api/users/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, username, email, phone, role, systemAccess, isActive } = req.body;

    if (email || username) {
      const conflict = await pool.query(
        `SELECT id FROM "public"."users" WHERE (LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2)) AND id != $3`,
        [email?.trim() || '', username?.trim() || '', id]
      );
      if (conflict.rows.length > 0) {
        res.status(400).json({ success: false, message: 'البريد الإلكتروني أو اسم المستخدم مستخدم بالفعل' });
        return;
      }
    }

    let validRole = undefined;
    if (role && ['ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT', 'SALES'].includes(role)) {
      validRole = role;
    }

    const { rows } = await pool.query(
      `UPDATE "public"."users"
       SET 
         name = COALESCE($1, name),
         username = COALESCE($2, username),
         email = COALESCE($3, email),
         phone = COALESCE($4, phone),
         role = COALESCE($5::"public"."UserRole", role),
         "systemAccess" = COALESCE($6, "systemAccess"),
         "isActive" = COALESCE($7, "isActive"),
         "updatedAt" = NOW()
       WHERE id = $8
       RETURNING id, name, username, email, phone, role, "systemAccess", "isActive", "updatedAt"`,
      [
        name?.trim() || null,
        username?.trim() || null,
        email?.trim() || null,
        phone !== undefined ? phone?.trim() || null : null,
        validRole || null,
        systemAccess || null,
        isActive !== undefined ? isActive : null,
        id,
      ]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
      return;
    }

    res.json({
      success: true,
      data: rows[0],
      message: 'تم تحديث بيانات وصلاحيات المستخدم بنجاح',
    });
  } catch (error: any) {
    console.error('update user error:', error);
    res.status(500).json({ success: false, message: 'خطأ أثناء تحديث المستخدم: ' + error.message });
  }
});

// Toggle user active status (One-click activate/deactivate)
app.patch('/api/users/:id/toggle-status', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (req.user && req.user.id === id) {
      res.status(400).json({ success: false, message: 'لا يمكنك تعطيل حسابك الشخصي' });
      return;
    }

    const { rows } = await pool.query(
      `UPDATE "public"."users"
       SET "isActive" = NOT "isActive", "updatedAt" = NOW()
       WHERE id = $1
       RETURNING id, name, "isActive"`,
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
      return;
    }

    res.json({
      success: true,
      data: rows[0],
      message: rows[0].isActive ? `تم تفعيل حساب (${rows[0].name})` : `تم تعطيل حساب (${rows[0].name})`,
    });
  } catch (error: any) {
    console.error('toggle status error:', error);
    res.status(500).json({ success: false, message: 'خطأ أثناء تغيير حالة الحساب' });
  }
});

// Reset user password
app.put('/api/users/:id/password', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const { rows } = await pool.query(
      `UPDATE "public"."users" SET "passwordHash" = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING id, name`,
      [passwordHash, id]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
      return;
    }

    res.json({
      success: true,
      message: `تم تغيير كلمة مرور (${rows[0].name}) بنجاح`,
    });
  } catch (error: any) {
    console.error('reset password error:', error);
    res.status(500).json({ success: false, message: 'خطأ أثناء إعادة تعيين كلمة المرور' });
  }
});

// Delete user
app.delete('/api/users/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (req.user && req.user.id === id) {
      res.status(400).json({ success: false, message: 'لا يمكنك حذف حسابك الشخصي أثناء تسجيل الدخول' });
      return;
    }

    const { rows } = await pool.query(`DELETE FROM "public"."users" WHERE id = $1 RETURNING id, name`, [id]);

    if (rows.length === 0) {
      res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
      return;
    }

    res.json({
      success: true,
      message: `تم حذف المستخدم (${rows[0].name}) بنجاح`,
    });
  } catch (error: any) {
    console.error('delete user error:', error);
    res.status(500).json({ success: false, message: 'خطأ أثناء حذف المستخدم: ' + error.message });
  }
});

// Start Server on 0.0.0.0 for Render / Local
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 OMS Admin Hub API running on port ${PORT}`);
    console.log(`🌟 System: OMS Admin | Developed by MDE – Matrix Data Egypt`);
  });
}

export default app;
