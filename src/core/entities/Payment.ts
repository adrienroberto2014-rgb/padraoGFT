export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  method: string;
  date: any;
  type: string;
  status: 'Paid' | 'Pending' | 'Canceled';
  period: string;
  notes?: string;
  tenantId: string;
}

export interface PaymentFilters {
  studentId?: string;
  studentIds?: string[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}
