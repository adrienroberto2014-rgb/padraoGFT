import { Firestore, where } from 'firebase/firestore';
import { Evaluation } from '../../../core/entities/Evaluation';
import { IEvaluationRepository } from '../../../application/ports/IEvaluationRepository';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';

export class FirestoreEvaluationRepository extends BaseFirestoreRepository<Evaluation> implements IEvaluationRepository {
  constructor(db: Firestore, tenantId: string = 'default_gym') {
    super(db, 'evaluations', 'date', tenantId);
  }

  async getAll(): Promise<Evaluation[]> {
    return this.getWithConstraints();
  }

  async save(evaluation: Partial<Evaluation>): Promise<string> {
    return super.save(evaluation);
  }

  subscribeByStudentId(studentId: string, callback: (evaluations: Evaluation[]) => void): () => void {
    return this.subscribeWithConstraints(callback, where('studentId', '==', studentId));
  }
}
