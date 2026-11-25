import { Response } from 'express';
import { z } from 'zod';
import prisma from '../../prisma/prismaClient.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';

const serviceSchema = z.object({
  nameAr: z.string().min(2, 'الاسم بالعربية مطلوب'),
  nameEn: z.string().min(2, 'الاسم بالإنجليزية مطلوب'),
  description: z.string().optional(),
  defaultPrice: z.number().nonnegative('السعر الافتراضي يجب أن يكون أكبر من أو يساوي صفر'),
  defaultTaxRate: z.number().nonnegative('نسبة الضريبة يجب أن تكون أكبر من أو تساوي صفر').default(14.00),
});

export const getServices = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: services });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات الخدمات' });
  }
};

export const createService = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parseResult = serviceSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.errors });
      return;
    }

    const service = await prisma.service.create({
      data: parseResult.data as any,
    });

    res.status(201).json({ success: true, data: service, message: 'تم إضافة الخدمة بنجاح' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'خطأ في إضافة الخدمة' });
  }
};

export const updateService = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parseResult = serviceSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.errors });
      return;
    }

    const service = await prisma.service.update({
      where: { id },
      data: parseResult.data,
    });

    res.json({ success: true, data: service, message: 'تم تحديث بيانات الخدمة بنجاح' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'خطأ في تحديث الخدمة' });
  }
};

export const deleteService = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // Check if service is linked to existing invoices
    const count = await prisma.invoiceItem.count({ where: { serviceId: id } });
    if (count > 0) {
      // Soft delete so previous invoices stay intact
      await prisma.service.update({
        where: { id },
        data: { isActive: false },
      });
      res.json({ success: true, message: 'تم حذف الخدمة بنجاح (وأرشفة سجلاتها للحفاظ على الفواتير السابقة)' });
      return;
    }

    // Hard delete if never used
    await prisma.service.delete({
      where: { id },
    });

    res.json({ success: true, message: 'تم حذف الخدمة بنجاح' });
  } catch (error: any) {
    try {
      await prisma.service.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });
      res.json({ success: true, message: 'تم حذف الخدمة بنجاح' });
    } catch {
      res.status(500).json({ success: false, message: 'خطأ في حذف الخدمة' });
    }
  }
};
