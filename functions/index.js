const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Firebase Admin初期化
if (!admin.apps.length) {
  admin.initializeApp();
}

// カスタムトークン生成関数
exports.createCustomToken = functions.https.onRequest(async (req, res) => {
  // CORS設定
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const {userId} = req.body;

    if (!userId) {
      res.status(400).json({error: "userId is required"});
      return;
    }

    // Firestoreからユーザー情報取得
    const db = admin.firestore();
    const usersQuery = db.collection("users").where("user_id", "==", userId);
    const querySnapshot = await usersQuery.get();

    if (querySnapshot.empty) {
      res.status(404).json({error: "User not found"});
      return;
    }

    const userData = querySnapshot.docs[0].data();

    // ステータスチェック
    if (userData.status === "退場済") {
      res.status(403).json({error: "User is not active"});
      return;
    }

    // カスタムクレーム設定
    const customClaims = {
      user_id: userData.user_id,
      role: userData.user_role || userData.role,
      user_name: userData.user_name,
      department: userData.department,
    };

    // カスタムトークン生成
    const customToken = await admin.auth().createCustomToken(userId, customClaims);

    res.json({
      customToken: customToken,
      user: userData,
    });
  } catch (error) {
    console.error("Error creating custom token:", error);
    res.status(500).json({error: "Internal server error"});
  }
});
