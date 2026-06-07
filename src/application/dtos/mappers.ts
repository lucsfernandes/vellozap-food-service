import type { Restaurant } from '../../domain/entities/Restaurant.js';
import type { Product } from '../../domain/entities/Product.js';
import type { Order } from '../../domain/entities/Order.js';
import type { OrderItem } from '../../domain/entities/OrderItem.js';
import type { Employee } from '../../domain/entities/Employee.js';
import type { WorkRecord } from '../../domain/entities/WorkRecord.js';
import type { EmployeePayment } from '../../domain/entities/EmployeePayment.js';
import type { OperatingHours } from '../../domain/entities/OperatingHours.js';
import type { OnboardingProgress } from '../../domain/entities/OnboardingProgress.js';
import type { DeliveryZone } from '../../domain/entities/DeliveryZone.js';
import type { Promotion } from '../../domain/entities/Promotion.js';
import type { Conversation, Message } from '../../domain/entities/whatsapp/Conversation.js';

/**
 * API response shapes. Dates are ISO strings; money is integer BRL cents.
 * These mirror the REST contract (04-api-endpoints.md) and the frontend types.
 */

export interface RestaurantDTO {
  id: string;
  user_id: string;
  restaurant_name: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  responsible_name: string | null;
  cnpj: string | null;
  email: string | null;
  delivery_type: string | null;
  whatsapp_number: string | null;
  delivery_radius: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export function toRestaurantDTO(r: Restaurant): RestaurantDTO {
  return {
    id: r.id,
    user_id: r.userId,
    restaurant_name: r.restaurantName,
    phone: r.phone,
    address: r.address,
    logo_url: r.logoUrl,
    responsible_name: r.responsibleName,
    cnpj: r.cnpj,
    email: r.email,
    delivery_type: r.deliveryType,
    whatsapp_number: r.whatsappNumber,
    delivery_radius: r.deliveryRadius,
    onboarding_completed: r.onboardingCompleted,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  };
}

export interface ProductDTO {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  stock_quantity: number | null;
  category: string | null;
  size: string | null;
  created_at: string;
  updated_at: string;
}

export function toProductDTO(p: Product): ProductDTO {
  return {
    id: p.id,
    restaurant_id: p.restaurantId,
    name: p.name,
    description: p.description,
    price: p.priceCents,
    image_url: p.imageUrl,
    is_available: p.isAvailable,
    stock_quantity: p.stockQuantity,
    category: p.category,
    size: p.size,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

export interface OrderItemDTO {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  created_at: string;
}

export function toOrderItemDTO(i: OrderItem): OrderItemDTO {
  return {
    id: i.id,
    order_id: i.orderId,
    product_id: i.productId,
    quantity: i.quantity,
    unit_price: i.unitPriceCents,
    total_price: i.totalPriceCents,
    notes: i.notes,
    created_at: i.createdAt.toISOString(),
  };
}

export interface OrderDTO {
  id: string;
  restaurant_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  status: string;
  payment_method: string | null;
  payment_status: string | null;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function toOrderDTO(o: Order): OrderDTO {
  return {
    id: o.id,
    restaurant_id: o.restaurantId,
    customer_name: o.customerName,
    customer_phone: o.customerPhone,
    customer_address: o.customerAddress,
    status: o.status,
    payment_method: o.paymentMethod,
    payment_status: o.paymentStatus,
    total_amount: o.totalAmountCents,
    notes: o.notes,
    created_at: o.createdAt.toISOString(),
    updated_at: o.updatedAt.toISOString(),
  };
}

export interface OrderDetailedDTO extends OrderDTO {
  items: OrderItemDTO[];
}

export function toOrderDetailedDTO(o: Order, items: ReadonlyArray<OrderItem>): OrderDetailedDTO {
  return { ...toOrderDTO(o), items: items.map(toOrderItemDTO) };
}

export interface EmployeeDTO {
  id: string;
  restaurant_id: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  payment_type: string | null;
  payment_value: number | null;
  pix_key: string | null;
  bank_name: string | null;
  agency: string | null;
  account: string | null;
  created_at: string;
}

export function toEmployeeDTO(e: Employee): EmployeeDTO {
  return {
    id: e.id,
    restaurant_id: e.restaurantId,
    name: e.name,
    role: e.role,
    phone: e.phone,
    email: e.email,
    payment_type: e.paymentType,
    payment_value: e.paymentValueCents,
    pix_key: e.pixKey,
    bank_name: e.bankName,
    agency: e.agency,
    account: e.account,
    created_at: e.createdAt.toISOString(),
  };
}

export interface WorkRecordDTO {
  id: string;
  employee_id: string;
  work_date: string;
  hours_worked: number | null;
  days_worked: number | null;
  created_at: string;
  updated_at: string;
}

export function toWorkRecordDTO(w: WorkRecord): WorkRecordDTO {
  return {
    id: w.id,
    employee_id: w.employeeId,
    work_date: w.workDate,
    hours_worked: w.hoursWorked,
    days_worked: w.daysWorked,
    created_at: w.createdAt.toISOString(),
    updated_at: w.updatedAt.toISOString(),
  };
}

export interface PaymentRecordDTO {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  total_days: number | null;
  total_hours: number | null;
  total_amount: number;
  payment_status: string;
  payment_date: string | null;
  created_at: string;
  updated_at: string;
  employee?: EmployeeDTO;
}

export function toPaymentRecordDTO(p: EmployeePayment, employee?: Employee): PaymentRecordDTO {
  const base: PaymentRecordDTO = {
    id: p.id,
    employee_id: p.employeeId,
    period_start: p.periodStart,
    period_end: p.periodEnd,
    total_days: p.totalDays,
    total_hours: p.totalHours,
    total_amount: p.totalAmountCents,
    payment_status: p.paymentStatus,
    payment_date: p.paymentDate ? p.paymentDate.toISOString() : null,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
  if (employee) {
    base.employee = toEmployeeDTO(employee);
  }
  return base;
}

export interface OperatingHoursDTO {
  id: string;
  restaurant_id: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
}

export function toOperatingHoursDTO(h: OperatingHours): OperatingHoursDTO {
  return {
    id: h.id,
    restaurant_id: h.restaurantId,
    day_of_week: h.dayOfWeek,
    is_open: h.isOpen,
    open_time: h.openTime,
    close_time: h.closeTime,
  };
}

export interface OnboardingStepDTO {
  step_name: string;
  completed: boolean;
  completed_at: string | null;
}

export function toOnboardingStepDTO(p: OnboardingProgress): OnboardingStepDTO {
  return {
    step_name: p.stepName,
    completed: p.completed,
    completed_at: p.completedAt ? p.completedAt.toISOString() : null,
  };
}

export interface DeliveryZoneDTO {
  id: string;
  minDistance: number;
  maxDistance: number;
  price: number;
  description: string;
}

export function toDeliveryZoneDTO(z: DeliveryZone): DeliveryZoneDTO {
  return {
    id: z.id,
    minDistance: z.minDistance,
    maxDistance: z.maxDistance,
    price: z.priceCents,
    description: z.description,
  };
}

export interface PromotionDTO {
  id: string;
  restaurant_id: string;
  name: string;
  type: string;
  discount: number;
  product_ids: string[] | null;
  valid_from: string | null;
  valid_to: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function toPromotionDTO(p: Promotion): PromotionDTO {
  return {
    id: p.id,
    restaurant_id: p.restaurantId,
    name: p.name,
    type: p.type,
    discount: p.discountCents,
    product_ids: p.productIds,
    valid_from: p.validFrom ? p.validFrom.toISOString() : null,
    valid_to: p.validTo ? p.validTo.toISOString() : null,
    active: p.active,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

export interface ConversationDTO {
  id: string;
  restaurant_id: string;
  customer_name: string | null;
  customer_phone: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  status: string;
  order_id: string | null;
  created_at: string;
  updated_at: string;
}

export function toConversationDTO(c: Conversation): ConversationDTO {
  return {
    id: c.id,
    restaurant_id: c.restaurantId,
    customer_name: c.customerName,
    customer_phone: c.customerPhone,
    last_message: c.lastMessage,
    last_message_at: c.lastMessageAt ? c.lastMessageAt.toISOString() : null,
    unread_count: c.unreadCount,
    status: c.status,
    order_id: c.orderId,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
  };
}

export interface MessageDTO {
  id: string;
  conversation_id: string;
  external_id: string | null;
  text: string;
  is_from_customer: boolean;
  status: string;
  sent_at: string | null;
  created_at: string;
}

export function toMessageDTO(m: Message): MessageDTO {
  return {
    id: m.id,
    conversation_id: m.conversationId,
    external_id: m.externalId,
    text: m.text,
    is_from_customer: m.isFromCustomer,
    status: m.status,
    sent_at: m.sentAt ? m.sentAt.toISOString() : null,
    created_at: m.createdAt.toISOString(),
  };
}
