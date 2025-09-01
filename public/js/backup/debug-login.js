// Firebase Auth (onAuth) デバッグ用ログイン関数
// localStorageは従来通り保存
export async function debugLoginWithAuth(adminId, password) {
    // localStorageにセット（従来通り）
    localStorage.setItem(
        "currentAdmin",
        JSON.stringify({
            admin_id: adminId,
            admin_name: adminId,
            email: `${adminId}@debug.local`,
            role: "admin",
            permissions: ["user_manage", "data_export", "system_config"],
            account_status: "test",
            plan_type: "free",
            is_active: true,
            timestamp: Date.now(),
        })
    );

    // Firebase Auth: onAuth (signInWithCustomToken)
    try {
        // カスタムトークン取得API（本番と同じAPIを利用）
        const tokenRes = await fetch(
            "https://createcustomtoken-ijui6cxhzq-an.a.run.app",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: adminId }),
            }
        );
        const tokenJson = await tokenRes.json();
        if (!tokenJson.success || !tokenJson.customToken) {
            throw new Error(tokenJson.error || "カスタムトークン取得失敗");
        }

        // Firebase Auth認証
        const { getAuth, signInWithCustomToken } = await import(
            "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
        );
        const auth = getAuth();
        await signInWithCustomToken(auth, tokenJson.customToken);
        console.log("✅ Firebase Auth (onAuth) デバッグログイン成功");
    } catch (error) {
        console.error("❌ Firebase Auth (onAuth) デバッグログイン失敗:", error);
        alert("Firebase Authデバッグログイン失敗: " + error.message);
    }
    // admin.htmlへ遷移
    window.location.href = "./admin.html";
}
