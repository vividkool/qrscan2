// デバッグ用：通常のusersコレクションと比較する関数
window.compareCollections = async function () {
  console.log("=== コレクション比較開始 ===");

  try {
    // 通常のusersコレクション
    const normalCollection = collection(db, "users");
    const normalSnapshot = await getDocs(normalCollection);
    console.log(`📊 通常のusersコレクション: ${normalSnapshot.size}件`);
    console.log(`📂 パス: users/`);

    // Admin別のusersコレクション
    if (currentAdmin) {
      const adminCollection = getAdminCollection("users");
      const adminSnapshot = await getDocs(adminCollection);
      console.log(`📊 Admin別usersコレクション: ${adminSnapshot.size}件`);
      console.log(`📂 パス: admin_collections/${currentAdmin.admin_id}/users/`);
    }

    console.log("=== 比較完了 ===");
  } catch (error) {
    console.error("比較エラー:", error);
  }
};

// ファイルアップロードモーダル関連の変数
let selectedFile = null;

// ファイルアップロードモーダルを表示
function showFileUploadModal() {
  const modal = document.getElementById("fileUploadModal");
  modal.style.display = "flex";
  setupDragDropEvents();
  setupFileInputEvent();
}

// ファイルアップロードモーダルを閉じる
function closeFileUploadModal() {
  const modal = document.getElementById("fileUploadModal");
  modal.style.display = "none";
  clearSelectedFile();
}

// 選択されたファイルをクリア
function clearSelectedFile() {
  console.log("[DEBUG] clearSelectedFile called");
  selectedFile = null;
  document.getElementById("selectedFileInfo").style.display = "none";
  document.getElementById("uploadAction").style.display = "none";
  document.getElementById("hiddenFileInput").value = "";
  resetDropZoneStyle();
  console.log("[DEBUG] selectedFile cleared, now:", selectedFile);
}

// ドロップゾーンのスタイルをリセット
function resetDropZoneStyle() {
  const dropZone = document.getElementById("dropZone");
  dropZone.style.border = "3px dashed #4285f4";
  dropZone.style.background = "#f8f9ff";
}

// ドラッグ&ドロップイベントのセットアップ
function setupDragDropEvents() {
  const dropZone = document.getElementById("dropZone");

  // ドラッグオーバー
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.border = "3px dashed #2196f3";
    dropZone.style.background = "#e3f2fd";
  });

  // ドラッグリーブ
  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    resetDropZoneStyle();
  });

  // ドロップ
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    resetDropZoneStyle();

    const files = e.dataTransfer.files;
    console.log("[DEBUG] Drop event - files received:", files);

    if (files.length > 0) {
      console.log("[DEBUG] Processing dropped file:", files[0]);
      handleFileSelect(files[0]);
    } else {
      console.log("[DEBUG] No files in drop event");
    }
  });

  // クリックイベント
  dropZone.addEventListener("click", (e) => {
    if (e.target.tagName !== "BUTTON") {
      document.getElementById("hiddenFileInput").click();
    }
  });
}

// ファイル入力イベントのセットアップ
function setupFileInputEvent() {
  const fileInput = document.getElementById("hiddenFileInput");
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  });
}

// ファイル選択処理
function handleFileSelect(file) {
  console.log("[DEBUG] handleFileSelect called with file:", file);

  // ファイルタイプチェック
  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
  ];

  if (!file) {
    console.error("[ERROR] No file provided to handleFileSelect");
    alert("ファイルが選択されていません。");
    return;
  }

  if (!allowedTypes.includes(file.type)) {
    console.log("[DEBUG] Invalid file type:", file.type);
    alert("Excel ファイル（.xlsx または .xls）を選択してください。");
    return;
  }

  selectedFile = file;
  console.log("[DEBUG] selectedFile set to:", selectedFile);

  // ファイル情報表示
  document.getElementById("fileName").textContent = file.name;
  document.getElementById("fileSize").textContent = formatFileSize(file.size);
  document.getElementById("selectedFileInfo").style.display = "block";
  document.getElementById("uploadAction").style.display = "block";
}

