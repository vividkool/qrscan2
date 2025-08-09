const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// templatesフォルダの確認・作成
const templatesDir = path.join(__dirname, "public", "templates");
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

// Items template data
const itemsData = [
  {
    item_no: "商品番号を入力してください",
    item_name: "商品名を入力してください",
    category: "カテゴリを入力してください",
    maker_code: "メーカーコードを入力してください",
    price: "価格を数値で入力してください",
    standard: "規格を入力してください",
    shape: "形状を入力してください",
  },
  {
    item_no: "ITM001",
    item_name: "iPhone 15",
    category: "Electronics",
    maker_code: "APPLE",
    price: "128000",
    standard: "128GB",
    shape: "Rectangle",
  },
];

// Users template data
const usersData = [
  {
    user_id: "ユーザーIDを入力してください",
    user_name: "ユーザー名を入力してください",
    email: "メールアドレスを入力してください",
    phone: "電話番号を入力してください",
    department: "部署名を入力してください",
    status: "active/inactive",
    role: "admin/user/guest",
    print_status: "printed/not_printed",
  },
  {
    user_id: "USR001",
    user_name: "田中太郎",
    email: "tanaka@example.com",
    phone: "090-1234-5678",
    department: "営業部",
    status: "active",
    role: "user",
    print_status: "not_printed",
  },
];

// Items templateファイル作成
const itemsWs = XLSX.utils.json_to_sheet(itemsData);
itemsWs["!cols"] = [
  { width: 15 }, // item_no
  { width: 25 }, // item_name
  { width: 15 }, // category
  { width: 15 }, // maker_code
  { width: 12 }, // price
  { width: 15 }, // standard
  { width: 15 }, // shape
];

const itemsWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(itemsWb, itemsWs, "Items Template");
XLSX.writeFile(itemsWb, path.join(templatesDir, "items_template.xlsx"));

// Users templateファイル作成
const usersWs = XLSX.utils.json_to_sheet(usersData);
usersWs["!cols"] = [
  { width: 15 }, // user_id
  { width: 20 }, // user_name
  { width: 25 }, // email
  { width: 15 }, // phone
  { width: 15 }, // department
  { width: 12 }, // status
  { width: 12 }, // role
  { width: 15 }, // print_status
];

const usersWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(usersWb, usersWs, "Users Template");
XLSX.writeFile(usersWb, path.join(templatesDir, "users_template.xlsx"));

console.log("✅ テンプレートファイルが作成されました:");
console.log("- public/templates/items_template.xlsx");
console.log("- public/templates/users_template.xlsx");
