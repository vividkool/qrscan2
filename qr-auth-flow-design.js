/**
 * QRコード統一認証フロー設計案
 *
 * 【現在の課題】
 * - 各ページ（user/staff/maker）で個別認証処理
 * - user_idでの認証時にcurrentUserがadminのままになる
 * - 直リンクアクセス時の認証状態管理が複雑
 *
 * 【推奨フロー】
 * 1. QRコード → login.html?user_id=xxx&admin_id=xxx&event_id=xxx
 * 2. login.htmlで統一認証処理
 * 3. 認証成功後、ユーザーロールに応じて適切なページにリダイレクト
 *
 * 【メリット】
 * - 認証処理の一元化
 * - ユーザーロール判定の統一
 * - セキュリティの向上
 * - メンテナンス性の向上
 */

// QRコード認証用の新しいlogin.js実装例

// QRコードパラメータチェック
const urlParams = new URLSearchParams(window.location.search);
const qrUserId = urlParams.get("user_id");
const qrAdminId = urlParams.get("admin_id");
const qrEventId = urlParams.get("event_id");

// QRコードからのアクセス判定
if (qrUserId && qrAdminId && qrEventId) {
  console.log("QRコードからのアクセス検出");

  // QRコード専用認証処理
  await performQRCodeAuth(qrUserId, qrAdminId, qrEventId);
} else {
  // 通常のログイン画面表示
  showNormalLoginForm();
}

async function performQRCodeAuth(userId, adminId, eventId) {
  try {
    // 1. ユーザー情報をFirestoreから取得
    const userDoc = await getDoc(doc(db, "users", userId));

    if (!userDoc.exists()) {
      throw new Error("ユーザーが見つかりません");
    }

    const userData = userDoc.data();

    // 2. 管理者・イベント権限チェック
    if (userData.admin_id !== adminId) {
      throw new Error("管理者権限がありません");
    }

    // 3. Firebase Auth認証実行
    const customToken = await generateCustomToken(userId, userData);
    const userCredential = await signInWithCustomToken(getAuth(), customToken);

    // 4. ロール判定とリダイレクト
    const userRole = userData.role || "user";

    switch (userRole) {
      case "user":
        window.location.href = "user.html";
        break;
      case "staff":
        window.location.href = "staff.html";
        break;
      case "maker":
        window.location.href = "maker.html";
        break;
      case "admin":
        window.location.href = "admin.html";
        break;
      default:
        window.location.href = "user.html";
    }
  } catch (error) {
    console.error("QRコード認証エラー:", error);
    showError("認証に失敗しました: " + error.message);
  }
}
