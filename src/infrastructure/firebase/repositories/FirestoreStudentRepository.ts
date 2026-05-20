import { 
  Firestore,
  where,
  QueryConstraint
} from 'firebase/firestore';
import { Student, StudentFilters } from '../../../core/entities/Student';
import { IStudentRepository } from '../../../application/ports/IStudentRepository';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';

export class FirestoreStudentRepository extends BaseFirestoreRepository<Student> implements IStudentRepository {
  constructor(db: Firestore, tenantId: string = 'default_gym') {
    super(db, 'students', 'name', tenantId);
  }

  private buildConstraints(filters?: StudentFilters): QueryConstraint[] {
    const constraints: QueryConstraint[] = [];
    if (filters?.email) {
      constraints.push(where('email', '==', filters.email));
    }
    if (filters?.status) {
      constraints.push(where('status', '==', filters.status));
    }
    return constraints;
  }

  async getAllStudents(filters?: StudentFilters): Promise<Student[]> {
    return this.getWithConstraints(...this.buildConstraints(filters));
  }

  subscribeStudents(callback: (students: Student[]) => void, filters?: StudentFilters): () => void {
    return this.subscribeWithConstraints(callback, ...this.buildConstraints(filters));
  }
}
