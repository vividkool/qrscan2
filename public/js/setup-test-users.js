// 繝・せ繝医Θ繝ｼ繧ｶ繝ｼ菴懈・繧ｹ繧ｯ繝ｪ繝励ヨ
// 縺薙・繧ｹ繧ｯ繝ｪ繝励ヨ繧剃ｸ蠎ｦ螳溯｡後＠縺ｦ繝・せ繝医Θ繝ｼ繧ｶ繝ｼ繧剃ｽ懈・

const testUsers = [
  {
    user_id: "ADMIN001",
    user_name: "邂｡逅・・ユ繧ｹ繝・,
    email: "admin@test.com",
    phone: "090-1111-1111",
    department: "繧ｷ繧ｹ繝・Β邂｡逅・Κ",
    status: "-",
    role: "admin",
    print_status: "not_printed",
  },
  {
    user_id: "SCAN001",
    user_name: "繧ｹ繧ｭ繝｣繝翫・繝・せ繝・,
    email: "scanner@test.com",
    phone: "090-2222-2222",
    department: "螻慕､ｺ莨夐°蝟ｶ",
    status: "-",
    role: "scanner",
    print_status: "not_printed",
  },
  {
    user_id: "GUEST001",
    user_name: "繧ｲ繧ｹ繝医ユ繧ｹ繝・,
    email: "guest@test.com",
    phone: "090-3333-3333",
    department: "譚･蝣ｴ閠・,
    status: "-",
    role: "guest",
    print_status: "not_printed",
  },
];

// 繧ｳ繝ｳ繧ｽ繝ｼ繝ｫ縺ｧ螳溯｡檎畑
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

// 繝悶Λ繧ｦ繧ｶ縺ｮ繧ｳ繝ｳ繧ｽ繝ｼ繝ｫ縺ｧ createTestUsers() 繧貞ｮ溯｡後＠縺ｦ縺上□縺輔＞
console.log("繝・せ繝医Θ繝ｼ繧ｶ繝ｼ菴懈・縺ｮ貅門ｙ縺後〒縺阪∪縺励◆縲・);
console.log("繝悶Λ繧ｦ繧ｶ縺ｮ繧ｳ繝ｳ繧ｽ繝ｼ繝ｫ縺ｧ createTestUsers() 繧貞ｮ溯｡後＠縺ｦ縺上□縺輔＞縲・);

window.createTestUsers = createTestUsers;
window.testUsers = testUsers;
