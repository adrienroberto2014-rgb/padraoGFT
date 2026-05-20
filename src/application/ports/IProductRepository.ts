export interface IProduct {
  id?: string;
  name: string;
  price: number;
  stock: number;
  minStock: number;
  category: string;
  description?: string;
  updatedAt?: any;
  createdAt?: any;
}

export interface IProductRepository {
  findAll(): Promise<IProduct[]>;
  add(product: Omit<IProduct, 'id'>): Promise<string>;
  update(id: string, product: Partial<IProduct>): Promise<void>;
  delete(id: string): Promise<void>;
  subscribe(callback: (data: IProduct[]) => void): () => void;
}
