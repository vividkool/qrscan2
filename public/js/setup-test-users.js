// テストユーザー作成スクリプト
// このスクリプトを一度実行してテストユーザーを作成

const testUsers = [
  {
    user_id: "ADMIN001",
    user_name: "管理者テスト",
    email: "admin@test.com",
    phone: "090-1111-1111",
    department: "システム管理部",
    status: "active",
    role: "admin",
    print_status: "not_printed",
  },
  {
    user_id: "SCAN001",
    user_name: "スキャナーテスト",
    email: "scanner@test.com",
    phone: "090-2222-2222",
    department: "展示会運営",
    status: "active",
    role: "scanner",
    print_status: "not_printed",
  },
  {
    user_id: "GUEST001",
    user_name: "ゲストテスト",
    email: "guest@test.com",
    phone: "090-3333-3333",
    department: "来場者",
    status: "active",
    role: "guest",
    print_status: "not_printed",
  },
];

// コンソールで実行用
async function createTestUsers() {
  try {
    for (const user of testUsers) {
      const docId = generateUUID();
      await setDoc(doc(db, "users", docId), user);
      console.log(`Created user: ${user.user_id} (${user.user_name})`);
    }
    console.log("All test users created successfully!");
  } catch (error) {
    console.error("Error creating test users:", error);
  }
}

// ブラウザのコンソールで createTestUsers() を実行してください
console.log("テストユーザー作成の準備ができました。");
console.log("ブラウザのコンソールで createTestUsers() を実行してください。");

window.createTestUsers = createTestUsers;
window.testUsers = testUsers;
