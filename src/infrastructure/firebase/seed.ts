import { Firestore, doc, getDoc, setDoc, collection, getDocs, updateDoc, writeBatch, addDoc } from 'firebase/firestore';

export async function seedTenantData(db: Firestore) {
  const tenantId = 'default_gym';
  const tenantRef = doc(db, 'tenants', tenantId);
  
  try {
    const tenantSnap = await getDoc(tenantRef);
    
    // 1. Create initial tenant if it doesn't exist
    if (!tenantSnap.exists()) {
      console.log('Seeding initial tenant...');
      await setDoc(tenantRef, {
        id: tenantId,
        name: 'GF Team',
        plan: 'pro',
        status: 'active',
        createdAt: new Date().toISOString()
      });
    }

    // 2. Connect existing users to this tenant
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    
    const batch = writeBatch(db);
    let count = 0;
    
    usersSnap.forEach((userDoc) => {
      const data = userDoc.data();
      if (!data.tenantId) {
        batch.update(userDoc.ref, { tenantId });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`Updated ${count} users with default tenantId.`);
    }

    // 3. Connect other orphan data
    const collectionsToUpdate = ['students', 'payments', 'checkins', 'classes', 'graduations', 'evaluations', 'plans', 'instructors', 'products', 'sales', 'expenses', 'installments', 'invoices', 'subscriptions', 'belts'];
    
    // 4. Seed default belts if empty
    const beltsRef = collection(db, 'belts');
    const beltsSnap = await getDocs(beltsRef);
    if (beltsSnap.empty) {
      console.log('Seeding default belts...');
      const defaultBelts = [
        { name: 'Branca', color: '#FFFFFF', order: 1, category: 'Ambas' },
        { name: 'Cinza', color: '#808080', order: 2, category: 'Infantil' },
        { name: 'Amarela', color: '#FFFF00', order: 3, category: 'Infantil' },
        { name: 'Laranja', color: '#FFA500', order: 4, category: 'Infantil' },
        { name: 'Verde', color: '#008000', order: 5, category: 'Infantil' },
        { name: 'Azul', color: '#0000FF', order: 6, category: 'Adulto' },
        { name: 'Roxa', color: '#800080', order: 7, category: 'Adulto' },
        { name: 'Marrom', color: '#8B4513', order: 8, category: 'Adulto' },
        { name: 'Preta', color: '#000000', order: 9, category: 'Adulto' }
      ];

      for (const belt of defaultBelts) {
        await addDoc(beltsRef, {
          ...belt,
          tenantId,
          createdAt: new Date().toISOString()
        });
      }
    }

    for (const collName of collectionsToUpdate) {
      const collRef = collection(db, collName);
      const snap = await getDocs(collRef);
      
      const collBatch = writeBatch(db);
      let collCount = 0;
      
      snap.forEach((doc) => {
        if (!doc.data().tenantId) {
          collBatch.update(doc.ref, { tenantId });
          collCount++;
        }
      });
      
      if (collCount > 0) {
        await collBatch.commit();
        console.log(`Updated ${collCount} documents in ${collName} with default tenantId.`);
      }
    }
    
  } catch (error) {
    console.error('Error seeding tenant data:', error);
  }
}
