import { Invoice, InvoiceFilters } from '../../core/entities/Invoice';

export interface IInvoiceRepository {
  getAll(filters?: InvoiceFilters): Promise<Invoice[]>;
  getById(id: string): Promise<Invoice | null>;
  create(invoice: Omit<Invoice, 'id'>): Promise<string>;
  update(id: string, invoice: Partial<Invoice>): Promise<void>;
  save(invoice: Partial<Invoice>): Promise<string>;
  delete(id: string): Promise<void>;
  subscribe(callback: (invoices: Invoice[]) => void, filters?: InvoiceFilters): () => void;
  getByStudentId(studentId: string): Promise<Invoice[]>;
}
