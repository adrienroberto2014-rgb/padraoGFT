export interface Student {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  address?: string;
  belt?: string;
  beltId?: string;
  beltName?: string;
  stripes?: number;
  degree?: number;
  status: 'Active' | 'Inactive' | 'Pending';
  monthlyFee: number;
  planId?: string;
  planName?: string;
  notes?: string;
  photoURL?: string;
  createdAt: any;
  updatedAt?: any;
  lastCheckIn?: any;
  lastPaymentDate?: any;
  nextPaymentDate?: any;
  tenantId: string;
}

export interface StudentFilters {
  name?: string;
  email?: string;
  status?: 'Active' | 'Inactive' | 'Pending';
  planId?: string;
}
