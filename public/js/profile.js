// DOMContentLoaded時にイベントバインド（type="module"でも通常scriptでも動作）
document.addEventListener("DOMContentLoaded", function () {
  const profileBtn = document.getElementById("profileBtn");
  if (profileBtn) profileBtn.addEventListener("click", showProfileModal);
  const settingsBtn = document.getElementById("settingsBtn");
  if (settingsBtn) settingsBtn.addEventListener("click", showSettingsModal);
});
// ===== プロフィール機能 =====
// Firebase初期化・Firestore参照（admin.jsと同じ設定を利用）
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase設定（admin.jsと同じ内容を利用）
const firebaseConfig = window.firebaseConfig || {
  apiKey: "AIzaSyA...", // 必要に応じてadmin.jsからコピー
  authDomain: "qrscan2-99ffd.firebaseapp.com",
  projectId: "qrscan2-99ffd",
  storageBucket: "qrscan2-99ffd.firebasestorage.app",
  messagingSenderId: "...",
  appId: "...",
};
const app = window.firebaseApp || initializeApp(firebaseConfig);
const db = window.db || getFirestore(app);
let currentAdmin = window.currentAdmin;

// プロフィールモーダルを開く
async function showProfileModal() {
  console.log("=== プロフィールモーダル開始 ===");

  if (!currentAdmin) {
    console.error("Admin認証情報がありません");
    alert("Admin認証情報を取得できませんでした。再ログインしてください。");
    return;
  }

  const profileContent = document.getElementById("profileContent");
  if (!profileContent) {
    console.error("profileContent要素が見つかりません");
    return;
  }

  // admin_settingsから設定情報を取得
  let adminSettings = null;
  try {
    const settingsRef = doc(db, "admin_settings", currentAdmin.admin_id);
    const settingsDoc = await getDoc(settingsRef);
    if (settingsDoc.exists()) {
      adminSettings = settingsDoc.data();
      console.log("admin_settings取得成功:", adminSettings);
    }
  } catch (error) {
    console.error("admin_settings取得エラー:", error);
  }

  // パスワードを伏字にする
  const passwordDisplay = adminSettings?.admin_password
    ? "●".repeat(adminSettings.admin_password.length)
    : "未設定";

  // statusの表示を判定
  const statusDisplay =
    adminSettings?.status === "production"
      ? "本番モード"
      : adminSettings?.status === "test"
      ? "テストモード"
      : "未設定";

  // 統合レイアウトで表示と編集フィールドを生成
  profileContent.innerHTML = `
    <!-- 左列: 基本情報 -->
    <div class="profile-column">
      <div class="profile-item">
        <label class="profile-label">管理者 ID:</label>
        <input type="text" id="edit_admin_id" class="profile-input" value="${
          currentAdmin.admin_id
        }" disabled />
        <small>変更不可</small>
      </div>

      <div class="profile-item">
        <label class="profile-label">管理者名:</label>
        <input type="text" id="edit_admin_name" class="profile-input" value="${
          currentAdmin.admin_name || ""
        }" disabled />
      </div>

      <div class="profile-item">
        <label class="profile-label">会社名:</label>
        <input type="text" id="edit_company_name" class="profile-input" value="${
          currentAdmin.company_name || ""
        }" disabled />
      </div>

      <div class="profile-item">
        <label class="profile-label">メールアドレス:</label>
        <input type="email" id="edit_email" class="profile-input" value="${
          currentAdmin.email || ""
        }" disabled />
      </div>

      <div class="profile-item">
        <label class="profile-label">電話番号:</label>
        <input type="text" id="edit_phone" class="profile-input" value="${
          currentAdmin.phone || ""
        }" disabled />
      </div>
    </div>

    <!-- 右列: 設定情報 -->
    <div class="profile-column">
      <div class="profile-item">
        <label class="profile-label">管理者パスワード:</label>
        <div class="password-container">
          <input type="password" id="edit_password" class="profile-input password-input" value="${
            adminSettings?.password || ""
          }" disabled />
          <button type="button" class="password-toggle" onclick="togglePasswordVisibility('edit_password', this)">
            👁️
          </button>
        </div>
        <small>管理者のみがダッシュボードにアクセスできます</small>
      </div>

      <div class="profile-item">
        <label class="profile-label">運用状況:</label>
        <select id="edit_status" class="profile-input" disabled>
          <option value="test" ${
            adminSettings?.status === "test" ? "selected" : ""
          }>テストモード</option>
          <option value="production" ${
            adminSettings?.status === "production" ? "selected" : ""
          }>本番モード</option>
        </select>
        <small>テストモードは３０日間のみになります</small>
      </div>

      <div class="profile-item">
        <label class="profile-label">プロジェクト名:</label>
        <input type="text" id="edit_project_id" class="profile-input" value="${
          adminSettings?.project_id || ""
        }" disabled />
        <small>名札印刷に使用されます</small>
      </div>

      <div class="profile-item">
        <label class="profile-label">展示会日:</label>
        <input type="date" id="edit_project_day" class="profile-input" value="${
          adminSettings?.project_day || ""
        }" disabled />
        <small>名札印刷に使用されます</small>
      </div>

      <div class="profile-item">
        <label class="profile-label">データパス:</label>
        <input type="text" class="profile-input" value="admin_collections/${
          currentAdmin.admin_id
        }/" disabled 
               style="font-family: monospace; background-color: #f8f9fa;" />
        <small>Firestore保存パス</small>
      </div>
    </div>
  `;

  // 編集モードのフラグを設定
  window.isEditMode = false;

  console.log("Admin情報をプロフィールモーダルに表示完了");
  document.getElementById("profileModal").style.display = "block";
  console.log("=== プロフィールモーダル完了 ===");
}

