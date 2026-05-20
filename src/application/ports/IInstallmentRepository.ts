export interface IInstallment {
  id?: string;
  studentId: string;
  studentName?: string;
  productName: string;
  amount: number;
  installmentNumber: number;
  totalInstallments: number;
  dueDate: any;
  status: 'pending' | 'paid' | 'overdue';
  saleId: string;
  paymentMethod?: string;
  paidAt?: any;
  updatedAt?: any;
}

export interface IInstallmentRepository {
  findAll(): Promise<IInstallment[]>;
  update(id: string, installment: Partial<IInstallment>): Promise<void>;
  delete(id: string): Promise<void>;
  subscribe(callback: (data: IInstallment[]) => void): () => void;
}
