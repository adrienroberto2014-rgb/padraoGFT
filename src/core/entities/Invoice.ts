import { Timestamp } from 'firebase/firestore';

export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'voided';

export interface InvoiceItem {
  description: string;
  amount: number;
}

export interface Invoice {
  id: string;
  studentId: string;
  studentName: string;
  subscriptionId?: string;
  amount: number;
  dueDate: Timestamp;
  status: InvoiceStatus;
  paidAt?: Timestamp;
  items: InvoiceItem[];
  periodStart?: Timestamp;
  periodEnd?: Timestamp;
  externalId?: string; // Stripe/MercadoPago Invoice ID
  createdAt: Timestamp;
  tenantId: string;
}

export interface InvoiceFilters {
  studentId?: string;
  status?: InvoiceStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}
