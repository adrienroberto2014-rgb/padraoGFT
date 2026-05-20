import { Firestore } from 'firebase/firestore';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';
import { IInstallment, IInstallmentRepository } from '../../../application/ports/IInstallmentRepository';

export class FirestoreInstallmentRepository 
  extends BaseFirestoreRepository<IInstallment & { id: string }> 
  implements IInstallmentRepository {
  
  constructor(db: Firestore, tenantId: string = 'default_gym') {
    super(db, 'installments', 'dueDate', tenantId);
  }

  async findAll(): Promise<IInstallment[]> {
    return this.getWithConstraints();
  }

  subscribe(callback: (data: IInstallment[]) => void): () => void {
    return this.subscribeWithConstraints(callback);
  }

  async update(id: string, installment: Partial<IInstallment>): Promise<void> {
    await this.save({ ...installment, id });
  }
}
