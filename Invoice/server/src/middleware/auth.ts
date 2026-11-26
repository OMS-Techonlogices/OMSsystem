import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import prisma from '../prisma/prismaClient.js';

export interface AuthUser {
  id: string;
  email: string;
  username?: string | null;
  role: UserRole;
  systemAccess: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, message: 'مطلوب تسجيل الدخول (Authentication required)' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'oms_jwt_secret_super_secure_key_2026_mde';
    const decoded = jwt.verify(token, secret) as AuthUser;

    // Check if user still active in DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, username: true, name: true, role: true, systemAccess: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(403).json({ success: false, message: 'الحساب غير مفعّل أو غير موجود' });
      return;
    }

    if (user.systemAccess === 'MEDIA') {
      res.status(403).json({ success: false, message: 'عفواً، هذا الحساب مصرح له بالدخول لقسم الميديا فقط.' });
      return;
    }

    const isReadOnlyUser =
      user.username === 'manager' ||
      user.username === 'مدير' ||
      (typeof user.name === 'string' && user.name.includes('عرض فقط'));

    if (isReadOnlyUser && req.method !== 'GET') {
      res.status(403).json({ success: false, message: 'هذا الحساب للعرض فقط ولا يملك صلاحية الإضافة أو التعديل' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      systemAccess: user.systemAccess,
    };
    next();
  } catch (error) {
    res.status(403).json({ success: false, message: 'جلسة الدخول غير صالحة أو منتهية' });
    return;
  }
};

export const requireRoles = (roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'غير مصرح' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'ليس لديك الصلاحية الكافية للقيام بهذا الإجراء (Forbidden)',
      });
      return;
    }

    next();
  };
};
