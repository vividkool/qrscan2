import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as nodemailer from "nodemailer";
import axios from "axios";

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

// LINEWORKS Bot APIを使用した通知送信Function
export const sendLineworksNotification = onRequest(
    {
        region: "asia-northeast1",
        cors: ["https://qrscan2-99ffd.web.app", "http://localhost:3000", "http://localhost:8000"],
    },
    async (request, response) => {
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
                response.status(405).json({ error: "Method not allowed" });
                return;
            }

            const { userData, botToken, channelId } = request.body;

            if (!userData || !botToken || !channelId) {
                response.status(400).json({
                    error: "Missing required parameters: userData, botToken, channelId"
                });
                return;
            }

            logger.info("LINEWORKS通知送信開始", {
                userIdで: userData.user_id,
                channelId: channelId
            });

            // LINEWORKS Bot API用のメッセージを作成
            const message = `🎯 来場者到着のお知らせ

👤 **${userData.company_name || ""}の${userData.user_name || ""}様**が来場されました！

📋 **詳細情報**
• ユーザーID: ${userData.user_id || ""}
• 会社名: ${userData.company_name || ""}
• 担当者: ${userData.tantou || ""}
• 入場時刻: ${new Date().toLocaleString("ja-JP")}

🤖 受付システムより自動送信`;

            // LINEWORKS Bot API呼び出し
            const lineworksResponse = await axios.post(
                `https://apis.worksmobile.com/r/${process.env.LINEWORKS_API_ID}/message/v1/bot/${botToken}/message/push`,
                {
                    channelId: channelId,
                    content: {
                        type: "text",
                        text: message
                    }
                },
                {
                    headers: {
                        "Authorization": `Bearer ${process.env.LINEWORKS_ACCESS_TOKEN}`,
                        "Content-Type": "application/json"
                    },
                    timeout: 10000
                }
            );

            logger.info("LINEWORKS通知送信成功", {
                status: lineworksResponse.status,
                data: lineworksResponse.data
            });

            response.json({
                success: true,
                message: "LINEWORKS notification sent successfully",
                lineworksResponse: {
                    status: lineworksResponse.status,
                    data: lineworksResponse.data
                },
                userData: {
                    user_name: userData.user_name,
                    company_name: userData.company_name,
                    tantou: userData.tantou
                }
            });

        } catch (error) {
            logger.error("LINEWORKS通知送信エラー", error);

            let errorMessage = "Unknown error";
            let statusCode = 500;

            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError: any = error;
                errorMessage = `LINEWORKS API Error: ${axiosError.response?.status} - ${axiosError.response?.data?.message || axiosError.message}`;
                statusCode = axiosError.response?.status || 500;
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            response.status(statusCode).json({
                error: "LINEWORKS notification failed",
                details: errorMessage,
                timestamp: new Date().toISOString()
            });
        }
    }
);

// 統合通知Function（メールまたはLINEWORKS）
export const sendUnifiedNotification = onRequest(
    {
        region: "asia-northeast1",
        cors: ["https://qrscan2-99ffd.web.app", "http://localhost:3000", "http://localhost:8000"],
    },
    async (request, response) => {
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
                response.status(405).json({ error: "Method not allowed" });
                return;
            }

            const {
                userData,
                notificationMethod,
                emailTo,
                botToken,
                channelId
            } = request.body;

            if (!userData || !notificationMethod) {
                response.status(400).json({
                    error: "Missing required parameters: userData, notificationMethod"
                });
                return;
            }

            logger.info("統合通知送信開始", {
                method: notificationMethod,
                userId: userData.user_id
            });

            if (notificationMethod === "lineworks") {
                if (!botToken || !channelId) {
                    response.status(400).json({
                        error: "LINEWORKS method requires botToken and channelId"
                    });
                    return;
                }

                // LINEWORKS通知を送信
                const message = `🎯 来場者到着のお知らせ

👤 **${userData.company_name || ""}の${userData.user_name || ""}様**が来場されました！

📋 **詳細情報**
• ユーザーID: ${userData.user_id || ""}
• 会社名: ${userData.company_name || ""}
• 担当者: ${userData.tantou || ""}
• 入場時刻: ${new Date().toLocaleString("ja-JP")}

🤖 受付システムより自動送信`;

                const lineworksResponse = await axios.post(
                    `https://apis.worksmobile.com/r/${process.env.LINEWORKS_API_ID}/message/v1/bot/${botToken}/message/push`,
                    {
                        channelId: channelId,
                        content: {
                            type: "text",
                            text: message
                        }
                    },
                    {
                        headers: {
                            "Authorization": `Bearer ${process.env.LINEWORKS_ACCESS_TOKEN}`,
                            "Content-Type": "application/json"
                        },
                        timeout: 10000
                    }
                );

                response.json({
                    success: true,
                    method: "lineworks",
                    message: "LINEWORKS notification sent successfully",
                    lineworksResponse: {
                        status: lineworksResponse.status
                    }
                });

            } else if (notificationMethod === "mail") {
                if (!emailTo) {
                    response.status(400).json({
                        error: "Email method requires emailTo parameter"
                    });
                    return;
                }

                // メール通知を送信（既存のロジック）
                const transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: process.env.GMAIL_USER,
                        pass: process.env.GMAIL_APP_PASSWORD,
                    },
                });

                const mailOptions = {
                    from: process.env.GMAIL_USER,
                    to: emailTo,
                    subject: "来場者到着通知",
                    html: `
                        <h2>来場者到着のお知らせ</h2>
                        <p><strong>${userData.company_name || ""}の${userData.user_name || ""}様</strong>が来場されました。</p>
                        <hr>
                        <h3>詳細情報</h3>
                        <ul>
                            <li><strong>ユーザーID:</strong> ${userData.user_id || ""}</li>
                            <li><strong>会社名:</strong> ${userData.company_name || ""}</li>
                            <li><strong>担当者:</strong> ${userData.tantou || ""}</li>
                            <li><strong>入場時刻:</strong> ${new Date().toLocaleString("ja-JP")}</li>
                        </ul>
                        <hr>
                        <p><small>受付システムより自動送信</small></p>
                    `,
                };

                const info = await transporter.sendMail(mailOptions);

                response.json({
                    success: true,
                    method: "mail",
                    message: "Email notification sent successfully",
                    messageId: info.messageId
                });

            } else {
                response.status(400).json({
                    error: "Invalid notification method. Use 'lineworks' or 'mail'"
                });
            }

        } catch (error) {
            logger.error("統合通知送信エラー", error);

            let errorMessage = "Unknown error";
            let statusCode = 500;

            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError: any = error;
                errorMessage = `API Error: ${axiosError.response?.status} - ${axiosError.response?.data?.message || axiosError.message}`;
                statusCode = axiosError.response?.status || 500;
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            response.status(statusCode).json({
                error: "Unified notification failed",
                details: errorMessage,
                timestamp: new Date().toISOString()
            });
        }
    }
);
