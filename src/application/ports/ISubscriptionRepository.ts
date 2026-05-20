import { Subscription } from '../../core/entities/Subscription';

export interface ISubscriptionRepository {
  getAll(): Promise<Subscription[]>;
  getById(id: string): Promise<Subscription | null>;
  create(subscription: Omit<Subscription, 'id'>): Promise<string>;
  update(id: string, subscription: Partial<Subscription>): Promise<void>;
  delete(id: string): Promise<void>;
  subscribe(callback: (subscriptions: Subscription[]) => void): () => void;
}
