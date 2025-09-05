import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as nodemailer from "nodemailer";

// Firebase Admin初期化
if (!getApps().length) {
    initializeApp();
}
const db = getFirestore();// Hello World Function
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
        serviceAccount:
            "firebase-adminsdk-fbsvc@qrscan2-99ffd.iam.gserviceaccount.com",
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
            logger.info(
                `[createCustomToken] 受信値 userId: ${userId}, adminId: ${adminId}, role: ${role}`
            );
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
                    response
                        .status(404)
                        .json({ success: false, error: "Admin not found" });
                    return;
                }
                userData = adminDoc.data();
                if (!userData) {
                    response
                        .status(404)
                        .json({ success: false, error: "Admin data is undefined" });
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
                    response
                        .status(404)
                        .json({ success: false, error: "User not found" });
                    return;
                }
                userData = userDoc.data();
                if (!userData) {
                    response
                        .status(404)
                        .json({ success: false, error: "User data is undefined" });
                    return;
                }
                if (
                    userData.is_active === false ||
                    userData.account_status === "suspended"
                ) {
                    response
                        .status(403)
                        .json({ success: false, error: "User is not active" });
                    return;
                }
                customClaims = {
                    user_id: userId,
                    role: userData.role,
                    user_name: userData.user_name,
                };
            }

            // カスタムトークン生成
            const customToken = await getAuth().createCustomToken(
                userId,
                customClaims
            );
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

// メール送信機能
export const sendNotificationEmail = onRequest(
    {
        region: "asia-northeast1",
        cors: ["https://qrscan2-99ffd.web.app", "http://localhost:3000"],
    },
    async (request, response) => {
        // CORSヘッダーを設定
        response.set("Access-Control-Allow-Origin", "*");
        response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        response.set("Access-Control-Allow-Headers", "Content-Type");

        // OPTIONSリクエスト（プリフライト）の処理
        if (request.method === "OPTIONS") {
            response.status(200).send("");
            return;
        }

        if (request.method !== "POST") {
            response.status(405).json({ error: "Method Not Allowed" });
            return;
        }

        try {
            const { to, subject, text, adminId, eventId } = request.body;

            // パラメータ検証
            if (!to || !subject || !text) {
                response.status(400).json({
                    error: "Missing required fields: to, subject, text"
                });
                return;
            }

            logger.info("メール送信リクエスト受信", { to, subject, adminId, eventId });

            // 環境変数チェック
            const emailConfig = {
                email: process.env.GMAIL_EMAIL,
                password: process.env.GMAIL_APP_PASSWORD
            };

            if (!emailConfig.email || !emailConfig.password) {
                logger.warn("Gmail設定が見つからない、ダミーレスポンスを返す");
                response.json({
                    success: true,
                    message: "メール送信が設定されていません（開発モード）",
                    to: to,
                    subject: subject,
                });
                return;
            }

            // Gmail SMTP設定
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: emailConfig.email,
                    pass: emailConfig.password,
                },
            });

            // メール内容設定
            const mailOptions = {
                from: emailConfig.email,
                to: to,
                subject: subject,
                text: text,
                html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #4285f4;">📍 来場通知</h2>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
              ${text.replace(/\n/g, "<br>")}
            </div>
            <hr style="margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              このメールは受付システムから自動送信されました。<br>
              管理ID: ${adminId || "N/A"} | イベントID: ${eventId || "N/A"}
            </p>
          </div>
        `,
            };

            // メール送信実行
            const info = await transporter.sendMail(mailOptions);

            logger.info("メール送信成功", { messageId: info.messageId, to });
            response.json({
                success: true,
                messageId: info.messageId,
                to: to,
                subject: subject,
            });
        } catch (error) {
            logger.error("メール送信エラー", error);
            response.status(500).json({
                error: "Email sending failed",
                details: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
);
