export interface IInstructor {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  specialty?: string;
  bio?: string;
  photoURL?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface IInstructorRepository {
  findAll(): Promise<IInstructor[]>;
  findById(id: string): Promise<IInstructor | null>;
  add(instructor: Omit<IInstructor, 'id'>): Promise<string>;
  update(id: string, instructor: Partial<IInstructor>): Promise<void>;
  delete(id: string): Promise<void>;
  subscribe(callback: (data: IInstructor[]) => void): () => void;
}
