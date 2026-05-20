import { 
  Firestore, 
  where, 
  QueryConstraint,
  limit as firestoreLimit
} from 'firebase/firestore';
import { Invoice, InvoiceFilters } from '../../../core/entities/Invoice';
import { IInvoiceRepository } from '../../../application/ports/IInvoiceRepository';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';

export class FirestoreInvoiceRepository extends BaseFirestoreRepository<Invoice> implements IInvoiceRepository {
  constructor(db: Firestore, tenantId: string = 'default_gym') {
    super(db, 'invoices', 'dueDate', tenantId);
  }

  private buildConstraints(filters?: InvoiceFilters): QueryConstraint[] {
    const constraints: QueryConstraint[] = [];
    if (filters?.studentId) {
      constraints.push(where('studentId', '==', filters.studentId));
    }
    if (filters?.status) {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters?.startDate) {
      constraints.push(where('dueDate', '>=', filters.startDate));
    }
    if (filters?.endDate) {
      constraints.push(where('dueDate', '<=', filters.endDate));
    }
    if (filters?.limit) {
      constraints.push(firestoreLimit(filters.limit));
    }
    return constraints;
  }

  async getAll(filters?: InvoiceFilters): Promise<Invoice[]> {
    return this.getWithConstraints(...this.buildConstraints(filters));
  }

  async getByStudentId(studentId: string): Promise<Invoice[]> {
    return this.getAll({ studentId });
  }

  subscribe(callback: (invoices: Invoice[]) => void, filters?: InvoiceFilters): () => void {
    return this.subscribeWithConstraints(callback, ...this.buildConstraints(filters));
  }
}