// プロフィールモーダルを閉じる
function closeProfileModal() {
  // 編集モードがオンの場合はリセット
  if (window.isEditMode) {
    window.isEditMode = false;
    const editToggleBtn = document.getElementById("editToggleBtn");
    const saveProfileBtn = document.getElementById("saveProfileBtn");

    if (editToggleBtn) editToggleBtn.style.display = "inline-block";
    if (saveProfileBtn) saveProfileBtn.style.display = "none";
  }

  document.getElementById("profileModal").style.display = "none";
}

// 編集モード切り替え
function toggleEditMode() {
  const isEditMode = window.isEditMode || false;
  const editToggleBtn = document.getElementById("editToggleBtn");
  const saveProfileBtn = document.getElementById("saveProfileBtn");

  // 編集可能なフィールドを取得
  const editableFields = [
    "edit_admin_name",
    "edit_company_name",
    "edit_email",
    "edit_phone",
    "edit_password",
    "edit_status",
    "edit_project_id",
    "edit_project_day",
  ];

  if (!isEditMode) {
    // 編集モードに切り替え
    editableFields.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.disabled = false;
        field.style.backgroundColor = "#fff";
        field.style.borderColor = "#4285f4";
      }
    });

    editToggleBtn.style.display = "none";
    saveProfileBtn.style.display = "inline-block";
    window.isEditMode = true;
  } else {
    // 表示モードに戻す
    editableFields.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.disabled = true;
        field.style.backgroundColor = "#f5f5f5";
        field.style.borderColor = "#e0e0e0";
      }
    });

    editToggleBtn.style.display = "inline-block";
    saveProfileBtn.style.display = "none";
    window.isEditMode = false;
  }
}

// パスワード表示/非表示切り替え
function togglePasswordVisibility(fieldId, toggleButton) {
  const passwordField = document.getElementById(fieldId);
  if (!passwordField) return;

  if (passwordField.type === "password") {
    passwordField.type = "text";
    toggleButton.textContent = "🙈"; // 隠すアイコン
    toggleButton.title = "パスワードを隠す";
  } else {
    passwordField.type = "password";
    toggleButton.textContent = "👁️"; // 表示アイコン
    toggleButton.title = "パスワードを表示";
  }
}

