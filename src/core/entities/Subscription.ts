import { Timestamp } from 'firebase/firestore';

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing';
export type BillingCycle = 'Monthly' | 'Quarterly' | 'Semiannual' | 'Yearly';

export interface Subscription {
  id: string;
  studentId: string;
  studentName: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  cancelAtPeriodEnd: boolean;
  externalId?: string; // Stripe/MercadoPago Subscription ID
  paymentMethodId?: string;
  createdAt: Timestamp;
  tenantId: string;
}
