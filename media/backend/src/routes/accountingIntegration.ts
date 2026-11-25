
import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../prisma/prismaClient.js';

const router = Router();

interface AccountingUser {
  id: string;
  name: string;
  username: string | null;
  role: string;
  systemAccess: string;
  isActive: boolean;
}

interface AuthenticatedAccountingRequest extends Request {
  accountingUser?: AccountingUser;
}

const ACCOUNTING_ROLES = [
  'ADMIN',
  'FINANCE_MANAGER',
  'ACCOUNTANT',
];

// All roles that can trigger invoice creation from the Media dashboard.
const MEDIA_INVOICE_ROLES = [
  'ADMIN',
  'FINANCE_MANAGER',
  'ACCOUNTANT',
  'MEDIA_ADMIN',
  'MEDIA',
];

// Verify that the current user has accounting access.
async function requireAccountingAccess(
  req: AuthenticatedAccountingRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'يجب تسجيل الدخول أولاً',
    });
    return;
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'رمز الدخول غير موجود',
    });
    return;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({
      success: false,
      message: 'إعدادات المصادقة غير مكتملة',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;

    if (!decoded.id || typeof decoded.id !== 'string') {
      res.status(401).json({
        success: false,
        message: 'رمز الدخول غير صالح',
      });
      return;
    }

    const users = await prisma.$queryRaw<AccountingUser[]>`
      SELECT
        id,
        name,
        username,
        role,
        "systemAccess",
        "isActive"
      FROM "public"."users"
      WHERE id = ${decoded.id}
      LIMIT 1
    `;

    if (!users || users.length === 0 || !users[0].isActive) {
      res.status(403).json({
        success: false,
        message: 'المستخدم غير موجود أو غير مفعّل',
      });
      return;
    }

    const user = users[0];

    if (
      !ACCOUNTING_ROLES.includes(user.role) ||
      !['INVOICE', 'ALL'].includes(user.systemAccess)
    ) {
      res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول إلى نظام المحاسبة',
      });
      return;
    }

    req.accountingUser = user;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'رمز الدخول غير صالح أو منتهي',
      });
      return;
    }

    console.error('Accounting authorization error:', error);

    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التحقق من الصلاحيات',
    });
  }
}

// Verify that the current user is authenticated (media OR accounting roles allowed).
// Used for the "create invoice from media" endpoint which media admins can trigger.
async function requireMediaOrAccountingAccess(
  req: AuthenticatedAccountingRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'يجب تسجيل الدخول أولاً' });
    return;
  }

  const token = authHeader.slice(7).trim();
  const secret = process.env.JWT_SECRET;

  if (!token || !secret) {
    res.status(401).json({ success: false, message: 'رمز الدخول غير موجود أو إعدادات مفقودة' });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;

    if (!decoded.id || typeof decoded.id !== 'string') {
      res.status(401).json({ success: false, message: 'رمز الدخول غير صالح' });
      return;
    }

    const users = await prisma.$queryRaw<AccountingUser[]>`
      SELECT id, name, username, role, "systemAccess", "isActive"
      FROM "public"."users"
      WHERE id = ${decoded.id}
      LIMIT 1
    `;

    if (!users || users.length === 0 || !users[0].isActive) {
      res.status(403).json({ success: false, message: 'المستخدم غير موجود أو غير مفعّل' });
      return;
    }

    const user = users[0];

    const isReadOnlyUser =
      user.username === 'manager' ||
      user.username === 'مدير' ||
      (typeof user.name === 'string' && user.name.includes('عرض فقط'));

    if (isReadOnlyUser) {
      res.status(403).json({ success: false, message: 'هذا الحساب للعرض فقط ولا يملك صلاحية إصدار الفواتير' });
      return;
    }

    const hasMediaPermission = ['MEDIA', 'ALL'].includes(user.systemAccess);
    const hasAccountingPermission =
      ACCOUNTING_ROLES.includes(user.role) &&
      ['INVOICE', 'ALL'].includes(user.systemAccess);

    if (!hasMediaPermission && !hasAccountingPermission && !MEDIA_INVOICE_ROLES.includes(user.role)) {
      res.status(403).json({ success: false, message: 'غير مصرح لك بإصدار الفواتير' });
      return;
    }

    // كل مستخدم متصرح له (محاسب / مدير مالي / أدمين / ميديا) يستخدم هويته مباشرةً
    // دون الحاجة للبحث عن مستخدم محاسبة آخر في قاعدة البيانات.
    req.accountingUser = user;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, message: 'رمز الدخول غير صالح أو منتهي' });
      return;
    }
    console.error('Media/Accounting authorization error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء التحقق من الصلاحيات' });
  }
}

