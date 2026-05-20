export interface Plan {
  id: string;
  name: string;
  price: number;
  billingCycle: 'Monthly' | 'Quarterly' | 'Semiannual' | 'Yearly';
  durationMonths: number;
  description?: string;
  active: boolean;
  tenantId: string;
}
