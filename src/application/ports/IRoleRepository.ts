import { Role } from '../../core/entities/Role';

export interface IRoleRepository {
  getAllRoles(): Promise<Role[]>;
  subscribeRoles(callback: (roles: Role[]) => void): () => void;
  addRole(data: Omit<Role, 'id'>): Promise<string>;
  updateRole(id: string, data: Partial<Role>): Promise<void>;
  deleteRole(id: string): Promise<void>;
}
