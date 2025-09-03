// プロフィール管理システム（Firebase Auth + Firestore統合版）
import {
  getAuth,
  updatePassword,
  updateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  initializeApp,
  getApps,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  query,
  collection,
  where,
  getDocs,
  limit,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase設定
const profileFirebaseConfig = {
  apiKey: "AIzaSyCWFL91baSHkjkvU_k-yTUv6QS191YTFlg",
  authDomain: "qrscan2-99ffd.firebaseapp.com",
  projectId: "qrscan2-99ffd",
  storageBucket: "qrscan2-99ffd.firebasestorage.app",
  messagingSenderId: "1089215781575",
  appId: "1:1089215781575:web:bf9d05f6930b7123813ce2",
  measurementId: "G-QZZWT3HW0W",
};

// Firebase初期化
const profileApp = getApps().length
  ? getApps()[0]
  : initializeApp(profileFirebaseConfig);
const profileAuth = getAuth(profileApp);
const profileDb = getFirestore(profileApp);

// プロフィール管理クラス
class ProfileManager {
  constructor() {
    this.currentAdminData = null;
    this.isEditMode = false;
    this.originalData = null;
  }

  // プロフィール画面を表示
  async showProfile() {
    try {
      console.log("=== プロフィール画面表示開始 ===");

      // 現在のFirebase Authユーザーを取得
      const currentUser = profileAuth.currentUser;
      if (!currentUser) {
        throw new Error("ログインが必要です");
      }

      console.log("Firebase Auth ユーザー:", currentUser.uid);

      // FirestoreからadminデータをUIDで検索
      const adminData = await this.getAdminDataByUID(currentUser.uid);
      if (!adminData) {
        throw new Error("管理者データが見つかりません");
      }

      console.log("管理者データ取得成功:", adminData);
      this.currentAdminData = adminData;
      this.originalData = { ...adminData }; // 元データを保存

      // プロフィール画面のHTMLを作成・表示
      this.createProfileModal();
      this.populateProfileForm(adminData);
      this.showProfileModal();
    } catch (error) {
      console.error("プロフィール画面表示エラー:", error);
      alert("プロフィール情報の取得に失敗しました: " + error.message);
    }
  }

  // UIDから管理者データを取得
  async getAdminDataByUID(uid) {
    try {
      console.log("UIDで管理者データ検索:", uid);

      const adminQuery = query(
        collection(profileDb, "admin_settings"),
        where("uid", "==", uid),
        limit(1)
      );

      const querySnapshot = await getDocs(adminQuery);
      if (querySnapshot.empty) {
        console.log("該当する管理者データが見つかりません");
        return null;
      }

      const docData = querySnapshot.docs[0].data();
      const docId = querySnapshot.docs[0].id;

      console.log("管理者データ取得:", { docId, ...docData });

      return {
        ...docData,
        docId: docId, // Firestore document ID も保存
      };
    } catch (error) {
      console.error("管理者データ取得エラー:", error);
      throw error;
    }
  }

  // プロフィールモーダルのHTMLを作成
  createProfileModal() {
    // 既存のモーダルがあれば削除
    const existingModal = document.getElementById("profileModal");
    if (existingModal) {
      existingModal.remove();
    }

    // プロフィールモーダルHTML（index.htmlのadminRegisterFormと同じスタイル）
    const modalHTML = `
      <div id="profileModal" class="modal-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        display: none;
      ">
        <div class="auth-container" style="
          background: white;
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
          max-width: 600px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        ">
          <div class="auth-form" style="text-align: center;">
            
            <h2 class="title" style="font-size: 28px; color: #333; margin-bottom: 15px; font-weight: 600;">
              管理者プロフィール
            </h2>
            <p class="subtitle" style="color: #666; margin-bottom: 40px; font-size: 16px; line-height: 1.6;">
              アカウント情報の表示・編集
            </p>

            <form id="profileForm".>
              <!-- 基本情報行 -->
              <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div class="form-group" style="margin-bottom: 0; text-align: left;">
                  <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">管理者ID</label>
                  <input type="text" id="profileAdminId" name="adminId" readonly style="
                    width: 100%; padding: 12px 15px; border: 2px solid #e1e5e9; border-radius: 10px; 
                    font-size: 16px; background-color: #f8f9fa;
                  " />
                  <small style="display: block; margin-top: 5px; font-size: 12px; color: #666;">管理者IDは変更できません</small>
                </div>
                <div class="form-group" style="margin-bottom: 0; text-align: left;">
                  <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">プロジェクト名</label>
                  <input type="text" id="profileProjectName" name="projectName" readonly style="
                    width: 100%; padding: 12px 15px; border: 2px solid #e1e5e9; border-radius: 10px; 
                    font-size: 16px; transition: border-color 0.3s ease; background-color: #f8f9fa;
                  " />
                  <small style="display: block; margin-top: 5px; font-size: 12px; color: #666;">プロジェクト名</small>
                </div>
              </div>

              <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div class="form-group" style="margin-bottom: 0; text-align: left;">
                  <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">パスワード</label>
                  <input type="password" id="profilePassword" name="password" readonly placeholder="••••••••" style="
                    width: 100%; padding: 12px 15px; border: 2px solid #e1e5e9; border-radius: 10px; 
                    font-size: 16px; transition: border-color 0.3s ease; background-color: #f8f9fa;
                  " />
                  <small style="display: block; margin-top: 5px; font-size: 12px; color: #666;">新しいパスワード（変更時のみ）</small>
                </div>
                <div class="form-group" style="margin-bottom: 0; text-align: left;">
                  <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">イベント開催日</label>
                  <input type="date" id="profileEventDate" name="eventDate" readonly style="
                    width: 100%; padding: 12px 15px; border: 2px solid #e1e5e9; border-radius: 10px; 
                    font-size: 16px; transition: border-color 0.3s ease; background-color: #f8f9fa;
                  " />
                  <small style="display: block; margin-top: 5px; font-size: 12px; color: #666;">イベント開催日</small>
                </div>
              </div>

              <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div class="form-group" style="margin-bottom: 0; text-align: left;">
                  <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">メールアドレス</label>
                  <input type="email" id="profileEmail" name="email" readonly style="
                    width: 100%; padding: 12px 15px; border: 2px solid #e1e5e9; border-radius: 10px; 
                    font-size: 16px; transition: border-color 0.3s ease; background-color: #f8f9fa;
                  " />
                  
                </div>
                <div class="form-group" style="margin-bottom: 0; text-align: left;">
                  <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">管理者名</label>
                  <input type="text" id="profileAdminName" name="adminName" readonly style="
                    width: 100%; padding: 12px 15px; border: 2px solid #e1e5e9; border-radius: 10px; 
                    font-size: 16px; transition: border-color 0.3s ease; background-color: #f8f9fa;
                  " />
                  
                </div>
              </div>

              <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div class="form-group" style="margin-bottom: 0; text-align: left;">
                  <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">電話番号</label>
                  <input type="tel" id="profilePhoneNumber" name="phoneNumber" readonly style="
                    width: 100%; padding: 12px 15px; border: 2px solid #e1e5e9; border-radius: 10px; 
                    font-size: 16px; transition: border-color 0.3s ease; background-color: #f8f9fa;
                  " />
                  
                </div>
                <div class="form-group" style="margin-bottom: 0; text-align: left;">
                  <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">会社名</label>
                  <input type="text" id="profileCompanyName" name="companyName" readonly style="
                    width: 100%; padding: 12px 15px; border: 2px solid #e1e5e9; border-radius: 10px; 
                    font-size: 16px; transition: border-color 0.3s ease; background-color: #f8f9fa;
                  " />
                  <small style="display: block; margin-top: 5px; font-size: 12px; color: #666;">会社名</small>
                </div>
              </div>

              <div class="form-row" style="display: grid; grid-template-columns: 1fr; gap: 15px; margin-bottom: 20px;">
                <div class="form-group" style="margin-bottom: 0; text-align: left;">
                  <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">アカウントステータス</label>
                  <select id="profileAccountStatus" name="accountStatus" disabled style="
                    width: 100%; padding: 12px 15px; border: 2px solid #e1e5e9; border-radius: 10px; 
                    font-size: 16px; transition: border-color 0.3s ease; background-color: #f8f9fa;
                  ">
                    <option value="test">🧪 テストモード（データベース30件 30日間使用可能）</option>
                    <option value="production">🚀 本番モード（無制限）</option>
                  </select>
                  <small style="display: block; margin-top: 5px; font-size: 12px; color: #666;">アカウントの使用タイプ</small>
                </div>
              </div>

              <!-- ボタン群 -->
              <div class="button-group-profile" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 30px;">
                <button type="button" id="editProfileBtn" class="btn btn-primary" style="
                  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                  color: white; border: none; padding: 15px 20px; border-radius: 10px; font-size: 14px;
                  font-weight: 600; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease;
                ">
                  ✏️ 編集
                </button>
                <button type="button" id="saveProfileBtn" class="btn btn-primary" style="
                  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); display: none;
                  color: white; border: none; padding: 15px 20px; border-radius: 10px; font-size: 14px;
                  font-weight: 600; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease;
                ">
                  💾 保存
                </button>
                <button type="button" id="cancelProfileBtn" class="btn btn-secondary" style="
                  background: #6c757d; color: white; border: none; padding: 15px 20px; border-radius: 10px; 
                  font-size: 14px; font-weight: 600; cursor: pointer; display: none;
                  transition: transform 0.2s ease, box-shadow 0.2s ease;
                ">
                  ❌ キャンセル
                </button>
                <button type="button" id="closeProfileBtn" class="btn btn-secondary" style="
                  background: #6c757d; color: white; border: none; padding: 15px 20px; border-radius: 10px; 
                  font-size: 14px; font-weight: 600; cursor: pointer;
                  transition: transform 0.2s ease, box-shadow 0.2s ease;
                ">
                  🚪 閉じる
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // HTMLを挿入
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // イベントリスナーを設定
    this.attachEventListeners();
  }

  // フォームにデータを入力
  populateProfileForm(adminData) {
    document.getElementById("profileAdminId").value = adminData.admin_id || "";
    document.getElementById("profileProjectName").value =
      adminData.project_name || adminData.projectName || "";
    document.getElementById("profilePassword").value = ""; // パスワードは空にする
    document.getElementById("profileEventDate").value =
      adminData.event_date || adminData.eventDate || "";
    document.getElementById("profileEmail").value = adminData.email || "";
    document.getElementById("profileAdminName").value =
      adminData.admin_name || adminData.adminName || "";
    document.getElementById("profilePhoneNumber").value =
      adminData.phone_number || adminData.phoneNumber || "";
    document.getElementById("profileCompanyName").value =
      adminData.company_name || adminData.companyName || "";

    // アカウントステータスをselect要素に設定
    const accountStatus = adminData.account_status || adminData.accountStatus || "test";
    document.getElementById("profileAccountStatus").value = accountStatus;
  }

  // イベントリスナーを設定
  attachEventListeners() {
    // 編集ボタン
    document.getElementById("editProfileBtn").addEventListener("click", () => {
      this.enableEditMode();
    });

    // 保存ボタン
    document.getElementById("saveProfileBtn").addEventListener("click", () => {
      this.saveProfile();
    });

    // キャンセルボタン
    document
      .getElementById("cancelProfileBtn")
      .addEventListener("click", () => {
        this.cancelEdit();
      });

    // 閉じるボタン
    document.getElementById("closeProfileBtn").addEventListener("click", () => {
      this.hideProfileModal();
    });

    // モーダル外クリックで閉じる
    document.getElementById("profileModal").addEventListener("click", (e) => {
      if (e.target.id === "profileModal") {
        this.hideProfileModal();
      }
    });
  }

  // 編集モードを有効にする
  enableEditMode() {
    this.isEditMode = true;

    // 編集可能フィールドのreadonly属性を削除（admin_idを除く）
    const editableFields = [
      "profileProjectName",
      "profilePassword",
      "profileEventDate",
      "profileEmail",
      "profileAdminName",
      "profilePhoneNumber",
      "profileCompanyName",
      "profileAccountStatus",
    ];

    editableFields.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      if (fieldId === "profileAccountStatus") {
        // selectボックスの場合はdisabled属性を削除
        field.removeAttribute("disabled");
      } else {
        // input要素の場合はreadonly属性を削除
        field.removeAttribute("readonly");
      }
      field.style.backgroundColor = "white";
      field.style.borderColor = "#667eea";
    });

    // ボタン表示を切り替え
    document.getElementById("editProfileBtn").style.display = "none";
    document.getElementById("saveProfileBtn").style.display = "block";
    document.getElementById("cancelProfileBtn").style.display = "block";
    document.getElementById("closeProfileBtn").style.display = "none";

    console.log("編集モードが有効になりました");
  }

  // 編集をキャンセル
  cancelEdit() {
    this.isEditMode = false;

    // 元データを復元
    this.populateProfileForm(this.originalData);

    // readonly属性を復元
    const editableFields = [
      "profileProjectName",
      "profilePassword",
      "profileEventDate",
      "profileEmail",
      "profileAdminName",
      "profilePhoneNumber",
      "profileCompanyName",
      "profileAccountStatus",
    ];

    editableFields.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      if (fieldId === "profileAccountStatus") {
        // selectボックスの場合はdisabled属性を追加
        field.setAttribute("disabled", "disabled");
      } else {
        // input要素の場合はreadonly属性を追加
        field.setAttribute("readonly", "readonly");
      }
      field.style.backgroundColor = "#f8f9fa";
      field.style.borderColor = "#e1e5e9";
    });

    // ボタン表示を戻す
    document.getElementById("editProfileBtn").style.display = "block";
    document.getElementById("saveProfileBtn").style.display = "none";
    document.getElementById("cancelProfileBtn").style.display = "none";
    document.getElementById("closeProfileBtn").style.display = "block";

    console.log("編集がキャンセルされました");
  }

  // プロフィールを保存
  async saveProfile() {
    try {
      console.log("=== プロフィール保存開始 ===");

      // フォームデータを取得
      const formData = new FormData(document.getElementById("profileForm"));
      const updatedData = {
        project_name: formData.get("projectName"),
        event_date: formData.get("eventDate"),
        email: formData.get("email"),
        admin_name: formData.get("adminName"),
        phone_number: formData.get("phoneNumber"),
        company_name: formData.get("companyName"),
        account_status: formData.get("accountStatus"),
        updated_at: serverTimestamp(),
      };

      const newPassword = formData.get("password");

      console.log("更新データ:", updatedData);

      // Firestoreを更新
      const adminDocRef = doc(
        profileDb,
        "admin_settings",
        this.currentAdminData.docId
      );
      await updateDoc(adminDocRef, updatedData);
      console.log("Firestore更新完了");

      // Firebase Authの情報も更新（メールアドレスまたはパスワード変更時）
      const currentUser = profileAuth.currentUser;
      if (currentUser) {
        // メールアドレス変更
        if (updatedData.email !== this.originalData.email) {
          await updateEmail(currentUser, updatedData.email);
          console.log("Firebase Auth メールアドレス更新完了");
        }

        // パスワード変更
        if (newPassword && newPassword.length > 0) {
          await updatePassword(currentUser, newPassword);
          console.log("Firebase Auth パスワード更新完了");

          // Firestoreにもパスワードを保存
          await updateDoc(adminDocRef, {
            password: newPassword,
            updated_at: serverTimestamp(),
          });
        }
      }

      // 成功時の処理
      alert("プロフィールが正常に更新されました");

      // 編集モードを終了
      this.isEditMode = false;
      this.currentAdminData = { ...this.currentAdminData, ...updatedData };
      this.originalData = { ...this.currentAdminData };

      // readonly属性を復元
      const editableFields = [
        "profileProjectName",
        "profilePassword",
        "profileEventDate",
        "profileEmail",
        "profileAdminName",
        "profilePhoneNumber",
        "profileCompanyName",
        "profileAccountStatus",
      ];

      editableFields.forEach((fieldId) => {
        const field = document.getElementById(fieldId);
        if (fieldId === "profileAccountStatus") {
          // selectボックスの場合はdisabled属性を追加
          field.setAttribute("disabled", "disabled");
        } else {
          // input要素の場合はreadonly属性を追加
          field.setAttribute("readonly", "readonly");
        }
        field.style.backgroundColor = "#f8f9fa";
        field.style.borderColor = "#e1e5e9";
      });

      // パスワードフィールドをクリア
      document.getElementById("profilePassword").value = "";

      // ボタン表示を戻す
      document.getElementById("editProfileBtn").style.display = "block";
      document.getElementById("saveProfileBtn").style.display = "none";
      document.getElementById("cancelProfileBtn").style.display = "none";
      document.getElementById("closeProfileBtn").style.display = "block";
    } catch (error) {
      console.error("プロフィール保存エラー:", error);
      alert("プロフィールの保存に失敗しました: " + error.message);
    }
  }

  // プロフィールモーダルを表示
  showProfileModal() {
    const modal = document.getElementById("profileModal");
    if (modal) {
      modal.style.display = "flex";
    }
  }

  // プロフィールモーダルを非表示
  hideProfileModal() {
    const modal = document.getElementById("profileModal");
    if (modal) {
      modal.style.display = "none";
      modal.remove(); // DOMから削除
    }
  }
}

// グローバルインスタンス
const profileManager = new ProfileManager();

// グローバル関数（admin.htmlから呼び出し用）
window.showProfile = function () {
  console.log("showProfile 関数が呼ばれました");
  profileManager.showProfile();
};

// DOMContentLoaded時の初期化
document.addEventListener("DOMContentLoaded", function () {
  console.log("profile.js 初期化完了");

  // profileBtnがある場合はイベントリスナーを追加
  setTimeout(() => {
    const profileBtn = document.getElementById("profileBtn");
    if (profileBtn) {
      profileBtn.addEventListener("click", function () {
        console.log("profileBtn クリック");
        profileManager.showProfile();
      });
      console.log("profileBtnにイベントリスナー追加完了");
    } else {
      console.log("profileBtn要素が見つかりません");
    }
  }, 1000); // 1秒後に再試行
});

// エクスポート
export { ProfileManager };
