import { z } from 'zod';
import {
  EMPLOYEE_PAYMENT_TYPES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PRODUCT_CATEGORIES,
} from '../../domain/enums/index.js';

const intCents = z.number().int().nonnegative();

// ---- Auth ----
export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  restaurantName: z.string().min(1),
});
export type SignUpBody = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type SignInBody = z.infer<typeof signInSchema>;

export const refreshSchema = z.object({ refreshToken: z.string().optional() });

// ---- Restaurant ----
export const updateRestaurantSchema = z
  .object({
    restaurant_name: z.string().min(1),
    phone: z.string().nullable(),
    address: z.string().nullable(),
    logo_url: z.string().nullable(),
    responsible_name: z.string().nullable(),
    cnpj: z.string().nullable(),
    email: z.string().email().nullable(),
    delivery_type: z.string().nullable(),
    whatsapp_number: z.string().nullable(),
    delivery_radius: z.string().nullable(),
  })
  .partial();
export type UpdateRestaurantBody = z.infer<typeof updateRestaurantSchema>;

// ---- Products ----
export const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price: intCents,
  image_url: z.string().nullable().optional(),
  is_available: z.boolean().optional(),
  stock_quantity: z.number().int().nullable().optional(),
  category: z.enum(PRODUCT_CATEGORIES).nullable().optional(),
  size: z.string().nullable().optional(),
});
export type CreateProductBody = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductBody = z.infer<typeof updateProductSchema>;

// ---- Employees ----
export const createEmployeeSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  payment_type: z.enum(EMPLOYEE_PAYMENT_TYPES).nullable().optional(),
  payment_value: intCents.nullable().optional(),
  pix_key: z.string().nullable().optional(),
  bank_name: z.string().nullable().optional(),
  agency: z.string().nullable().optional(),
  account: z.string().nullable().optional(),
});
export type CreateEmployeeBody = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = createEmployeeSchema.partial();
export type UpdateEmployeeBody = z.infer<typeof updateEmployeeSchema>;

// ---- Work records ----
export const createWorkRecordSchema = z
  .object({
    work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    hours_worked: z.number().nonnegative().nullable().optional(),
    days_worked: z.number().int().nonnegative().nullable().optional(),
  })
  .refine((v) => v.hours_worked != null || v.days_worked != null, {
    message: 'Either hours_worked or days_worked is required',
  });
export type CreateWorkRecordBody = z.infer<typeof createWorkRecordSchema>;

// ---- Operating hours ----
export const operatingHoursSchema = z.array(
  z.object({
    day_of_week: z.number().int().min(0).max(6),
    is_open: z.boolean(),
    open_time: z.string().nullable().optional(),
    close_time: z.string().nullable().optional(),
  }),
);
export type OperatingHoursBody = z.infer<typeof operatingHoursSchema>;

// ---- Delivery ----
export const deliveryZonesSchema = z.array(
  z
    .object({
      minDistance: z.number().nonnegative(),
      maxDistance: z.number().nonnegative(),
      price: intCents,
      description: z.string().default(''),
    })
    .refine((z) => z.minDistance <= z.maxDistance, {
      message: 'minDistance must be less than or equal to maxDistance',
      path: ['maxDistance'],
    }),
);
export type DeliveryZonesBody = z.infer<typeof deliveryZonesSchema>;

export const calculateDeliverySchema = z.object({
  originCep: z.string().optional(),
  customerCep: z.string().min(1),
});
export type CalculateDeliveryBody = z.infer<typeof calculateDeliverySchema>;

// ---- Orders (public checkout) ----
export const createOrderSchema = z.object({
  customer: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    address: z.string().optional(),
    neighborhood: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    reference: z.string().optional(),
    cep: z.string().optional(),
  }),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().positive().max(999),
        notes: z.string().optional(),
      }),
    )
    .min(1),
  payment_method: z.enum(PAYMENT_METHODS),
  notes: z.string().optional(),
});
export type CreateOrderBody = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({ status: z.enum(ORDER_STATUSES) });
export type UpdateOrderStatusBody = z.infer<typeof updateOrderStatusSchema>;

export const addOrderItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive().max(999),
  notes: z.string().optional(),
});
export const updateOrderItemSchema = z.object({
  quantity: z.number().int().positive().max(999).optional(),
  notes: z.string().nullable().optional(),
});

// ---- Payments ----
export const calculatePaymentsSchema = z.object({
  period: z.enum(['current_month', 'last_month', 'custom']),
  from: z.string().optional(),
  to: z.string().optional(),
});
export type CalculatePaymentsBody = z.infer<typeof calculatePaymentsSchema>;

// ---- Export ----
export const exportOrdersSchema = z.object({
  format: z.enum(['csv', 'pdf']),
  period: z.number().int().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
export const exportPaymentsSchema = z.object({
  format: z.literal('csv'),
  from: z.string(),
  to: z.string(),
});

// ---- Promotions ----
export const createPromotionSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  discount: intCents.default(0),
  products: z.array(z.string()).nullable().optional(),
  validFrom: z.string().nullable().optional(),
  validTo: z.string().nullable().optional(),
  active: z.boolean().default(true),
});
export const updatePromotionSchema = createPromotionSchema.partial();

// ---- WhatsApp ----
export const sendMessageSchema = z.object({ text: z.string().min(1) });
export const sendDirectMessageSchema = z.object({
  to: z.string().min(1),
  text: z.string().min(1),
  template: z.object({ name: z.string(), params: z.record(z.string()) }).optional(),
});
