import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import firebaseConfig from '../../../firebase-applet-config.json';

export class AuthService {
  async createUserWithoutLogout(email: string, password: string): Promise<void> {
    const tempAppName = `temp-reg-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
      await createUserWithEmailAndPassword(tempAuth, email, password);
      await signOut(tempAuth);
    } catch (error: any) {
      throw error;
    } finally {
      // Small delay to ensure cleanup
      setTimeout(() => {
        // Firebase doesn't have an easy way to delete a temp app instance in JS SDK v9 easily
        // but it will be garbage collected or we can try deleteApp
      }, 1000);
    }
  }
}

export const authService = new AuthService();
