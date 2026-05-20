import { Firestore } from 'firebase/firestore';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';
import { IProduct, IProductRepository } from '../../../application/ports/IProductRepository';

export class FirestoreProductRepository 
  extends BaseFirestoreRepository<IProduct & { id: string }> 
  implements IProductRepository {
  
  constructor(db: Firestore, tenantId: string = 'default_gym') {
    super(db, 'products', 'name', tenantId);
  }

  async findAll(): Promise<IProduct[]> {
    return this.getWithConstraints();
  }

  subscribe(callback: (data: IProduct[]) => void): () => void {
    return this.subscribeWithConstraints(callback);
  }

  async add(product: Omit<IProduct, 'id'>): Promise<string> {
    return this.save(product);
  }

  async update(id: string, product: Partial<IProduct>): Promise<void> {
    await this.save({ ...product, id });
  }
}