// Create Accounting Invoice from Media Campaign / Record.
// Media users (MEDIA_ADMIN, MEDIA) can also trigger this.
router.post(
  '/create-invoice-from-media',
  requireMediaOrAccountingAccess,
  async (
    req: AuthenticatedAccountingRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { mediaRecordId, dueDays = 15 } = req.body;

      if (
        typeof mediaRecordId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mediaRecordId)
      ) {
        res.status(400).json({
          success: false,
          message: 'معرف سجل الميديا غير صالح',
        });
        return;
      }

      if (
        !Number.isInteger(dueDays) ||
        dueDays < 1 ||
        dueDays > 365
      ) {
        res.status(400).json({
          success: false,
          message: 'مدة السداد يجب أن تكون رقمًا صحيحًا من 1 إلى 365 يومًا',
        });
        return;
      }

      const accountingUser = req.accountingUser;

      if (!accountingUser) {
        res.status(401).json({
          success: false,
          message: 'تعذر التحقق من المستخدم',
        });
        return;
      }

      const result = await prisma.$transaction(async (tx) => {
        const record = await tx.mediaRecord.findUnique({
          where: { id: mediaRecordId },
          include: {
            client: true,
            channel: true,
            supplier: true,
            content: {
              include: {
                contentType: true,
              },
            },
          },
        });

        if (!record) {
          throw new Error('MEDIA_RECORD_NOT_FOUND');
        }

        if (record.invoiceId) {
          throw new Error('INVOICE_ALREADY_CREATED');
        }

        // Find or create the accounting client.
        const accountingClients = await tx.$queryRaw<any[]>`
          SELECT id, name, "taxNumber"
          FROM "public"."clients"
          WHERE "name" = ${record.client.name}
          LIMIT 1
        `;

        let clientId: string;

        if (accountingClients.length > 0) {
          clientId = accountingClients[0].id;

          if (
            record.client.taxNumber &&
            !accountingClients[0].taxNumber
          ) {
            await tx.$executeRaw`
              UPDATE "public"."clients"
              SET "taxNumber" = ${record.client.taxNumber},
                  "updatedAt" = NOW()
              WHERE "id" = ${clientId}
            `;
          }
        } else {
          clientId = crypto.randomUUID();

          await tx.$executeRaw`
            INSERT INTO "public"."clients" (
              "id",
              "name",
              "companyName",
              "taxNumber",
              "notes",
              "isActive",
              "createdAt",
              "updatedAt"
            )
            VALUES (
              ${clientId},
              ${record.client.name},
              ${record.client.name},
              ${record.client.taxNumber || null},
              'عميل مسجل عبر التكامل المحاسبي للميديا',
              true,
              NOW(),
              NOW()
            )
          `;
        }

        // Use the actual authenticated accounting user (or delegated admin for media users).
        const createdById = accountingUser.id;
        const mediaActor = (req as any).mediaActorUser as AccountingUser | undefined;
        const actorLabel = mediaActor
          ? `${mediaActor.name} (${mediaActor.role}) عبر لوحة الميديا`
          : `${accountingUser.name} (${accountingUser.role})`;

        // Generate invoice number.
        const year = new Date().getFullYear();

        const countResult = await tx.$queryRaw<any[]>`
          SELECT COUNT(*)::int AS cnt
          FROM "public"."invoices"
          WHERE "invoiceNumber" LIKE ${`OMS-${year}-%`}
        `;

        const seq = String(
          (countResult[0]?.cnt || 0) + 1
        ).padStart(4, '0');

        const invoiceNumber = `OMS-${year}-${seq}`;

        // Calculate invoice amounts.
        const invoiceSubtotal =
          Number(record.netToClient) > 0
            ? Number(record.netToClient)
            : Number(record.cost) > 0
              ? Number(record.cost)
              : 0;

        if (
          !Number.isFinite(invoiceSubtotal) ||
          invoiceSubtotal < 0
        ) {
          throw new Error('INVALID_INVOICE_AMOUNT');
        }

        const vatAmount =
          Math.round(invoiceSubtotal * 0.14 * 100) / 100;

        const totalAmount =
          Math.round((invoiceSubtotal + vatAmount) * 100) / 100;

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + dueDays);

        const invoiceId = crypto.randomUUID();
        const itemId = crypto.randomUUID();
        const taxId = crypto.randomUUID();
        const auditId = crypto.randomUUID();

        const invoiceNotes =
          `فاتورة صادرة عن قسم الميديا: ${
            record.title ||
            record.content?.name ||
            'حملة إعلانية'
          } (${record.month})`;

        const terms =
          `شروط السداد: خلال ${dueDays} يوماً من تاريخ الإصدار بالجنيه المصري`;

        // 1. Create Invoice.
        await tx.$executeRaw`
          INSERT INTO "public"."invoices" (
            "id",
            "invoiceNumber",
            "clientId",
            "createdById",
            "status",
            "issueDate",
            "dueDate",
            "subtotal",
            "discountAmount",
            "taxAmount",
            "totalAmount",
            "paidAmount",
            "remainingBalance",
            "currency",
            "notes",
            "terms",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            ${invoiceId},
            ${invoiceNumber},
            ${clientId},
            ${createdById},
            'DRAFT'::"public"."InvoiceStatus",
            NOW(),
            ${dueDate},
            ${invoiceSubtotal},
            0.00,
            ${vatAmount},
            ${totalAmount},
            0.00,
            ${totalAmount},
            'EGP',
            ${invoiceNotes},
            ${terms},
            NOW(),
            NOW()
          )
        `;

        // 2. Create Invoice Item.
        const channelName =
          record.channel?.name || 'منصة ميديا';

        const contentName =
          record.content?.name || 'محتوى إعلاني';

        const typeName =
          record.content?.contentType?.name || 'إعلان';

        const itemDesc =
          `تنفيذ حملة ميديا (${channelName} - ${contentName} - ${typeName}) شهر: ${record.month}`;

        await tx.$executeRaw`
          INSERT INTO "public"."invoice_items" (
            "id",
            "invoiceId",
            "description",
            "quantity",
            "unitPrice",
            "discount",
            "total",
            "createdAt"
          )
          VALUES (
            ${itemId},
            ${invoiceId},
            ${itemDesc},
            1.00,
            ${invoiceSubtotal},
            0.00,
            ${invoiceSubtotal},
            NOW()
          )
        `;

        // 3. Create Invoice Tax.
        await tx.$executeRaw`
          INSERT INTO "public"."invoice_taxes" (
            "id",
            "invoiceId",
            "taxName",
            "taxRate",
            "taxAmount",
            "isWithholding",
            "createdAt"
          )
          VALUES (
            ${taxId},
            ${invoiceId},
            'ضريبة القيمة المضافة (14%)',
            14.00,
            ${vatAmount},
            false,
            NOW()
          )
        `;

        // 4. Create Audit Log.
        await tx.$executeRaw`
          INSERT INTO "public"."audit_logs" (
            "id",
            "entity",
            "entityId",
            "action",
            "performedById",
            "details",
            "createdAt"
          )
          VALUES (
            ${auditId},
            'INVOICE',
            ${invoiceId},
            'CREATE_FROM_MEDIA',
            ${createdById},
            ${`تم إصدار مسودة فاتورة من قسم الميديا رقم ${invoiceNumber} بمبلغ ${totalAmount} ج.م | بواسطة: ${actorLabel}`},
            NOW()
          )
        `;

        // 5. Link invoice to media record.
        const updatedRecord = await tx.mediaRecord.updateMany({
          where: {
            id: mediaRecordId,
            invoiceId: null,
          },
          data: {
            invoiceId,
            status: 'INVOICED',
          },
        });

        if (updatedRecord.count !== 1) {
          throw new Error('MEDIA_RECORD_ALREADY_LINKED');
        }

        return {
          invoiceId,
          invoiceNumber,
          subtotal: invoiceSubtotal,
          totalAmount,
          vatAmount,
        };
      });

      res.json({
        success: true,
        message: `تم إنشاء الفاتورة المحاسبية رقم (${result.invoiceNumber}) بنجاح وربطها مع قسم الميديا`,
        data: result,
      });
    } catch (error: any) {
      if (error?.message === 'MEDIA_RECORD_NOT_FOUND') {
        res.status(404).json({
          success: false,
          message: 'سجل الميديا غير موجود',
        });
        return;
      }

      if (
        error?.message === 'INVOICE_ALREADY_CREATED' ||
        error?.message === 'MEDIA_RECORD_ALREADY_LINKED'
      ) {
        res.status(409).json({
          success: false,
          message: 'تم بالفعل إصدار فاتورة محاسبية لهذه الحملة سابقاً',
        });
        return;
      }

      if (error?.message === 'INVALID_INVOICE_AMOUNT') {
        res.status(400).json({
          success: false,
          message: 'قيمة الفاتورة غير صالحة',
        });
        return;
      }

      console.error('create-invoice-from-media error:', error);

      res.status(500).json({
        success: false,
        message: 'خطأ أثناء إنشاء الفاتورة المحاسبية',
      });
    }
  }
);

// Get linked accounting invoices.
// Accounting users only.
router.get(
  '/linked-invoices',
  requireAccountingAccess,
  async (req: Request, res: Response) => {
    try {
      const invoices = await prisma.$queryRaw<any[]>`
        SELECT
          i.id,
          i."invoiceNumber",
          i.status,
          i."totalAmount",
          i."paidAmount",
          i."remainingBalance",
          i."dueDate",
          c.name AS "clientName"
        FROM "public"."invoices" i
        JOIN "public"."clients" c
          ON c.id = i."clientId"
        WHERE i.notes LIKE '%قسم الميديا%'
        ORDER BY i."createdAt" DESC
        LIMIT 50
      `;

      res.json({
        success: true,
        data: invoices,
      });
    } catch (error) {
      console.error('linked-invoices error:', error);

      res.status(500).json({
        success: false,
        message: 'خطأ في جلب فواتير قسم المحاسبة',
      });
    }
  }
);

export default router;
