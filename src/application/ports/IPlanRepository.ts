export interface IPlan {
  id?: string;
  name: string;
  price: number;
  durationMonths: number;
  description?: string;
  updatedAt?: any;
  createdAt?: any;
}

export interface IPlanRepository {
  findAll(): Promise<IPlan[]>;
  add(plan: Omit<IPlan, 'id'>): Promise<string>;
  update(id: string, plan: Partial<IPlan>): Promise<void>;
  delete(id: string): Promise<void>;
  subscribe(callback: (data: IPlan[]) => void): () => void;
}
