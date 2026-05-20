import { 
  collection, 
  doc, 
  getDocs, 
  onSnapshot, 
  setDoc, 
  getDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { ILicensesRepository } from '../../../application/ports/ILicensesRepository';
import { Observable } from 'rxjs';
import { handleFirestoreError, OperationType } from '../../../utils/errorHandlers';

export class FirestoreLicensesRepository implements ILicensesRepository {
  private collectionName = 'licenses';

  async getLicenses(): Promise<any[]> {
    try {
      const q = query(collection(db, this.collectionName), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, this.collectionName);
      return [];
    }
  }

  subscribeLicenses(): Observable<any[]> {
    return new Observable(observer => {
      const q = query(collection(db, this.collectionName), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        observer.next(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, this.collectionName);
        observer.error(error);
      });
      return unsubscribe;
    });
  }

  async saveLicense(id: string, data: any): Promise<void> {
    const licenseRef = doc(db, this.collectionName, id);
    
    // If it's a partial update, we might need existing data to sync correctly
    let fullData = { ...data };
    if (!data.slug || !data.ownerEmail) {
      const existing = await getDoc(licenseRef);
      if (existing.exists()) {
        fullData = { ...existing.data(), ...data };
      }
    }

    await setDoc(licenseRef, {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Also sync to tenants collection for multi-tenant support
    const tenantId = fullData.slug || id;
    if (tenantId) {
      const tenantRef = doc(db, 'tenants', tenantId);
      const tenantData: any = {
        updatedAt: serverTimestamp()
      };
      
      if (fullData.academyName) tenantData.name = fullData.academyName;
      if (fullData.slug) tenantData.slug = fullData.slug;
      if (fullData.plan) tenantData.plan = fullData.plan;
      if (fullData.status) tenantData.status = fullData.status;
      if (fullData.ownerEmail) tenantData.ownerEmail = fullData.ownerEmail;
      if (fullData.externalFirebaseConfig) tenantData.config = fullData.externalFirebaseConfig;

      await setDoc(tenantRef, tenantData, { merge: true });

      // Ensure user profile exists and is linked if it's a "full" update or has owner email
      if (fullData.ownerEmail) {
        await this.createAdminProfile(fullData.ownerEmail, tenantId, fullData.ownerName);
      }
    }
  }

  async createAdminProfile(email: string, tenantId: string, name?: string): Promise<void> {
    const userRef = doc(db, 'users', email.toLowerCase().trim());
    await setDoc(userRef, {
      email: email.toLowerCase().trim(),
      name: name || 'Admin',
      role: 'tenant_admin',
      tenantId: tenantId,
      approved: true,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  async deleteLicense(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }
}
