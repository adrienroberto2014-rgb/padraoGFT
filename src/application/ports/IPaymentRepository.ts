import { Payment, PaymentFilters } from '../../core/entities/Payment';

export interface IPaymentRepository {
  getAll(filters?: PaymentFilters): Promise<Payment[]>;
  getById(id: string): Promise<Payment | null>;
  create(payment: Omit<Payment, 'id'>): Promise<string>;
  update(id: string, payment: Partial<Payment>): Promise<void>;
  save(payment: Partial<Payment>): Promise<string>;
  delete(id: string): Promise<void>;
  subscribe(callback: (payments: Payment[]) => void, filters?: PaymentFilters): () => void;
  getByStudentId(studentId: string): Promise<Payment[]>;
}
