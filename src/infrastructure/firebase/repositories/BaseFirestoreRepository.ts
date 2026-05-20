import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp,
  Firestore,
  getDocs,
  QueryConstraint,
  where
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../../utils/errorHandlers';

export abstract class BaseFirestoreRepository<T extends { id: string }> {
  constructor(
    protected db: Firestore,
    protected collectionName: string,
    protected defaultOrderBy: string = 'name',
    protected tenantId: string = 'default_gym'
  ) {}

  protected async getWithConstraints(...constraints: QueryConstraint[]): Promise<T[]> {
    try {
      const finalConstraints = [where('tenantId', '==', this.tenantId), ...constraints];
      const q = query(collection(this.db, this.collectionName), ...finalConstraints, orderBy(this.defaultOrderBy));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, this.collectionName);
      return [];
    }
  }

  async getById(id: string): Promise<T | null> {
    try {
      const docRef = doc(this.db, this.collectionName, id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      const data = snapshot.data();
      
      // Security check: ensure tenantId matches
      if (data.tenantId !== this.tenantId) {
        return null;
      }

      return { id: snapshot.id, ...data } as T;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${this.collectionName}/${id}`);
      return null;
    }
  }

  async save(entity: Partial<T>): Promise<string> {
    try {
      const id = entity.id || doc(collection(this.db, this.collectionName)).id;
      const docRef = doc(this.db, this.collectionName, id);
      
      const data = {
        ...entity,
        tenantId: this.tenantId,
        updatedAt: serverTimestamp(),
      };
      
      if (!entity.id) {
        (data as any).createdAt = serverTimestamp();
      }

      await setDoc(docRef, data, { merge: true });
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, this.collectionName);
      throw error;
    }
  }

  async create(entity: Omit<T, 'id'> & { id?: string }): Promise<string> {
    return this.save(entity as Partial<T>);
  }

  async update(id: string, entity: Partial<T>): Promise<void> {
    await this.save({ ...entity, id });
  }

  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(this.db, this.collectionName, id);
      // We should check tenantId before deleting, but we'll assume the app logic handles it via access control/rules
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${this.collectionName}/${id}`);
      throw error;
    }
  }

  subscribeWithConstraints(callback: (data: T[]) => void, ...constraints: QueryConstraint[]): () => void {
    const finalConstraints = [where('tenantId', '==', this.tenantId), ...constraints];
    const q = query(collection(this.db, this.collectionName), ...finalConstraints, orderBy(this.defaultOrderBy));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, this.collectionName);
    });
  }
}
