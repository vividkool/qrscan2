// チE��トユーザー作�Eスクリプト
// こ�Eスクリプトを一度実行してチE��トユーザーを作�E

const testUsers = [
  {
    user_id: "ADMIN001",
    user_name: "管琁E��E��スチE,
    email: "admin@test.com",
    phone: "090-1111-1111",
    department: "シスチE��管琁E��",
    status: "-",
    role: "admin",
    print_status: "not_printed",
  },
  {
    user_id: "SCAN001",
    user_name: "スキャナ�EチE��チE,
    email: "scanner@test.com",
    phone: "090-2222-2222",
    department: "展示会運営",
    status: "-",
    role: "scanner",
    print_status: "not_printed",
  },
  {
    user_id: "GUEST001",
    user_name: "ゲストテスチE,
    email: "guest@test.com",
    phone: "090-3333-3333",
    department: "来場老E,
    status: "-",
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
console.log("チE��トユーザー作�Eの準備ができました、E);
console.log("ブラウザのコンソールで createTestUsers() を実行してください、E);

window.createTestUsers = createTestUsers;
window.testUsers = testUsers;
