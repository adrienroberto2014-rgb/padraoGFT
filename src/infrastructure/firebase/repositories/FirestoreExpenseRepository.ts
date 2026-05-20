import { Firestore } from 'firebase/firestore';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';
import { IExpense, IExpenseRepository } from '../../../application/ports/IExpenseRepository';

export class FirestoreExpenseRepository 
  extends BaseFirestoreRepository<IExpense & { id: string }> 
  implements IExpenseRepository {
  
  constructor(db: Firestore, tenantId: string = 'default_gym') {
    super(db, 'expenses', 'date', tenantId);
  }

  async findAll(): Promise<IExpense[]> {
    return this.getWithConstraints();
  }

  subscribe(callback: (data: IExpense[]) => void): () => void {
    return this.subscribeWithConstraints(callback);
  }

  async add(expense: Omit<IExpense, 'id'>): Promise<string> {
    return this.save(expense);
  }

  async update(id: string, expense: Partial<IExpense>): Promise<void> {
    await this.save({ ...expense, id });
  }
}
