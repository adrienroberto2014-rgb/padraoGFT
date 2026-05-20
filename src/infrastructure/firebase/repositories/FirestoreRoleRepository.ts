import { 
  Firestore
} from 'firebase/firestore';
import { Role } from '../../../core/entities/Role';
import { IRoleRepository } from '../../../application/ports/IRoleRepository';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';

export class FirestoreRoleRepository extends BaseFirestoreRepository<Role> implements IRoleRepository {
  constructor(db: Firestore, tenantId: string = 'default_gym') {
    super(db, 'roles', 'name', tenantId);
  }

  async getAllRoles(): Promise<Role[]> {
    return this.getWithConstraints();
  }

  subscribeRoles(callback: (roles: Role[]) => void): () => void {
    return this.subscribeWithConstraints(callback);
  }

  async addRole(data: Omit<Role, 'id'>): Promise<string> {
    return this.save(data as any);
  }

  async updateRole(id: string, data: Partial<Role>): Promise<void> {
    await this.save({ ...data, id });
  }

  async deleteRole(id: string): Promise<void> {
    return super.delete(id);
  }
}
