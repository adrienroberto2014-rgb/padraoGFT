export interface ISale {
  id?: string;
  studentId: string;
  studentName: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  paymentMethod: string;
  date: any;
  status: 'completed' | 'cancelled';
  updatedAt?: any;
  createdAt?: any;
}

export interface ISaleRepository {
  findAll(): Promise<ISale[]>;
  add(sale: Omit<ISale, 'id'>): Promise<string>;
  update(id: string, sale: Partial<ISale>): Promise<void>;
  delete(id: string): Promise<void>;
  subscribe(callback: (data: ISale[]) => void): () => void;
}
