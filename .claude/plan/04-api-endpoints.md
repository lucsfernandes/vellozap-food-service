# 04 — Contrato REST da API

Convenções gerais:
- Base: `/api`. JSON em todas as respostas. Datas ISO-8601 (UTC). Dinheiro em **centavos** (`number`) nos contratos (frontend formata BRL).
- Auth: `Authorization: Bearer <accessToken>`. Refresh via cookie httpOnly ou body.
- `owner` = dono autenticado; `employee` = funcionário; `public` = sem auth.
- Erros padronizados: `{ error: { code, message, details? } }` com HTTP status (404/403/401/409/422/500).
- O `restaurantId` do owner **nunca** é aceito do cliente em rotas de owner: é resolvido do token. Rotas públicas usam um identificador público do restaurante (slug/id) na URL.

Derivado das operações reais (`useRestaurantProfile`, `useOnboarding`, `ProductsStep`, `TeamStep`, `EmployeeForm`, `WorkRecordForm`) e do contrato funcional dos componentes mock (`MenuManagement`, `PaymentControl`, `DeliveryZoneManager`, `OrderExport`, `WhatsAppChat`, `Checkout`, `PublicMenu`, `RestaurantDashboard`).

---

## Auth (`/api/auth`)
| Método | Path | Auth | Request (resumo) | Response (resumo) |
|---|---|---|---|---|
| POST | `/signup` | public | `{ email, password, restaurantName }` | `{ accessToken, user, restaurant }` + cookie refresh |
| POST | `/login` | public | `{ email, password }` | `{ accessToken, user }` + cookie refresh |
| POST | `/refresh` | public (refresh) | cookie/`{ refreshToken }` | `{ accessToken }` (rotaciona refresh) |
| POST | `/logout` | auth | — | `204` |
| GET | `/me` | auth | — | `{ user, restaurant, role }` |
| POST | `/oauth/google` | public | `{ idToken }` | `{ accessToken, user }` (extensão futura) |
| POST | `/password-reset/request` | public | `{ email }` | `204` (sempre) |
| POST | `/password-reset/confirm` | public | `{ token, newPassword }` | `204` |

## Restaurant Profile (`/api/restaurant`)
Substitui `useRestaurantProfile`.
| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/me` | owner | — | `RestaurantProfile` |
| PATCH | `/me` | owner | `Partial<RestaurantProfile>` (restaurant_name, phone, address, logo_url, responsible_name, cnpj, email, delivery_type, whatsapp_number, delivery_radius) | `RestaurantProfile` |
| POST | `/me/logo` | owner | multipart file | `{ logo_url }` (substitui `LogoUpload`/supabase.storage) |

`RestaurantProfile` = todos os campos de `restaurant_profiles` + `onboarding_completed`.

## Products (`/api/products`)
Substitui `ProductsStep` e cobre `MenuManagement`.
| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/` | owner | query `?available=&category=&limit=` | `Product[]` (escopo do restaurante do owner) |
| POST | `/` | owner | `{ name, description?, price, image_url?, is_available?, stock_quantity?, category?, size? }` | `Product` |
| GET | `/:id` | owner | — | `Product` |
| PATCH | `/:id` | owner | `Partial<Product>` | `Product` |
| DELETE | `/:id` | owner | — | `204` |
| POST | `/:id/image` | owner | multipart | `{ image_url }` |

> `category`/`size` dependem de migration aditiva (ver `02`).

## Public Menu (`/api/public`)
Substitui `PublicMenu`/`Checkout` (hoje mock).
| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/restaurants/:restaurantId/menu` | public | — | `{ restaurant: {name, logo_url, ...}, products: Product[] (somente is_available) }` |
| POST | `/restaurants/:restaurantId/orders` | public | `CreateOrderRequest` | `{ orderId, status, total_amount }` |
| GET | `/orders/:orderId/status` | public (por token/uuid) | — | `{ status, items, total_amount }` |

`CreateOrderRequest` (a partir de `Checkout`): `{ customer: {name, phone, address, neighborhood, number, complement?, reference?}, items: [{product_id, quantity, notes?}], payment_method: 'pix'|'money'|'card', notes? }`. O backend recalcula `unit_price`/`total_price`/`total_amount` a partir dos produtos (não confiar em preço do cliente) e aplica taxa de entrega (ver Delivery).

## Orders (`/api/orders`) — dashboard owner
Cobre aba Pedidos/Visão Geral do `RestaurantDashboard`.
| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/` | owner | query `?status=&from=&to=&page=` | `{ data: Order[], total }` |
| GET | `/stats` | owner | query `?period=hoje|semana|mes` | `{ totalOrders, totalRevenue, avgOrderValue, pendingOrders, deliveredOrders }` |
| GET | `/:id` | owner | — | `OrderDetailed` (com items) |
| PATCH | `/:id/status` | owner/employee | `{ status }` | `Order` |
| POST | `/export` | owner | `{ format: 'csv'|'pdf', period?: number, from?, to? }` | arquivo (stream) ou `{ url }` |

`Order` = campos de `orders`. `OrderDetailed` inclui `items: OrderItem[]` (join `order_items` + `products`).
Status válidos: `pending|preparing|ready|delivered|cancelled` (transições validadas por `OrderStatusPolicy`).

