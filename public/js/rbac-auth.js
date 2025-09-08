// ロールベースアクセス制御 (RBAC) ライブラリ
// 各HTMLページで読み込んで認証チェックを行う

class RoleBasedAuth {
    constructor() {
        this.currentUser = null;
        this.currentRole = null;
        this.allowedRoles = [];
        this.isAdmin = false;
    }

    // 初期化（各ページで呼び出し）
    async initialize(requiredRoles = []) {
        this.allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

        try {
            // 認証状態を確認
            await this.checkAuthState();

            // ロールベース認証を実行
            if (!this.isAccessAllowed()) {
                this.redirectToUnauthorized();
                return false;
            }

            // 成功時のUI更新
            this.updateUI();
            return true;

        } catch (error) {
            console.error('認証エラー:', error);
            this.redirectToLogin();
            return false;
        }
    }

    // 認証状態確認
    async checkAuthState() {
        // Firebase Authの状態確認（実装に応じて調整）
        return new Promise((resolve, reject) => {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                firebase.auth().onAuthStateChanged(async (user) => {
                    if (user) {
                        this.currentUser = user;
                        await this.getUserRole(user.uid);
                        resolve();
                    } else {
                        reject(new Error('未認証'));
                    }
                });
            } else {
                // Firebase未初期化の場合はローカルストレージから確認
                const storedAuth = this.getStoredAuth();
                if (storedAuth) {
                    this.currentUser = storedAuth.user;
                    this.currentRole = storedAuth.role;
                    this.isAdmin = storedAuth.role === 'admin';
                    resolve();
                } else {
                    reject(new Error('認証情報なし'));
                }
            }
        });
    }

    // ユーザーロール取得
    async getUserRole(uid) {
        try {
            // Firestoreからロールを取得
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                const db = firebase.firestore();
                const doc = await db.collection('admin_settings').doc(uid).get();

                if (doc.exists) {
                    const data = doc.data();
                    this.currentRole = data.role;
                    this.isAdmin = data.role === 'admin';
                } else {
                    throw new Error('ユーザー設定が見つかりません');
                }
            } else {
                // フォールバック：ローカルストレージから取得
                const storedRole = localStorage.getItem(`user_role_${uid}`);
                if (storedRole) {
                    this.currentRole = storedRole;
                    this.isAdmin = storedRole === 'admin';
                } else {
                    throw new Error('ロール情報が見つかりません');
                }
            }
        } catch (error) {
            console.error('ロール取得エラー:', error);
            throw error;
        }
    }

    // アクセス許可判定
    isAccessAllowed() {
        // 管理者は全てアクセス可能
        if (this.isAdmin) {
            return true;
        }

        // 必要なロールが指定されていない場合は認証のみで可
        if (this.allowedRoles.length === 0) {
            return this.currentUser !== null;
        }

        // 現在のロールが許可されたロールに含まれているか
        return this.allowedRoles.includes(this.currentRole);
    }

    // 認証情報をローカルストレージに保存
    storeAuth(user, role) {
        const authData = {
            user: {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName
            },
            role: role,
            timestamp: Date.now()
        };
        localStorage.setItem('rbac_auth', JSON.stringify(authData));
    }

    // ローカルストレージから認証情報を取得
    getStoredAuth() {
        try {
            const stored = localStorage.getItem('rbac_auth');
            if (stored) {
                const authData = JSON.parse(stored);
                // 24時間以内のデータのみ有効
                if (Date.now() - authData.timestamp < 24 * 60 * 60 * 1000) {
                    return authData;
                }
            }
        } catch (error) {
            console.error('認証情報取得エラー:', error);
        }
        return null;
    }

    // UI更新
    updateUI() {
        // ロール情報を表示
        const roleElements = document.querySelectorAll('.user-role');
        roleElements.forEach(el => {
            el.textContent = this.currentRole || 'Unknown';
        });

        // 管理者のみ表示要素
        const adminOnlyElements = document.querySelectorAll('.admin-only');
        adminOnlyElements.forEach(el => {
            el.style.display = this.isAdmin ? 'block' : 'none';
        });

        // ロール別表示要素
        const roleElements2 = document.querySelectorAll('[data-role]');
        roleElements2.forEach(el => {
            const requiredRole = el.getAttribute('data-role');
            if (this.isAdmin || this.currentRole === requiredRole) {
                el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        });

        // ユーザー名表示
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(el => {
            el.textContent = this.currentUser?.displayName || this.currentUser?.email || 'Unknown User';
        });
    }

    // 未認証時のリダイレクト
    redirectToLogin() {
        const currentPage = window.location.pathname;
        window.location.href = `/login.html?redirect=${encodeURIComponent(currentPage)}`;
    }

    // 権限なし時のリダイレクト
    redirectToUnauthorized() {
        window.location.href = `/unauthorized.html?role=${this.currentRole}&required=${this.allowedRoles.join(',')}`;
    }

    // ログアウト
    logout() {
        localStorage.removeItem('rbac_auth');
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut();
        }
        this.redirectToLogin();
    }

    // ロール確認（他のスクリプトから使用）
    hasRole(role) {
        return this.isAdmin || this.currentRole === role;
    }

    // 複数ロール確認
    hasAnyRole(roles) {
        return this.isAdmin || roles.includes(this.currentRole);
    }
}

// グローバルインスタンス
window.rbacAuth = new RoleBasedAuth();

// ページ固有の認証設定
const PAGE_ROLES = {
    'users.html': ['users'],
    'staff.html': ['staff'],
    'maker.html': ['maker'],
    'uketuke.html': ['uketuke'],
    'admin.html': ['admin'],
    'admin-settings.html': ['admin'],
    'test-crypto.html': ['admin']
};

// 自動初期化（ページ読み込み時）
document.addEventListener('DOMContentLoaded', async () => {
    const currentPage = window.location.pathname.split('/').pop();
    const requiredRoles = PAGE_ROLES[currentPage] || [];

    // ロールベース認証を実行
    const isAuthorized = await window.rbacAuth.initialize(requiredRoles);

    if (isAuthorized) {
        console.log(`✅ ${currentPage} へのアクセスが承認されました (Role: ${window.rbacAuth.currentRole})`);

        // 認証成功時のイベントを発火
        window.dispatchEvent(new CustomEvent('rbacAuthSuccess', {
            detail: {
                role: window.rbacAuth.currentRole,
                isAdmin: window.rbacAuth.isAdmin,
                user: window.rbacAuth.currentUser
            }
        }));
    } else {
        console.log(`❌ ${currentPage} へのアクセスが拒否されました`);
    }
});

// 便利な関数をグローバルに公開
window.checkRole = (role) => window.rbacAuth.hasRole(role);
window.checkAnyRole = (roles) => window.rbacAuth.hasAnyRole(roles);
window.isAdmin = () => window.rbacAuth.isAdmin;
window.logout = () => window.rbacAuth.logout();