// プロフィール編集モーダルを開く
async function editProfile() {
  try {
    console.log("editProfile関数開始");

    if (!currentAdmin) {
      console.error("Admin認証情報がありません");
      alert("Admin認証情報を取得できませんでした。再ログインしてください。");
      return;
    }

    // admin_settingsから設定情報を取得
    let adminSettings = null;
    try {
      const settingsRef = doc(db, "admin_settings", currentAdmin.admin_id);
      const settingsDoc = await getDoc(settingsRef);
      if (settingsDoc.exists()) {
        adminSettings = settingsDoc.data();
        console.log("admin_settings取得成功:", adminSettings);
      } else {
        console.log("admin_settings文書が存在しません");
      }
    } catch (error) {
      console.error("admin_settings取得エラー:", error);
    }

    // 現在のAdmin情報を表示セクションに設定
    const currentUserDetails = document.getElementById("currentUserDetails");
    if (currentUserDetails) {
      console.log("プロフィール編集モーダル用Admin情報:", currentAdmin);
      currentUserDetails.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
        <div>
          <strong>Admin ID:</strong><br>
          <span style="color: #666;">${currentAdmin.admin_id}</span>
        </div>
        <div>
          <strong>管理者名:</strong><br>
          <span style="color: #666;">${currentAdmin.admin_name}</span>
        </div>
        <div>
          <strong>会社名:</strong><br>
          <span style="color: #666;">${
            currentAdmin.company_name || "未設定"
          }</span>
        </div>
        <div>
          <strong>権限:</strong><br>
          <span style="color: #666;">${currentAdmin.role}</span>
        </div>
      </div>
      <div style="margin-top: 10px; font-size: 14px;">
        <strong>メール:</strong> <span style="color: #666;">${
          currentAdmin.email || "未設定"
        }</span><br>
        <strong>電話番号:</strong> <span style="color: #666;">${
          currentAdmin.phone || "未設定"
        }</span><br>
        <strong>データパス:</strong> <span style="color: #666; font-family: monospace;">admin_collections/${
          currentAdmin.admin_id
        }/</span>
      </div>
    `;
    } else {
      console.log("currentUserDetails要素が見つかりません");
    }

    // フォームに現在の値を設定
    const elements = {
      edit_user_id: currentAdmin.admin_id || "",
      edit_user_name: currentAdmin.admin_name || "",
      edit_company_name: currentAdmin.company_name || "",
      edit_email: currentAdmin.email || "",
      edit_phone: currentAdmin.phone || "",
      setting_password: adminSettings?.admin_password || "", // パスワード設定
      project_id: adminSettings?.project_id || "", // プロジェクト名
      project_day: adminSettings?.project_day || "", // 展示会日
      setting_status: adminSettings?.status || "test", // 運用状況
    };

    // 要素の存在確認とエラーハンドリング
    Object.entries(elements).forEach(([elementId, value]) => {
      const element = document.getElementById(elementId);
      if (element) {
        if (element.type === "select-one") {
          element.value = value;
        } else {
          element.value = value;
        }
      } else {
        console.error(`要素が見つかりません: ${elementId}`);
      }
    });

    // プロフィールモーダルを閉じて編集モーダルを開く
    closeProfileModal();

    const profileEditModal = document.getElementById("profileEditModal");
    if (profileEditModal) {
      profileEditModal.style.display = "block";
      console.log("editProfile関数正常完了");
    } else {
      console.error("profileEditModal要素が見つかりません");
      alert(
        "プロフィール編集モーダルが見つかりません。ページを再読み込みしてください。"
      );
    }
  } catch (error) {
    console.error("editProfile関数でエラーが発生:", error);
    alert(`プロフィール編集を開く際にエラーが発生しました: ${error.message}`);
  }
}

// プロフィール編集モーダルを閉じる
function closeProfileEditModal() {
  document.getElementById("profileEditModal").style.display = "none";
}

// プロフィールを保存
async function saveProfile() {
  try {
    if (!currentAdmin) {
      alert("Admin認証情報を取得できませんでした");
      return;
    }

    // 新しいフィールドIDから値を取得
    const updatedData = {
      admin_name: document.getElementById("edit_admin_name").value,
      company_name: document.getElementById("edit_company_name").value,
      email: document.getElementById("edit_email").value,
      phone: document.getElementById("edit_phone").value,
      updatedAt: new Date(),
    };

    // admin_settingsに設定情報を保存
    try {
      const settingsRef = doc(db, "admin_settings", currentAdmin.admin_id);
      const settingsData = {
        admin_id: currentAdmin.admin_id,
        updatedAt: new Date(),
      };

      // パスワード
      const passwordField = document.getElementById("edit_password");
      if (passwordField && passwordField.value.trim()) {
        settingsData.password = passwordField.value.trim();
      }

      // プロジェクト名
      const projectIdField = document.getElementById("edit_project_id");
      if (projectIdField) {
        settingsData.project_id = projectIdField.value.trim();
      }

      // 展示会日
      const projectDayField = document.getElementById("edit_project_day");
      if (projectDayField) {
        settingsData.project_day = projectDayField.value.trim();
      }

      // 運用状況
      const statusField = document.getElementById("edit_status");
      if (statusField) {
        settingsData.status = statusField.value;
      }

      await setDoc(settingsRef, settingsData, { merge: true });
      console.log("admin_settingsに設定を保存しました:", settingsData);
    } catch (error) {
      console.error("admin_settings保存エラー:", error);
      alert("設定の保存中にエラーが発生しました: " + error.message);
      return;
    }

    // currentAdminの情報を更新
    const newAdminData = { ...currentAdmin, ...updatedData };

    // localStorageのcurrentAdminを更新
    localStorage.setItem("currentAdmin", JSON.stringify(newAdminData));

    // グローバル変数も更新
    currentAdmin = newAdminData;
    window.currentAdmin = newAdminData;

    console.log("Admin情報を更新しました:", newAdminData);

    // 編集モードを終了
    toggleEditMode();

    alert("管理者プロフィールを更新しました");

    // Admin情報表示を更新
    //displayAdminInfo();
  } catch (error) {
    console.error("Adminプロフィール更新エラー:", error);
    alert("プロフィールの更新中にエラーが発生しました: " + error.message);
  }
}

// ===== 設定機能 =====

// 設定モーダルを閉じる
function closeSettingsModal() {
  document.getElementById("settingsModal").style.display = "none";
}

// 設定を保存
async function saveSettings() {
  const password = document.getElementById("setting_password").value.trim();

  if (!password) {
    alert("管理者パスワードは必須です");
    return;
  }

  try {
    // Firestoreに管理者設定を保存
    const settingsRef = doc(db, "admin_settings", "config");
    await setDoc(settingsRef, {
      admin_password: password, // 実際のプロダクションではハッシュ化が必要
      updated_at: new Date(),
      updated_by: getCurrentUserId(),
    });

    // localStorage にもバックアップ保存（下位互換性のため）
    localStorage.setItem("qr_password", password);

    alert("管理者設定をFirestoreに保存しました");
    closeSettingsModal();
  } catch (error) {
    console.error("設定保存エラー:", error);
    alert("設定の保存中にエラーが発生しました: " + error.message);
  }
}

// 現在のユーザーIDを取得
function getCurrentUserId() {
  try {
    const sessionData = localStorage.getItem("currentUser");
    if (sessionData) {
      const user = JSON.parse(sessionData);
      return user.user_id || user.uid || "unknown";
    }
    return "unknown";
  } catch (error) {
    console.error("現在のユーザーID取得エラー:", error);
    return "unknown";
  }
}

// デフォルトプロジェクト名を生成する関数
function generateDefaultProjectName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0"); // 月は0から始まるので+1
  const day = String(now.getDate()).padStart(2, "0");

  return `EXPO${year}${month}${day}`;
}

// 設定モーダルを開く
async function showSettingsModal() {
  try {
    // Firestoreから設定を読み込み
    const settingsRef = doc(db, "admin_settings", "config");
    const settingsDoc = await getDoc(settingsRef);

    // URLプレビューを更新
    updateUrlPreview();

    // モーダルを表示
    document.getElementById("settingsModal").style.display = "block";
  } catch (error) {
    console.error("設定読み込みエラー:", error);
    // エラーが発生してもモーダルは表示する
    document.getElementById("settingsModal").style.display = "block";
    alert("設定の読み込み中にエラーが発生しました: " + error.message);
  }
} // ヘッダーのユーザー情報を更新
function updateHeaderUserInfo() {
  const userInfoElement = document.getElementById("userInfo");
  if (!userInfoElement) {
    console.log("userInfo要素が見つかりません");
    return;
  }

  // 複数の方法でユーザー情報を取得
  let user = null;

  // 方法1: UserSessionクラスから取得
  if (window.UserSession && typeof UserSession.getCurrentUser === "function") {
    try {
      user = UserSession.getCurrentUser();
      console.log("UserSession経由でユーザー情報取得:", user);
    } catch (error) {
      console.log("UserSession取得エラー:", error);
    }
  }

  // 方法2: localStorageから直接取得
  if (!user) {
    try {
      const sessionData = localStorage.getItem("currentUser");
      if (sessionData) {
        user = JSON.parse(sessionData);
        console.log("localStorage経由でユーザー情報取得:", user);
      }
    } catch (error) {
      console.log("localStorage解析エラー:", error);
    }
  }

  if (user && userInfoElement) {
    const displayName = user.user_name || user.name || "ユーザー";
    const displayRole = user.role || "未設定";
    //userInfoElement.textContent = `${displayName} (${displayRole})`;
    console.log("ヘッダーのユーザー情報を更新:", userInfoElement.textContent);
  } else {
    console.log("ユーザー情報が取得できませんでした");
    userInfoElement.textContent = "未ログイン";
  }
}
// プロフィール関数群をグローバル公開（ファイル末尾・try-catchで安全に）
try {
  window.showProfileModal = showProfileModal;
  window.closeProfileModal = closeProfileModal;
  window.toggleEditMode = toggleEditMode;
  window.togglePasswordVisibility = togglePasswordVisibility;
  window.editProfile = editProfile;
  window.showSettingsModal = showSettingsModal;
} catch (e) {
  console.error("window公開エラー", e);
}
