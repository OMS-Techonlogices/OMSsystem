import { Response } from 'express';
import { z } from 'zod';
import prisma from '../../prisma/prismaClient.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';

const clientSchema = z.object({
  name: z.string().min(2, 'اسم العميل مطلوب'),
  companyName: z.string().optional(),
  email: z.string().email('صيغة البريد غير صحيحة').optional().or(z.literal('')),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  taxNumber: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const getClients = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const clients = await prisma.client.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    });

    res.json({ success: true, data: clients });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات العملاء' });
  }
};

export const getClientById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) {
      res.status(404).json({ success: false, message: 'العميل غير موجود' });
      return;
    }

    res.json({ success: true, data: client });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'خطأ في جلب تفاصيل العميل' });
  }
};

export const createClient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parseResult = clientSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.errors });
      return;
    }

    const client = await prisma.client.create({
      data: parseResult.data as any,
    });

    res.status(201).json({ success: true, data: client, message: 'تم إضافة العميل بنجاح' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'خطأ في إضافة العميل' });
  }
};

export const updateClient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parseResult = clientSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.errors });
      return;
    }

    const oldClient = await prisma.client.findUnique({ where: { id } });

    const client = await prisma.client.update({
      where: { id },
      data: parseResult.data,
    });

    // Keep media clients table in sync if matching client exists
    try {
      if (oldClient) {
        await prisma.$executeRaw`
          UPDATE "media"."clients"
          SET "name" = ${client.name}, "taxNumber" = ${client.taxNumber || null}, "updatedAt" = NOW()
          WHERE "name" = ${oldClient.name} OR "name" = ${client.name}
        `;
      }
    } catch {
      // Silently ignore if media table or record doesn't match
    }

    res.json({ success: true, data: client, message: 'تم تحديث بيانات العميل بنجاح' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'خطأ في تحديث بيانات العميل' });
  }
};

export const deleteClient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // Check if client has existing invoices
    const count = await prisma.invoice.count({ where: { clientId: id } });
    if (count > 0) {
      // Soft delete to protect financial records
      await prisma.client.update({
        where: { id },
        data: { isActive: false },
      });
      res.json({ success: true, message: 'تم حذف العميل بنجاح (وأرشفة سجلاته لحماية الفواتير السابقة)' });
      return;
    }

    // Hard delete if no invoices exist
    await prisma.client.delete({
      where: { id },
    });

    res.json({ success: true, message: 'تم حذف العميل بنجاح' });
  } catch (error: any) {
    try {
      await prisma.client.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });
      res.json({ success: true, message: 'تم حذف العميل بنجاح' });
    } catch {
      res.status(500).json({ success: false, message: 'خطأ في حذف العميل' });
    }
  }
};
