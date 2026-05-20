import { Firestore, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ISettings, ISettingsRepository } from '../../../application/ports/ISettingsRepository';

export class FirestoreSettingsRepository implements ISettingsRepository {
  constructor(private db: Firestore, private tenantId: string = 'default_gym') {}

  private getGlobalDocRef() {
    return doc(this.db, 'settings', `global_${this.tenantId}`);
  }

  private getSecretDocRef() {
    return doc(this.db, 'secret_settings', `global_${this.tenantId}`);
  }

  async getGlobalSettings(): Promise<ISettings | null> {
    const docRef = this.getGlobalDocRef();
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as ISettings;
    }
    return null;
  }

  subscribeGlobalSettings(callback: (settings: ISettings | null) => void): () => void {
    const docRef = this.getGlobalDocRef();
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as ISettings);
      } else {
        callback(null);
      }
    });
  }

  async updateGlobalSettings(settings: Partial<ISettings>): Promise<void> {
    const docRef = this.getGlobalDocRef();
    const { setDoc, serverTimestamp } = await import('firebase/firestore');
    await setDoc(docRef, { 
      ...settings, 
      tenantId: this.tenantId,
      updatedAt: serverTimestamp() 
    }, { merge: true });
  }

  async getSecretSettings(): Promise<any | null> {
    const docRef = this.getSecretDocRef();
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  }

  subscribeSecretSettings(callback: (secrets: any | null) => void): () => void {
    const docRef = this.getSecretDocRef();
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data());
      } else {
        callback(null);
      }
    });
  }

  async updateSecretSettings(secrets: any): Promise<void> {
    const docRef = this.getSecretDocRef();
    const { setDoc, serverTimestamp } = await import('firebase/firestore');
    await setDoc(docRef, { 
      ...secrets, 
      tenantId: this.tenantId,
      updatedAt: serverTimestamp() 
    }, { merge: true });
  }
}
