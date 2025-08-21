// 名札（Badge）作成・印刷・プレビュー関連関数
// このファイルはadmin.jsから分離した名札専用ロジックです

// 例: 名札データ生成
function generateBadgeData(user) {
    // ユーザー情報から名札データを生成
    return {
        user_id: user.user_id,
        user_name: user.user_name,
        company_name: user.company_name,
        role: user.user_role,
        print_status: user.print_status || "not_printed"
    };
}

// 例: 名札HTML生成
function createBadgeHtml(badgeData) {
    return `
    <div class="badge">
      <div class="badge-company">${badgeData.company_name}</div>
      <div class="badge-name">${badgeData.user_name}</div>
      <div class="badge-role">${badgeData.role}</div>
      <div class="badge-id">ID: ${badgeData.user_id}</div>
    </div>
  `;
}

// 例: 名札プレビュー表示
function showBadgePreview(badgeData) {
    const preview = document.getElementById("badgePreview");
    if (preview) {
        preview.innerHTML = createBadgeHtml(badgeData);
        preview.style.display = "block";
    }
}

// 例: 名札印刷
function printBadge(badgeData) {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(createBadgeHtml(badgeData));
    printWindow.document.close();
    printWindow.print();
}

// 必要に応じてwindowに公開
window.generateBadgeData = generateBadgeData;
window.createBadgeHtml = createBadgeHtml;
window.showBadgePreview = showBadgePreview;
window.printBadge = printBadge;


// QRコード生成テスト
function generateTestQRCodes() {
    const baseUrl = window.location.origin;
    const adminId = window.currentAdmin?.admin_id || "ADMIN001";
    const testData = { user_id: "TEST001", admin_id: adminId };

    function simpleEncrypt(text) {
        const rot13 = text.replace(/[a-zA-Z]/g, function (c) {
            return String.fromCharCode(
                (c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26
            );
        });
        return btoa(rot13).replace(/[+/=]/g, function (c) {
            return { "+": `-`, "/": "_", "=": "" }[c];
        });
    }

    const normalUrl = `${baseUrl}/?user_id=${testData.user_id}&admin_id=${testData.admin_id}`;
    const encryptedUrl = `${baseUrl}/?d=${simpleEncrypt(
        JSON.stringify(testData)
    )}`;

    // モーダルで表示
    const modalHtml = `...`; // 省略: admin.jsから全文コピー
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    setTimeout(() => {
        try {
            if (typeof QRious !== "undefined") {
                const normalCanvas = document.getElementById("normalQR");
                const encryptedCanvas = document.getElementById("encryptedQR");
                if (normalCanvas && encryptedCanvas) {
                    new QRious({ element: normalCanvas, value: normalUrl, size: 200, background: "white", foreground: "black" });
                    new QRious({ element: encryptedCanvas, value: encryptedUrl, size: 200, background: "white", foreground: "black" });
                }
            }
        } catch (error) {
            alert("QRコード生成中にエラーが発生しました: " + error.message);
        }
    }, 100);
}

// URLプレビュー更新
function updateUrlPreview() {
    const urlPreviewElement = document.getElementById("urlPreview");
    if (!urlPreviewElement) return;
    const baseUrl = window.location.origin;
    const adminId = window.currentAdmin?.admin_id || "ADMIN001";
    const sampleData = [{ user_id: "USER123", admin_id: adminId }, { user_id: "USER456", admin_id: adminId }];
    function simpleEncrypt(text) {
        const rot13 = text.replace(/[a-zA-Z]/g, function (c) {
            return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });
        return btoa(rot13).replace(/[+/=]/g, function (c) { return { "+": `-`, "/": "_", "=": "" }[c]; });
    }
    const normalUrls = sampleData.map((data) => `${baseUrl}/?user_id=${data.user_id}&admin_id=${data.admin_id}`);
    const encryptedUrls = sampleData.map((data) => `${baseUrl}/?d=${simpleEncrypt(JSON.stringify(data))}`);
    urlPreviewElement.innerHTML = `...`; // 省略: admin.jsから全文コピー
}

// 名札プレビュー
function generateNameCardPreview() {
    const baseUrl = window.location.origin;
    const adminId = window.currentAdmin?.admin_id || "ADMIN001";
    const sampleVisitors = [
        { user_id: "V001", user_name: "田中太郎", company_name: "株式会社サンプル", admin_id: adminId },
        { user_id: "V002", user_name: "佐藤花子", company_name: "テスト商事", admin_id: adminId },
        { user_id: "V003", user_name: "鈴木次郎", company_name: "デモ株式会社", admin_id: adminId }
    ];
    function simpleEncrypt(text) {
        const rot13 = text.replace(/[a-zA-Z]/g, function (c) {
            return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });
        return btoa(rot13).replace(/[+/=]/g, function (c) { return { "+": `-`, "/": "_", "=": "" }[c]; });
    }
    const modalHtml = `...`; // 省略: admin.jsから全文コピー
    document.body.insertAdjacentHTML("beforeend", modalHtml);
    setTimeout(() => {
        try {
            if (typeof QRious !== "undefined") {
                sampleVisitors.forEach((visitor, index) => {
                    const canvas = document.getElementById(`nameCardQR${index}`);
                    if (canvas) {
                        const qrData = { user_id: visitor.user_id, admin_id: visitor.admin_id };
                        const encryptedUrl = `${baseUrl}/?d=${simpleEncrypt(JSON.stringify(qrData))}`;
                        new QRious({ element: canvas, value: encryptedUrl, size: 120, background: "white", foreground: "black" });
                    }
                });
            }
        } catch (error) {
            console.error("名札QRコード生成エラー:", error);
        }
    }, 100);
}

window.generateTestQRCodes = generateTestQRCodes;
window.updateUrlPreview = updateUrlPreview;
window.generateNameCardPreview = generateNameCardPreview;

// ここに名札関連の追加ロジックを拡張可能
