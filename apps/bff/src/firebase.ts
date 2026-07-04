import admin from "firebase-admin";

// Inicializar Firebase Admin
if (!admin.apps.length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON not configured");
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    console.log("✅ Firebase Admin initialized");
  } catch (error) {
    console.error("❌ Failed to initialize Firebase:", error);
    throw error;
  }
}

export default admin;
