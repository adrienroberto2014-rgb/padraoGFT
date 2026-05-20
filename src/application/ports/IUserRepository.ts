import { User, UserFilters } from '../../core/entities/User';

export interface IUserRepository {
  getAllUsers(filters?: UserFilters): Promise<User[]>;
  subscribeUsers(callback: (users: User[]) => void, filters?: UserFilters): () => void;
  updateUser(id: string, data: Partial<User>): Promise<void>;
  deleteUser(id: string): Promise<void>;
  addUser(data: Omit<User, 'id'>): Promise<string>;
}
