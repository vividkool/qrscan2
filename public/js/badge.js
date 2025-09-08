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
    print_status: user.print_status || "not_printed",
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

  // QRコード生成テスト（固定トークン対応）
  async function generateTestQRCodes() {
    const baseUrl = window.location.origin;
    const adminId = window.currentAdmin?.admin_id || "ADMIN001";
    const eventId = window.currentEvent?.event_id || "EVENT001";
    const testData = { user_id: "TEST001", admin_id: adminId };

    // 従来のURL（比較用）
    const normalUrl = `${baseUrl}/?user_id=${testData.user_id}&admin_id=${testData.admin_id}`;

    // 新しい固定暗号化トークンURL
    let encryptedUrl = normalUrl; // フォールバック
    try {
      if (typeof window.getOrCreateFixedQRToken === 'function') {
        const token = await window.getOrCreateFixedQRToken(eventId);
        encryptedUrl = `${baseUrl}/users.html?token=${token}&id=${testData.user_id}`;
        console.log('固定QRトークンテスト用URL生成:', { eventId, tokenPreview: token.substring(0, 10) + '...' });
      } else if (typeof window.generateQRCodeToken === 'function') {
        const token = await window.generateQRCodeToken(eventId);
        encryptedUrl = `${baseUrl}/users.html?token=${token}&id=${testData.user_id}`;
        console.log('通常QRトークンテスト用URL生成');
      }
    } catch (error) {
      console.warn('暗号化トークン生成に失敗:', error);
    }    // モーダルで表示
    const modalHtml = `
    <div id="qrTestModal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; justify-content: center; align-items: center;">
      <div style="background: white; padding: 30px; border-radius: 12px; max-width: 700px; max-height: 90vh; overflow-y: auto;">
        <h3 style="margin: 0 0 20px 0; text-align: center;">📱 QRコード読み取りテスト</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div style="text-align: center;">
            <h4 style="color: #6c757d; margin-bottom: 15px;">🔓 通常URL</h4>
            <div style="border: 2px solid #ddd; border-radius: 8px; padding: 15px; background: white;">
              <canvas id="normalQR" width="200" height="200" style="border-radius: 4px;"></canvas>
            </div>
            <div style="font-size: 10px; margin-top: 10px; word-break: break-all; font-family: monospace; background: #f8f9fa; padding: 8px; border-radius: 4px; max-height: 60px; overflow-y: auto;">
              ${normalUrl}
            </div>
          </div>
          
          <div style="text-align: center;">
            <h4 style="color: #28a745; margin-bottom: 15px;">🔒 暗号化トークンURL</h4>
            <div style="border: 2px solid #28a745; border-radius: 8px; padding: 15px; background: #f8fff8;">
              <canvas id="encryptedQR" width="200" height="200" style="border-radius: 4px;"></canvas>
            </div>
            <div style="font-size: 10px; margin-top: 10px; word-break: break-all; font-family: monospace; background: #f8f9fa; padding: 8px; border-radius: 4px; max-height: 60px; overflow-y: auto;">
              ${encryptedUrl}
            </div>
          </div>
        </div>
        
        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>📋 テスト手順:</strong></p>
          <ol style="margin: 0 0 0 20px; font-size: 13px;">
            <li>スマートフォンのカメラでQRコードを読み取り</li>
            <li>ブラウザでURLが開くことを確認</li>
            <li>自動ログイン処理が正常に動作することを確認</li>
            <li>両方のQRコードで同じ結果になることを確認</li>
          </ol>
        </div>
        
        <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>🏷️ 新しいセキュリティ機能:</strong></p>
          <ul style="margin: 0 0 0 20px; font-size: 13px;">
            <li>XOR暗号化による admin_id/event_id の保護</li>
            <li>Base64 URL-safe エンコーディング</li>
            <li>タイムスタンプ付きトークンで有効期限管理</li>
            <li>短縮URLによるQRコードの複雑さ軽減</li>
            <li>暗号化キーは admin_settings に自動保存</li>
          </ul>
        </div>
        
        <div style="text-align: center;">
          <button onclick="generateNameCardPreview()" 
            style="background: #ff9800; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin: 0 10px;">
            🏷️ 名札プレビュー
          </button>
          <button onclick="document.getElementById('qrTestModal').remove()" 
            style="background: #666; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin: 0 10px;">
            閉じる
          </button>
        </div>
      </div>
    </div>
  `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    setTimeout(() => {
      try {
        if (typeof QRious !== "undefined") {
          const normalCanvas = document.getElementById("normalQR");
          const encryptedCanvas = document.getElementById("encryptedQR");
          if (normalCanvas && encryptedCanvas) {
            new QRious({
              element: normalCanvas,
              value: normalUrl,
              size: 200,
              background: "white",
              foreground: "black",
            });
            new QRious({
              element: encryptedCanvas,
              value: encryptedUrl,
              size: 200,
              background: "white",
              foreground: "black",
            });
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
    const sampleData = [
      { user_id: "USER123", admin_id: adminId },
      { user_id: "USER456", admin_id: adminId },
    ];
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
    const normalUrls = sampleData.map(
      (data) => `${baseUrl}/?user_id=${data.user_id}&admin_id=${data.admin_id}`
    );
    const encryptedUrls = sampleData.map(
      (data) => `${baseUrl}/?d=${simpleEncrypt(JSON.stringify(data))}`
    );
    urlPreviewElement.innerHTML = `
        <div style="color: #495057; margin-bottom: 8px;">
          <strong>� QRコードで生成されるURL例:</strong>
        </div>
        
        <div style="margin-bottom: 15px;">
          <h4 style="color: #28a745; margin: 0 0 8px 0; font-size: 14px;">🔒 暗号化URL（推奨）</h4>
          <div style="font-family: monospace; font-size: 11px; line-height: 1.6; color: #6c757d; background: #f8f9fa; padding: 10px; border-radius: 4px; border-left: 4px solid #28a745;">
            ${encryptedUrls
        .map(
          (url) =>
            `<div style="margin-bottom: 5px; word-break: break-all;">${url}</div>`
        )
        .join("")}
          </div>
          <div style="margin-top: 5px; font-size: 11px; color: #28a745;">
            ✅ パラメータが暗号化され、URLが短くなります
          </div>
        </div>
    
        <div style="margin-bottom: 15px;">
          <h4 style="color: #6c757d; margin: 0 0 8px 0; font-size: 14px;">� 通常URL（互換性）</h4>
          <div style="font-family: monospace; font-size: 11px; line-height: 1.6; color: #6c757d; background: white; padding: 10px; border-radius: 4px; border: 1px solid #e0e0e0;">
            ${normalUrls
        .map(
          (url) =>
            `<div style="margin-bottom: 5px; word-break: break-all;">${url}</div>`
        )
        .join("")}
          </div>
        </div>
    
        <div style="margin-top: 8px; font-size: 11px; color: #6c757d;">
          <strong>パラメータ説明:</strong><br>
          • <code>d</code>: 暗号化されたデータ（user_id + admin_id）<br>
          • <code>user_id</code>: 来場者のユーザーID（通常URL用）<br>
          • <code>admin_id</code>: 管理者ID (${adminId}) - Admin別データ管理用
        </div>
    
        <div style="margin-top: 15px; text-align: center;">
          <button onclick="generateTestQRCodes()" 
            style="background: #4285f4; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin: 0 5px;">
            🔍 テスト用QRコード生成
          </button>
          <button onclick="testUrlDecryption()" 
            style="background: #34a853; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin: 0 5px;">
            🧪 暗号化テスト
          </button>
        </div>
      `;
  }
}

// 名札プレビュー
function generateNameCardPreview() {
  const baseUrl = window.location.origin;
  const adminId = window.currentAdmin?.admin_id || "ADMIN001";
  const sampleVisitors = [
    {
      user_id: "V001",
      user_name: "田中太郎",
      company_name: "株式会社サンプル",
      admin_id: adminId,
    },
    {
      user_id: "V002",
      user_name: "佐藤花子",
      company_name: "テスト商事",
      admin_id: adminId,
    },
    {
      user_id: "V003",
      user_name: "鈴木次郎",
      company_name: "デモ株式会社",
      admin_id: adminId,
    },
  ];
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

  // ここにmodalHtmlの内容を展開（admin.jsからコピーした内容を貼り付け）
  const modalHtml = `...`; // 省略: admin.jsから全文コピー
  document.body.insertAdjacentHTML("beforeend", modalHtml);
  setTimeout(() => {
    try {
      if (typeof QRious !== "undefined") {
        sampleVisitors.forEach((visitor, index) => {
          const canvas = document.getElementById(`nameCardQR${index}`);
          if (canvas) {
            const qrData = {
              user_id: visitor.user_id,
              admin_id: visitor.admin_id,
            };
            const encryptedUrl = `${baseUrl}/?d=${simpleEncrypt(
              JSON.stringify(qrData)
            )}`;
            new QRious({
              element: canvas,
              value: encryptedUrl,
              size: 120,
              background: "white",
              foreground: "black",
            });
          }
        });
      }
    } catch (error) {
      console.error("名札QRコード生成エラー:", error);
    }
  }, 100);
}

// 暗号化テスト機能
function testUrlDecryption() {
  const testData = { user_id: "TEST999", admin_id: "ADMIN001" };
  const jsonString = JSON.stringify(testData);

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

  function simpleDecrypt(encoded) {
    try {
      const base64 =
        encoded.replace(/[-_]/g, function (c) {
          return { "-": "+", _: "/" }[c];
        }) + "===".slice(0, (4 - (encoded.length % 4)) % 4);

      const rot13 = atob(base64);
      return rot13.replace(/[a-zA-Z]/g, function (c) {
        return String.fromCharCode(
          (c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26
        );
      });
    } catch (error) {
      return null;
    }
  }

  const encrypted = simpleEncrypt(jsonString);
  const decrypted = simpleDecrypt(encrypted);

  const result = `
🧪 暗号化テスト結果:

📝 元データ:
${jsonString}

🔒 暗号化後:
${encrypted}

🔓 復号化後:
${decrypted}

✅ 復号化${decrypted === jsonString ? "成功" : "失敗"}
${decrypted === jsonString
      ? "✅ データが正常に復元されました"
      : "❌ データ復元に失敗しました"
    }
  `;

  alert(result);
}

window.generateTestQRCodes = generateTestQRCodes;
window.updateUrlPreview = updateUrlPreview;
window.generateNameCardPreview = generateNameCardPreview;

// ここに名札関連の追加ロジックを拡張可能