## Order Items (`/api/orders/:orderId/items`)
Normalmente manipulados junto do pedido; expostos para edição pontual.
| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/` | owner | — | `OrderItem[]` |
| POST | `/` | owner | `{ product_id, quantity, notes? }` | `OrderItem` (recalcula total do pedido) |
| PATCH | `/:itemId` | owner | `{ quantity?, notes? }` | `OrderItem` |
| DELETE | `/:itemId` | owner | — | `204` |

## Employees (`/api/employees`)
Substitui `TeamStep`/`EmployeeForm`/`TeamManagement`.
| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/` | owner | query `?role=` | `Employee[]` |
| POST | `/` | owner | `{ name, role, phone?, email?, payment_type?, payment_value?, pix_key?, bank_name?, agency?, account? }` | `Employee` |
| GET | `/:id` | owner | — | `Employee` |
| PATCH | `/:id` | owner | `Partial<Employee>` | `Employee` |
| DELETE | `/:id` | owner | — | `204` |

`role` ∈ {auxiliar_cozinha, atendente, cozinheiro, chef, pizzaiolo, motoboy, gerente, caixa}. `payment_type` ∈ {daily, hourly, monthly}.

## Work Records (`/api/employees/:employeeId/work-records`)
Substitui `WorkRecordForm`.
| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/` | owner | query `?from=&to=` | `WorkRecord[]` |
| POST | `/` | owner | `{ work_date, hours_worked?, days_worked? }` (regra: hourly→hours, daily→days) | `WorkRecord` |
| DELETE | `/:recordId` | owner | — | `204` |

## Employee Payments (`/api/payments`)
Substitui `PaymentControl`.
| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/calculate` | owner | `{ period: 'current_month'|'last_month'|'custom', from?, to? }` | `PaymentRecord[]` (calcula por funcionário somando work_records × payment_value; monthly = valor fixo) |
| GET | `/` | owner | query `?status=&from=&to=` | `PaymentRecord[]` |
| POST | `/:id/pay` | owner | — | `PaymentRecord` (payment_status='paid', payment_date=now) |
| POST | `/export` | owner | `{ format: 'csv', from, to }` | arquivo CSV (colunas: Nome, Função, Forma, Total, PIX, Banco, Agência, Conta, Status) |

`PaymentRecord` = `employee_payments` + `employee` embutido (para o CSV/UI).

## Operating Hours (`/api/operating-hours`)
Cobre `RestaurantSettings` (horários).
| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/` | owner | — | `OperatingHours[]` (7 dias) |
| PUT | `/` | owner | `OperatingHours[]` (upsert por day_of_week) | `OperatingHours[]` |

`OperatingHours` = `{ day_of_week 0-6, is_open, open_time?, close_time? }`.

## Onboarding (`/api/onboarding`)
Substitui `useOnboarding`.
| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/progress` | owner | — | `{ steps: [{ step_name, completed, completed_at }] }` |
| POST | `/progress/:stepName/complete` | owner | — | `{ step_name, completed:true }` (upsert) |
| POST | `/complete` | owner | — | `{ onboarding_completed: true }` (seta em restaurant_profiles) |

Steps: `welcome, restaurant_info, products, team, whatsapp, completion`.

## Delivery (`/api/delivery`)
Substitui `useDeliveryCalculator` + `DeliveryZoneManager`.
| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/zones` | owner | — | `DeliveryZone[]` |
| PUT | `/zones` | owner | `DeliveryZone[]` (substitui conjunto) | `DeliveryZone[]` |
| POST | `/calculate` | owner/public | `{ originCep?, customerCep }` | `{ distance, zone, deliveryFee, canDeliver, message }` |

`DeliveryZone` = `{ id?, minDistance, maxDistance, price, description }`. Cálculo de distância via `IDistanceProvider` (mock em v1, ViaCEP/Maps depois).

## Promotions (`/api/promotions`) — estrutura inicial
Hoje `PromotionsManagement` está vazio; endpoints previstos:
| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/` | owner | — | `Promotion[]` |
| POST | `/` | owner | `{ name, type, discount, products?, validFrom?, validTo?, active }` | `Promotion` |
| PATCH | `/:id` | owner | `Partial<Promotion>` | `Promotion` |
| DELETE | `/:id` | owner | — | `204` |

(Implementação após tabela `promotions` — fora da v1 mínima.)

## Export (`/api/export`)
Consolidado (orders/payments também têm `/export` próprios). Substitui `OrderExport`/`ExportPeriodModal`.
| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/orders` | owner | `{ format:'csv'|'pdf', period?:7|15|30, from?, to? }` | arquivo |
| POST | `/payments` | owner | `{ format:'csv', from, to }` | arquivo |

## WhatsApp (`/api/whatsapp`) — ver `05`
| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/webhook/evolution` | public (assinado) | payload Evolution | `200` |
| POST | `/webhook/n8n` | public (assinado) | payload N8N | `200` |
| GET | `/conversations` | owner | query `?status=` | `Conversation[]` |
| GET | `/conversations/:id/messages` | owner | — | `Message[]` |
| POST | `/conversations/:id/messages` | owner | `{ text }` | `Message` (envia via provider) |
| POST | `/messages/send` | owner | `{ to, text, template? }` | `{ messageId }` |
| GET | `/status` | owner | — | `{ provider, connected }` |

Conversa/Message conforme `WhatsAppChat` (status `nova|em_atendimento|finalizada`, `unreadCount`, `orderId?`).
