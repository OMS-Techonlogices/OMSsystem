import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let prisma: any;

if (process.env.DATABASE_URL) {
  // Use official real PrismaClient connecting to PostgreSQL
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
} else {
  // Fallback to Supabase REST proxy if only Supabase credentials exist
  const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const tableMap: Record<string, string> = {
    user: 'users',
    client: 'clients',
    service: 'services',
    approvalRule: 'approval_rules',
    invoice: 'invoices',
    invoiceItem: 'invoice_items',
    invoiceTax: 'invoice_taxes',
    approvalStep: 'approval_steps',
    payment: 'payments',
    deliveryLog: 'delivery_logs',
    auditLog: 'audit_logs',
  };

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function applyWhere(query: any, where: any) {
    if (!where) return query;
    for (const [key, val] of Object.entries(where)) {
      if (val === undefined) continue;
      if (key === 'OR' && Array.isArray(val)) {
        const orParts = val
          .map((cond: any) =>
            Object.entries(cond)
              .map(([k, v]: [string, any]) => {
                if (typeof v === 'object' && v?.contains) return `${k}.ilike.%${v.contains}%`;
                return `${k}.eq.${v}`;
              })
              .join(',')
          )
          .join(',');
        if (orParts) query = query.or(orParts);
      } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        if ('contains' in val) query = query.ilike(key, `%${(val as any).contains}%`);
        else if ('in' in val) query = query.in(key, (val as any).in);
        else if ('gte' in val) query = query.gte(key, (val as any).gte);
        else if ('lte' in val) query = query.lte(key, (val as any).lte);
        else if ('gt' in val) query = query.gt(key, (val as any).gt);
        else if ('lt' in val) query = query.lt(key, (val as any).lt);
      } else {
        query = query.eq(key, val);
      }
    }
    return query;
  }

  function createModelProxy(tableName: string) {
    return {
      async findUnique({ where }: any) {
        let query = supabase.from(tableName).select('*');
        query = applyWhere(query, where);
        const { data, error } = await query.maybeSingle();
        if (error) throw new Error(error.message);
        return data;
      },
      async findFirst({ where, orderBy }: any = {}) {
        let query = supabase.from(tableName).select('*');
        query = applyWhere(query, where);
        if (orderBy) {
          const [col, dir] = Object.entries(orderBy)[0];
          query = query.order(col, { ascending: dir === 'asc' });
        }
        query = query.limit(1);
        const { data, error } = await query.maybeSingle();
        if (error) throw new Error(error.message);
        return data;
      },
      async findMany({ where, orderBy, take, skip }: any = {}) {
        let query = supabase.from(tableName).select('*');
        query = applyWhere(query, where);
        if (orderBy) {
          const [col, dir] = Object.entries(orderBy)[0];
          query = query.order(col, { ascending: dir === 'asc' });
        }
        if (take) query = query.limit(take);
        if (skip) query = query.range(skip, skip + (take || 100) - 1);
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data || [];
      },
      async create({ data }: any) {
        const payload = { id: generateUUID(), ...data };
        const { data: created, error } = await supabase.from(tableName).insert(payload).select().single();
        if (error) throw new Error(error.message);
        return created;
      },
      async update({ where, data }: any) {
        let query = supabase.from(tableName).update({ ...data, updatedAt: new Date().toISOString() });
        query = applyWhere(query, where);
        const { data: updated, error } = await query.select().single();
        if (error) throw new Error(error.message);
        return updated;
      },
      async upsert({ where, create, update }: any) {
        const existing = await this.findUnique({ where });
        if (existing) return this.update({ where, data: update });
        return this.create({ data: create });
      },
      async delete({ where }: any) {
        let query = supabase.from(tableName).delete();
        query = applyWhere(query, where);
        const { data: deleted, error } = await query.select().single();
        if (error) throw new Error(error.message);
        return deleted;
      },
      async deleteMany({ where }: any = {}) {
        let query = supabase.from(tableName).delete();
        query = applyWhere(query, where);
        const { error } = await query;
        if (error) throw new Error(error.message);
        return { count: 1 };
      },
      async count({ where }: any = {}) {
        let query = supabase.from(tableName).select('*', { count: 'exact', head: true });
        query = applyWhere(query, where);
        const { count, error } = await query;
        if (error) throw new Error(error.message);
        return count || 0;
      },
    };
  }

  const handler: ProxyHandler<any> = {
    get(target, prop: string) {
      if (prop === '$transaction') {
        return async (arg: any) => {
          if (typeof arg === 'function') return arg(prisma);
          return Promise.all(arg);
        };
      }
      if (prop === '$disconnect' || prop === '$connect') return async () => {};
      if (tableMap[prop]) return createModelProxy(tableMap[prop]);
      return target[prop];
    },
  };

  prisma = new Proxy({}, handler);
}

export default prisma;
export { prisma };
