import { Firestore, where } from 'firebase/firestore';
import { Graduation } from '../../../core/entities/Graduation';
import { IGraduationRepository } from '../../../application/ports/IGraduationRepository';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';

export class FirestoreGraduationRepository extends BaseFirestoreRepository<Graduation> implements IGraduationRepository {
  constructor(db: Firestore, tenantId: string = 'default_gym') {
    super(db, 'graduations', 'date', tenantId);
  }

  async getAll(): Promise<Graduation[]> {
    return this.getWithConstraints();
  }

  subscribeByStudentId(studentId: string, callback: (graduations: Graduation[]) => void): () => void {
    return this.subscribeWithConstraints(callback, where('studentId', '==', studentId));
  }
}
