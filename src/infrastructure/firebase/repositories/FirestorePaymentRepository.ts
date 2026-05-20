import { 
  Firestore,
  where,
  QueryConstraint,
  limit as firestoreLimit
} from 'firebase/firestore';
import { Payment, PaymentFilters } from '../../../core/entities/Payment';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';
import { IPaymentRepository } from '../../../application/ports/IPaymentRepository';

export class FirestorePaymentRepository extends BaseFirestoreRepository<Payment> implements IPaymentRepository {
  constructor(db: Firestore, tenantId: string = 'default_gym') {
    super(db, 'payments', 'date', tenantId);
  }

  private buildConstraints(filters?: PaymentFilters): QueryConstraint[] {
    const constraints: QueryConstraint[] = [];
    if (filters?.studentId) {
      constraints.push(where('studentId', '==', filters.studentId));
    }
    if (filters?.studentIds && Array.isArray(filters.studentIds) && filters.studentIds.length > 0) {
      constraints.push(where('studentId', 'in', filters.studentIds));
    }
    if (filters?.startDate) {
      constraints.push(where('date', '>=', filters.startDate));
    }
    if (filters?.endDate) {
      constraints.push(where('date', '<=', filters.endDate));
    }
    if (filters?.limit) {
      constraints.push(firestoreLimit(filters.limit));
    }
    return constraints;
  }

  async getAll(filters?: PaymentFilters): Promise<Payment[]> {
    return this.getWithConstraints(...this.buildConstraints(filters));
  }

  async getByStudentId(studentId: string): Promise<Payment[]> {
    return this.getAll({ studentId });
  }

  subscribe(callback: (payments: Payment[]) => void, filters?: PaymentFilters): () => void {
    return this.subscribeWithConstraints(callback, ...this.buildConstraints(filters));
  }
}
