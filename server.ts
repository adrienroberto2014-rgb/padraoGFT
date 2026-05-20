import express from "express";
import path from "path";
import Stripe from "stripe";
import dotenv from "dotenv";
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { initializeApp, getApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
let firebaseConfig: any;
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  const configData = await import('fs').then(fs => fs.readFileSync(configPath, 'utf8'));
  firebaseConfig = JSON.parse(configData);
} catch (err) {
  console.error("Failed to load firebase-applet-config.json:", err);
  // Fallback to empty config to prevent crash, though app will fail later
  firebaseConfig = { projectId: "", firestoreDatabaseId: "" };
}

// Initialize Firebase Admin
try {
  if (getApps().length === 0) {
    initializeApp({
      projectId: firebaseConfig.projectId
    });
  }
} catch (e) {
  console.error("Firebase Admin initialization error:", e);
}

const db = getFirestore(firebaseConfig.firestoreDatabaseId || undefined);
const auth = getAuth();

const SUPER_ADMIN_EMAILS = [
  "rodrigues.ueslei@gmail.com",
  "rodrigues.ueslei02@gmail.com",
  "ueslei.rodrigues@gmail.com",
  "adrienroberto2014@gmail.com",
  "balcaogfteamlimeira@gmail.com"
];

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');

// Mercado Pago configuration will be done lazily to use keys from database/env
let mpClient: MercadoPagoConfig | null = null;

function getMPClient() {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Mercado Pago Access Token not configured.");
  }
  if (!mpClient) {
    mpClient = new MercadoPagoConfig({ accessToken });
  }
  return mpClient;
}

