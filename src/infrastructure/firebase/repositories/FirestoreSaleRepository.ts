import { Firestore } from 'firebase/firestore';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';
import { ISale, ISaleRepository } from '../../../application/ports/ISaleRepository';

export class FirestoreSaleRepository 
  extends BaseFirestoreRepository<ISale & { id: string }> 
  implements ISaleRepository {
  
  constructor(db: Firestore, tenantId: string = 'default_gym') {
    super(db, 'sales', 'date', tenantId);
  }

  async findAll(): Promise<ISale[]> {
    return this.getWithConstraints();
  }

  subscribe(callback: (data: ISale[]) => void): () => void {
    return this.subscribeWithConstraints(callback);
  }

  async add(sale: Omit<ISale, 'id'>): Promise<string> {
    return this.save(sale);
  }

  async update(id: string, sale: Partial<ISale>): Promise<void> {
    await this.save({ ...sale, id });
  }
}
