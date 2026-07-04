// HUONG DAN SU DUNG:
// 1. Tao 1 Google Sheet moi (hoac dung sheet co san).
// 2. Vao menu: Tien ich mo rong (Extensions) > Apps Script.
// 3. Xoa het code mac dinh, dan toan bo noi dung file nay vao.
// 4. Bam "Trien khai" (Deploy) > "Trien khai moi" (New deployment).
//    - Chon loai: "Ung dung web" (Web app).
//    - "Thuc thi voi tu cach" (Execute as): Toi (Me).
//    - "Ai co quyen truy cap" (Who has access): Bat ky ai (Anyone).
// 5. Bam Deploy, cap quyen truy cap khi duoc hoi (chon tai khoan Google cua ban, bam "Advanced" > "Go to ... (unsafe)" neu Google canh bao - day la binh thuong vi day la script cua chinh ban).
// 6. Copy URL "Web app" duoc tao ra (dang https://script.google.com/macros/s/.../exec).
// 7. Dan URL do vao file .env, dong GOOGLE_SHEETS_WEBHOOK_URL=<URL vua copy>.

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // Neu sheet dang trong, tu dong them dong tieu de
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Thời gian', 'Mã đơn', 'Họ tên', 'SĐT', 'Địa chỉ', 'Gói sản phẩm', 'Số tiền', 'Mã đơn Pancake']);
  }

  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    new Date(),
    data.orderCode || '',
    data.name || '',
    data.phone || '',
    data.address || '',
    data.package || '',
    data.amount || '',
    data.pancakeOrderId || ''
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