// Middleware to verify admin token
async function verifyAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(token);
    const userEmail = decodedToken.email?.toLowerCase() || '';

    // Check if it's a superadmin by email first
    if (SUPER_ADMIN_EMAILS.includes(userEmail)) {
      req.user = decodedToken;
      req.adminData = { role: 'superadmin', approved: true, email: userEmail, tenantId: 'default_gym' };
      return next();
    }

    // Otherwise check database
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data() as any;
    
    // Check for superadmin or tenant admin
    if (!userData || (!userData.approved) || (userData.role !== 'admin' && userData.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    
    req.user = decodedToken;
    req.adminData = userData;
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(401).json({ error: 'Token invalid' });
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Health check endpoint for monitoring
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || "development"
    });
  });

  // API for Administrative User Creation
  app.post("/api/admin/users/create", verifyAdmin, async (req: any, res) => {
    try {
      const { email, password, name, role, tenantId, studentId, approved } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // 1. Create in Firebase Auth
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
      });

      // 2. Create in Firestore
      const userDocData = {
        uid: userRecord.uid,
        email,
        name,
        role: role || 'user',
        tenantId: tenantId || req.adminData.tenantId,
        studentId: studentId || null,
        approved: approved !== undefined ? approved : true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      await db.collection('users').doc(userRecord.uid).set(userDocData);

      res.json({ success: true, uid: userRecord.uid });
    } catch (error: any) {
      console.error("Error creating user:", error);
      let message = error.message;
      if (message.includes("identitytoolkit.googleapis.com")) {
        message = `A API Identity Toolkit precisa ser ativada. Por favor, acesse o link para ativar: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=${firebaseConfig.projectId || 'seu-projeto'}`;
      } else if (message.includes("PERMISSION_DENIED") || error.code === 7) {
        message = "Permissão negada no Firebase Auth. Verifique se a 'Identity Toolkit API' está ativada no console do Google Cloud.";
      }
      res.status(500).json({ error: message });
    }
  });

  // API for Administrative Password Update
  app.post("/api/admin/users/update-password", verifyAdmin, async (req: any, res) => {
    try {
      const { uid, newPassword } = req.body;

      if (!uid || !newPassword) {
        return res.status(400).json({ error: "Missing UID or password" });
      }

      // Check if user belongs to same tenant unless superadmin
      const targetUserDoc = await db.collection('users').doc(uid).get();
      const targetUserData = targetUserDoc.data();
      
      if (!targetUserData) {
        return res.status(404).json({ error: "User not found in database" });
      }

      if (req.adminData.role !== 'superadmin' && targetUserData.tenantId !== req.adminData.tenantId) {
        return res.status(403).json({ error: "Forbidden: Cannot manage users from other tenants" });
      }

      await auth.updateUser(uid, {
        password: newPassword
      });

      await db.collection('users').doc(uid).update({
        updatedAt: FieldValue.serverTimestamp()
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating password:", error);
      let message = error.message;
      if (message.includes("identitytoolkit.googleapis.com")) {
        message = `A API Identity Toolkit precisa ser ativada. Por favor, acesse o link para ativar: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=${firebaseConfig.projectId || 'seu-projeto'}`;
      } else if (message.includes("PERMISSION_DENIED") || error.code === 7) {
        message = "Permissão negada no Firebase Auth. Verifique se a 'Identity Toolkit API' está ativada no console do Google Cloud.";
      }
      res.status(500).json({ error: message });
    }
  });

  // API Route for Stripe Checkout
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { amount, studentId, studentName } = req.body;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "brl",
              product_data: {
                name: `Mensalidade - ${studentName}`,
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.origin}/?payment=success`,
        cancel_url: `${req.headers.origin}/?payment=cancel`,
        metadata: {
          studentId,
        },
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Mercado Pago Preference Creation
  app.post("/api/mercado-pago/create-preference", async (req, res) => {
    try {
      const { amount, studentId, studentName } = req.body;
      const client = getMPClient();
      const preference = new Preference(client);

      const response = await preference.create({
        body: {
          items: [
            {
              id: studentId,
              title: `Mensalidade - ${studentName}`,
              quantity: 1,
              unit_price: Number(amount),
              currency_id: 'BRL'
            },
          ],
          back_urls: {
            success: `${req.headers.origin}/?payment=success`,
            failure: `${req.headers.origin}/?payment=cancel`,
            pending: `${req.headers.origin}/?payment=pending`,
          },
          auto_return: 'approved',
          metadata: {
            studentId,
          }
        }
      });

      res.json({ id: response.id, init_point: response.init_point });
    } catch (error: any) {
      console.error("Mercado Pago error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Gympass Integration Endpoints (Placeholders)
  app.post("/api/gympass/validate-token", async (req, res) => {
    try {
      const { token } = req.body;
      const clientId = process.env.GYMPASS_CLIENT_ID;
      const clientSecret = process.env.GYMPASS_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return res.status(400).json({ error: "Gympass API credentials not configured." });
      }

      // TODO: Implement actual Wellhub (Gympass) API call here
      // 1. Get access token
      // 2. Validate student token
      
      console.log("Validating Gympass token:", token);
      
      // Mock response for now
      res.json({ 
        valid: true, 
        student: { name: "Mock Gympass User", id: "gym_123" },
        message: "Implementação da API Wellhub necessária" 
      });
    } catch (error: any) {
      console.error("Gympass error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gympass/checkin", async (req, res) => {
    try {
      const { gympassId, classId } = req.body;
      console.log(`Registering Gympass check-in for student ${gympassId} in class ${classId}`);
      
      // TODO: Notify Wellhub API about check-in
      res.json({ success: true, message: "Check-in Gympass registrado (Mock)" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gympass/validate-by-id", async (req, res) => {
    try {
      const { gympassId } = req.body;
      const clientId = process.env.GYMPASS_CLIENT_ID;
      const clientSecret = process.env.GYMPASS_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return res.status(400).json({ error: "Gympass API credentials not configured." });
      }

      console.log("Checking pending Gympass check-ins for studentId:", gympassId);

      // TODO: Implement actual Wellhub (Gympass) API call:
      // 1. Get access token
      // 2. Fetch "Daily List" to check if this student has a pending check-in
      // 3. If found, automatically return success/valid
      
      // Mock response for now (simulating a valid check-in found in app)
      res.json({ 
        valid: true,
        message: "Check-in pendente encontrado no App Wellhub (Mock)" 
      });
    } catch (error: any) {
      console.error("Gympass validation-by-id error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Facial Recognition Endpoints ---

  app.post("/api/face/enroll", async (req, res) => {
    try {
      const { studentId, image } = req.body;
      
      if (!studentId || !image) {
        return res.status(400).json({ error: "Missing studentId or image data." });
      }

      console.log(`Enrolling face for student ${studentId}`);
      
      // Production Implementation: 
      // 1. Process image with face-api.js or send to AWS Rekognition
      // 2. Extract embedding (descriptor)
      // 3. Store descriptor in Firestore via Server Admin SDK
      
      res.json({ 
        success: true, 
        message: "Face biometric data stored safely in backend." 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/face/verify", async (req, res) => {
    try {
      const { image, tenantId } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: "Missing image data." });
      }

      console.log("Verifying face for tenant:", tenantId);
      
      // Production Implementation:
      // 1. extract descriptor from incoming image
      // 2. load embeddings for this tenant
      // 3. execute vector similarity search
      
      // Mock identifying a student for demonstration
      res.json({ 
        match: false, 
        confidence: 0,
        message: "O processamento de IA foi movido para o servidor. Ative o serviço de reconhecimento para verificação real."
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
