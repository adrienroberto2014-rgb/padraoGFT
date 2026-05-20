import { 
  Firestore,
  where,
  QueryConstraint,
  limit as firestoreLimit
} from 'firebase/firestore';
import { CheckIn, CheckInFilters } from '../../../core/entities/CheckIn';
import { ICheckInRepository } from '../../../application/ports/ICheckInRepository';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';

export class FirestoreCheckInRepository extends BaseFirestoreRepository<CheckIn> implements ICheckInRepository {
  constructor(db: Firestore, tenantId: string = 'default_gym') {
    super(db, 'checkins', 'time', tenantId);
  }

  private buildConstraints(filters?: CheckInFilters): QueryConstraint[] {
    const constraints: QueryConstraint[] = [];
    if (filters?.studentId) {
      constraints.push(where('studentId', '==', filters.studentId));
    }
    if (filters?.studentIds && Array.isArray(filters.studentIds) && filters.studentIds.length > 0) {
      constraints.push(where('studentId', 'in', filters.studentIds));
    }
    if (filters?.classId) {
      constraints.push(where('classId', '==', filters.classId));
    }
    if (filters?.limit) {
      constraints.push(firestoreLimit(filters.limit));
    }
    return constraints;
  }

  async getAll(filters?: CheckInFilters): Promise<CheckIn[]> {
    return this.getWithConstraints(...this.buildConstraints(filters));
  }

  async getByStudentId(studentId: string): Promise<CheckIn[]> {
    return this.getAll({ studentId });
  }

  subscribe(callback: (checkIns: CheckIn[]) => void, filters?: CheckInFilters): () => void {
    return this.subscribeWithConstraints(callback, ...this.buildConstraints(filters));
  }
}
