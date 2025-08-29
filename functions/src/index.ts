import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Firebase Admin初期化
if (!getApps().length) {
    initializeApp();
}
const db = getFirestore();

// Hello World Function
export const helloWorld = onRequest(
    {
        region: "asia-northeast1",
        cors: ["https://qrscan2-99ffd.web.app", "http://localhost:3000"],
    },
    (request, response) => {
        logger.info("Hello logs!", { structuredData: true });

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
    }
);

// Firestoreからデータを取得するFunction
export const getQRScans = onRequest(
    {
        region: "asia-northeast1",
        cors: ["https://qrscan2-99ffd.web.app", "http://localhost:3000"],
    },
    async (request, response) => {
        try {
            // CORSヘッダーを設定
            response.set("Access-Control-Allow-Origin", "*");
            response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            response.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization"
            );

            if (request.method === "OPTIONS") {
                response.status(200).send("");
                return;
            }

            logger.info("Getting QR scans from Firestore");

            const snapshot = await db.collection("qrscans").get();
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            response.json({
                success: true,
                data: data,
                count: data.length,
            });
        } catch (error) {
            logger.error("Error getting QR scans:", error);
            response.status(500).json({
                success: false,
                error: "Failed to get data",
            });
        }
    }
);

// Firestoreにデータを追加するFunction
export const addQRScan = onRequest(
    {
        region: "asia-northeast1",
        cors: ["https://qrscan2-99ffd.web.app", "http://localhost:3000"],
    },
    async (request, response) => {
        try {
            // CORSヘッダーを設定
            response.set("Access-Control-Allow-Origin", "*");
            response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            response.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization"
            );

            if (request.method === "OPTIONS") {
                response.status(200).send("");
                return;
            }

            if (request.method !== "POST") {
                response.status(405).json({
                    success: false,
                    error: "Method not allowed",
                });
                return;
            }

            const { title, content } = request.body;

            if (!title || !content) {
                response.status(400).json({
                    success: false,
                    error: "Title and content are required",
                });
                return;
            }

            logger.info("Adding QR scan to Firestore", { title, content });

            const docRef = await db.collection("qrscans").add({
                title,
                content,
                timestamp: new Date().toISOString(),
                createdAt: new Date(),
            });

            response.json({
                success: true,
                id: docRef.id,
                message: "Data added successfully",
            });
        } catch (error) {
            logger.error("Error adding QR scan:", error);
            response.status(500).json({
                success: false,
                error: "Failed to add data",
            });
        }
    }
);

// カスタムトークン生成関数
export const createCustomToken = onRequest(
    {
        region: "asia-northeast1",
        cors: ["https://qrscan2-99ffd.web.app", "http://localhost:3000"],
        serviceAccount: "firebase-adminsdk-fbsvc@qrscan2-99ffd.iam.gserviceaccount.com",
    },
    async (request, response) => {
        try {
            // CORSヘッダーを設定
            response.set("Access-Control-Allow-Origin", "*");
            response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            response.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization"
            );

            if (request.method === "OPTIONS") {
                response.status(200).send("");
                return;
            }

            if (request.method !== "POST") {
                response.status(405).json({
                    success: false,
                    error: "Method not allowed",
                });
                return;
            }

            const { userId, adminId, role } = request.body;
            logger.info(`[createCustomToken] 受信値 userId: ${userId}, adminId: ${adminId}, role: ${role}`);
            if (!userId || !adminId || !role) {
                response.status(400).json({
                    success: false,
                    error: "userId, adminId, role are required",
                });
                return;
            }

            let userData = null;
            let customClaims = {};

            // roleごとに参照コレクションを分岐
            if (role === "admin") {
                const adminRef = db.collection("admin_settings").doc(userId);
                // admin
                const adminDoc = await adminRef.get();
                if (!adminDoc.exists) {
                    response.status(404).json({ success: false, error: "Admin not found" });
                    return;
                }
                userData = adminDoc.data();
                if (!userData) {
                    response.status(404).json({ success: false, error: "Admin data is undefined" });
                    return;
                }
                customClaims = {
                    user_id: userData.admin_id,
                    role: "admin",
                    user_name: userData.admin_name,
                    email: userData.email,
                };
            } else {
                // maker, staff, uketuke等
                const userRef = db
                    .collection("admin_collections")
                    .doc(adminId)
                    .collection("users")
                    .doc(userId);
                // maker/staff/uketuke
                const userDoc = await userRef.get();
                if (!userDoc.exists) {
                    response.status(404).json({ success: false, error: "User not found" });
                    return;
                }
                userData = userDoc.data();
                if (!userData) {
                    response.status(404).json({ success: false, error: "User data is undefined" });
                    return;
                }
                if (userData.is_active === false || userData.account_status === "suspended") {
                    response.status(403).json({ success: false, error: "User is not active" });
                    return;
                }
                customClaims = {
                    user_id: userId,
                    role: userData.role,
                    user_name: userData.user_name,
                };
            }

            // カスタムトークン生成
            const customToken = await getAuth().createCustomToken(userId, customClaims);
            response.json({
                success: true,
                customToken: customToken,
                user: userData,
            });
        } catch (error) {
            logger.error("Error creating custom token:", error);
            response.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
);
