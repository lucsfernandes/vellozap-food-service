import { inject, injectable } from 'tsyringe';
import type { IOrderRepository } from '../../ports/repositories/IOrderRepository.js';
import type { IEmployeeRepository } from '../../ports/repositories/IEmployeeRepository.js';
import type { IEmployeePaymentRepository } from '../../ports/repositories/IEmployeePaymentRepository.js';
import type { IClock } from '../../ports/IClock.js';
import type {
  CsvColumn,
  ExportFile,
  ICsvExportService,
  IPdfExportService,
} from '../../ports/IExportService.js';
import type { Order } from '../../../domain/entities/Order.js';
import type { EmployeePayment } from '../../../domain/entities/EmployeePayment.js';
import type { Employee } from '../../../domain/entities/Employee.js';
import { RestaurantContextResolver } from '../../services/RestaurantContextResolver.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export interface ExportOrdersInput {
  format: 'csv' | 'pdf';
  period?: number | undefined;
  from?: string | undefined;
  to?: string | undefined;
}

@injectable()
export class ExportOrders {
  public constructor(
    @inject(TOKENS.OrderRepository) private readonly orders: IOrderRepository,
    @inject(TOKENS.Clock) private readonly clock: IClock,
    @inject(TOKENS.CsvExportService) private readonly csv: ICsvExportService,
    @inject(TOKENS.PdfExportService) private readonly pdf: IPdfExportService,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, input: ExportOrdersInput): Promise<ExportFile> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const from = this.resolveFrom(input);
    const to = input.to ? new Date(input.to) : undefined;
    const filter: { from?: Date; to?: Date; pageSize: number } = { pageSize: 10000 };
    if (from) filter.from = from;
    if (to) filter.to = to;
    const { data } = await this.orders.listByRestaurant(restaurantId, filter);

    if (input.format === 'csv') {
      const columns: CsvColumn<Order>[] = [
        { header: 'ID', value: (o) => o.id },
        { header: 'Cliente', value: (o) => o.customerName },
        { header: 'Telefone', value: (o) => o.customerPhone },
        { header: 'Status', value: (o) => o.status },
        { header: 'Pagamento', value: (o) => o.paymentMethod ?? '' },
        { header: 'Total', value: (o) => brl(o.totalAmountCents) },
        { header: 'Data', value: (o) => o.createdAt.toISOString() },
      ];
      return this.csv.toCsv(data, columns, 'pedidos.csv');
    }

    const headers = ['ID', 'Cliente', 'Status', 'Total', 'Data'];
    const rows = data.map((o) => [
      o.id.slice(0, 8),
      o.customerName,
      o.status,
      brl(o.totalAmountCents),
      o.createdAt.toISOString().slice(0, 10),
    ]);
    return this.pdf.toPdf('Relatório de Pedidos', headers, rows, 'pedidos.pdf');
  }

  private resolveFrom(input: ExportOrdersInput): Date | undefined {
    if (input.from) {
      return new Date(input.from);
    }
    if (input.period) {
      const from = this.clock.now();
      from.setDate(from.getDate() - input.period);
      return from;
    }
    return undefined;
  }
}

export interface ExportPaymentsInput {
  format: 'csv';
  from: string;
  to: string;
}

@injectable()
export class ExportPayments {
  public constructor(
    @inject(TOKENS.EmployeeRepository) private readonly employees: IEmployeeRepository,
    @inject(TOKENS.EmployeePaymentRepository) private readonly payments: IEmployeePaymentRepository,
    @inject(TOKENS.CsvExportService) private readonly csv: ICsvExportService,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, input: ExportPaymentsInput): Promise<ExportFile> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const employees = await this.employees.listByRestaurant(restaurantId);
    const byId = new Map(employees.map((e) => [e.id, e]));
    const rows = await this.payments.listByEmployeeIds([...byId.keys()], {
      from: input.from,
      to: input.to,
    });

    type Row = { payment: EmployeePayment; employee: Employee | undefined };
    const data: Row[] = rows.map((p) => ({ payment: p, employee: byId.get(p.employeeId) }));

    const columns: CsvColumn<Row>[] = [
      { header: 'Nome', value: (r) => r.employee?.name ?? '' },
      { header: 'Função', value: (r) => r.employee?.role ?? '' },
      { header: 'Forma', value: (r) => r.employee?.paymentType ?? '' },
      { header: 'Total', value: (r) => brl(r.payment.totalAmountCents) },
      { header: 'PIX', value: (r) => r.employee?.pixKey ?? '' },
      { header: 'Banco', value: (r) => r.employee?.bankName ?? '' },
      { header: 'Agência', value: (r) => r.employee?.agency ?? '' },
      { header: 'Conta', value: (r) => r.employee?.account ?? '' },
      { header: 'Status', value: (r) => r.payment.paymentStatus },
    ];
    return this.csv.toCsv(data, columns, 'pagamentos.csv');
  }
}
