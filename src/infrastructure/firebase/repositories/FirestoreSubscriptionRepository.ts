import { Firestore } from 'firebase/firestore';
import { Subscription } from '../../../core/entities/Subscription';
import { ISubscriptionRepository } from '../../../application/ports/ISubscriptionRepository';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';

export class FirestoreSubscriptionRepository extends BaseFirestoreRepository<Subscription> implements ISubscriptionRepository {
  constructor(db: Firestore, tenantId: string = 'default_gym') {
    super(db, 'subscriptions', 'status', tenantId);
  }

  async getAll(): Promise<Subscription[]> {
    return this.getWithConstraints();
  }

  subscribe(callback: (subscriptions: Subscription[]) => void): () => void {
    return this.subscribeWithConstraints(callback);
  }
}