// ファイルサイズをフォーマット
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// アップロード処理を開始（既存の確認モーダルを使用）
function proceedWithUpload() {
  console.log("[DEBUG] proceedWithUpload called");
  console.log("[DEBUG] Current selectedFile:", selectedFile);

  if (!selectedFile) {
    console.error("[ERROR] No selectedFile available");
    alert("ファイルが選択されていません。");
    return;
  }

  // ファイルの有効性を再チェック
  if (!selectedFile.name || !selectedFile.type) {
    console.error("[ERROR] Invalid selectedFile object:", selectedFile);
    alert("選択されたファイルが無効です。再度選択してください。");
    return;
  }

  // ファイルをローカル変数に保存（モーダルクローズでクリアされる前に）
  const fileToProcess = selectedFile;
  console.log("[DEBUG] File saved to local variable:", fileToProcess);

  // ドラッグ&ドロップモーダルを閉じる
  closeFileUploadModal();

  // 少し待ってから既存のファイル処理フローを実行
  setTimeout(() => {
    // ファイル入力に選択したファイルをセット
    const fileInput = document.getElementById("excelFileInput");

    try {
      const dataTransfer = new DataTransfer();
      const file = new File([fileToProcess], fileToProcess.name, {
        type: fileToProcess.type,
        lastModified: fileToProcess.lastModified || Date.now(),
      });
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      console.log("[DEBUG] FileInput.files set successfully");

      // 既存の確認モーダルを表示
      if (typeof showUploadOptionsModal === "function") {
        console.log("[DEBUG] Calling showUploadOptionsModal with fileInput");
        showUploadOptionsModal(fileInput);
      } else {
        console.error("[ERROR] showUploadOptionsModal function not found");
        alert(
          "アップロード機能の初期化に失敗しました。ページを再読み込みしてください。"
        );
      }
    } catch (error) {
      console.error("File processing error:", error);
      alert("ファイル処理中にエラーが発生しました。");
    }
  }, 300);
}

// 旧handleFileUpload関数（後方互換性のため保持）
function handleFileUpload(mode) {
  // 新しいフローにリダイレクト
  proceedWithUpload();
}

// 直接ファイル処理を行うフォールバック関数
function processSelectedFile(file, mode) {
  console.log("[DEBUG] processSelectedFile called with:", { file, mode });

  if (!file) {
    console.error("[ERROR] No file provided to processSelectedFile");
    alert("ファイルが選択されていません。");
    return;
  }

  // template-utils.jsの関数を直接呼び出し
  if (window.uploadExcelFile) {
    const uploadMode = mode === "append" ? "append" : "replace";
    console.log("[DEBUG] Calling uploadExcelFile with mode:", uploadMode);
    window.uploadExcelFile(file, uploadMode);
  } else {
    console.error("uploadExcelFile関数が見つかりません");
    alert(
      "アップロード機能の初期化に失敗しました。ページを再読み込みしてください。"
    );
  }
}

// Makerページを新しいタブで開く
function openMakerPage() {
  window.open("maker.html", "_blank");
}

// ユーザーリストのCSVエクスポート機能（管理者専用）
function exportUsersList() {
  try {
    // filteredUsersがグローバルに定義されているかチェック
    if (typeof filteredUsers === 'undefined' || !filteredUsers) {
      throw new Error('ユーザーデータが読み込まれていません。');
    }

    let csvContent =
      "ユーザー名,ユーザーID,会社名,部署,ロール,入退場ステータス,印刷ステータス,担当者\n";

    filteredUsers.forEach((user) => {
      const row = [
        user.user_name || "",
        user.user_id || "",
        user.company_name || "",
        user.department || "",
        user.role || user.user_role || "",
        user.status || "未設定",
        user.print_status || "未",
        user.tantou || "",
      ]
        .map((field) => `"${field.replace(/"/g, '""')}"`) // CSVエスケープ処理を改善
        .join(",");

      csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    // ファイル名にイベントIDを含める
    const eventId = window.currentAdmin?.event_id || 'event';
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `users_list_${eventId}_${timestamp}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // URLオブジェクトを解放
    URL.revokeObjectURL(url);

    console.log(`ユーザーリストエクスポート完了: ${filename}`);

    // 成功メッセージ表示
    if (typeof showSuccessMessage === 'function') {
      showSuccessMessage(`ユーザー一覧をCSVファイル（${filename}）でエクスポートしました。`);
    } else {
      alert(`ユーザー一覧をCSVファイル（${filename}）でエクスポートしました。`);
    }
  } catch (error) {
    console.error("エクスポートエラー:", error);

    // エラーメッセージ表示
    if (typeof showErrorMessage === 'function') {
      showErrorMessage(`エクスポートに失敗しました: ${error.message}`);
    } else {
      alert(`エクスポートに失敗しました: ${error.message}`);
    }
  }
}

// グローバル関数として公開
window.openMakerPage = openMakerPage;
window.exportUsersList = exportUsersList;
window.showFileUploadModal = showFileUploadModal;
window.closeFileUploadModal = closeFileUploadModal;
window.clearSelectedFile = clearSelectedFile;
window.handleFileUpload = handleFileUpload;
window.processSelectedFile = processSelectedFile;
window.proceedWithUpload = proceedWithUpload;
