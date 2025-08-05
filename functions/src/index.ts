import {onRequest} from "firebase-functions/v2/https";
import {logger} from "firebase-functions";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";

// Firebase Admin初期化
initializeApp();
const db = getFirestore();

// Hello World Function
export const helloWorld = onRequest({
  region: "asia-northeast1",
  cors: ["https://qrscan2-99ffd.web.app", "http://localhost:3000"]
}, (request, response) => {
  logger.info("Hello logs!", {structuredData: true});

  // CORSヘッダーを明示的に設定
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  // OPTIONSリクエスト（プリフライト）の処理
  if (request.method === "OPTIONS") {
    response.status(200).send("");
    return;
  }
  
  response.send("Hello from Firebase!");
});

// Firestoreからデータを取得するFunction
export const getQRScans = onRequest({
  region: "asia-northeast1",
  cors: ["https://qrscan2-99ffd.web.app", "http://localhost:3000"]
}, async (request, response) => {
  try {
    // CORSヘッダーを設定
    response.set("Access-Control-Allow-Origin", "*");
    response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    if (request.method === "OPTIONS") {
      response.status(200).send("");
      return;
    }

    logger.info("Getting QR scans from Firestore");
    
    const snapshot = await db.collection("qrscans").get();
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    response.json({
      success: true,
      data: data,
      count: data.length
    });
  } catch (error) {
    logger.error("Error getting QR scans:", error);
    response.status(500).json({
      success: false,
      error: "Failed to get data"
    });
  }
});

// Firestoreにデータを追加するFunction
export const addQRScan = onRequest({
  region: "asia-northeast1",
  cors: ["https://qrscan2-99ffd.web.app", "http://localhost:3000"]
}, async (request, response) => {
  try {
    // CORSヘッダーを設定
    response.set("Access-Control-Allow-Origin", "*");
    response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    if (request.method === "OPTIONS") {
      response.status(200).send("");
      return;
    }

    if (request.method !== "POST") {
      response.status(405).json({
        success: false,
        error: "Method not allowed"
      });
      return;
    }

    const {title, content} = request.body;
    
    if (!title || !content) {
      response.status(400).json({
        success: false,
        error: "Title and content are required"
      });
      return;
    }

    logger.info("Adding QR scan to Firestore", {title, content});
    
    const docRef = await db.collection("qrscans").add({
      title,
      content,
      timestamp: new Date().toISOString(),
      createdAt: new Date()
    });
    
    response.json({
      success: true,
      id: docRef.id,
      message: "Data added successfully"
    });
  } catch (error) {
    logger.error("Error adding QR scan:", error);
    response.status(500).json({
      success: false,
      error: "Failed to add data"
    });
  }
});
