import { Firestore, writeBatch, doc, collection } from 'firebase/firestore';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';
import { IClass, IClassRepository } from '../../../application/ports/IClassRepository';

export class FirestoreClassRepository 
  extends BaseFirestoreRepository<IClass & { id: string }> 
  implements IClassRepository {
  
  constructor(db: Firestore, tenantId: string = 'default_gym') {
    super(db, 'classes', 'startTime', tenantId);
  }

  async findAll(): Promise<IClass[]> {
    return this.getWithConstraints();
  }

  subscribe(callback: (data: IClass[]) => void): () => void {
    return this.subscribeWithConstraints(callback);
  }

  async add(classData: Omit<IClass, 'id'>): Promise<string> {
    return this.save(classData);
  }

  async addBulk(classes: Omit<IClass, 'id'>[]): Promise<void> {
    const batch = writeBatch(this.db);
    classes.forEach(cls => {
      const newRef = doc(collection(this.db, 'classes'));
      batch.set(newRef, {
        ...cls,
        tenantId: this.tenantId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    await batch.commit();
  }

  async update(id: string, classData: Partial<IClass>): Promise<void> {
    await this.save({ ...classData, id });
  }

  async updateBulk(updates: { id: string, data: Partial<IClass> }[]): Promise<void> {
    const batch = writeBatch(this.db);
    updates.forEach(update => {
      const docRef = doc(this.db, 'classes', update.id);
      batch.update(docRef, {
        ...update.data,
        updatedAt: new Date()
      });
    });
    await batch.commit();
  }

  async deleteBulk(ids: string[]): Promise<void> {
    const batch = writeBatch(this.db);
    ids.forEach(id => {
      const docRef = doc(this.db, 'classes', id);
      batch.delete(docRef);
    });
    await batch.commit();
  }
}
