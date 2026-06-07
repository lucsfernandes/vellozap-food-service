/** Lifecycle status of a customer order. */
export const ORDER_STATUSES = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Payment method chosen at checkout. */
export const PAYMENT_METHODS = ['pix', 'money', 'card'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Whether a payment has been settled. */
export const PAYMENT_STATUSES = ['pending', 'paid'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** How an employee is compensated. */
export const EMPLOYEE_PAYMENT_TYPES = ['daily', 'hourly', 'monthly'] as const;
export type EmployeePaymentType = (typeof EMPLOYEE_PAYMENT_TYPES)[number];

/** Employee job roles used by the dashboard. */
export const EMPLOYEE_ROLES = [
  'auxiliar_cozinha',
  'atendente',
  'cozinheiro',
  'chef',
  'pizzaiolo',
  'motoboy',
  'gerente',
  'caixa',
] as const;
export type EmployeeRole = (typeof EMPLOYEE_ROLES)[number];

/** Menu categories surfaced by the public menu / MenuManagement. */
export const PRODUCT_CATEGORIES = ['menu', 'bebidas', 'sobremesas'] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** Application RBAC roles. */
export const APP_ROLES = ['owner', 'employee'] as const;
export type AppRole = (typeof APP_ROLES)[number];

/** Status of a WhatsApp conversation in the inbox. */
export const CONVERSATION_STATUSES = ['nova', 'em_atendimento', 'finalizada'] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

/** Delivery status of an outgoing/incoming WhatsApp message. */
export const MESSAGE_STATUSES = ['queued', 'sent', 'delivered', 'read', 'failed', 'received'] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];
