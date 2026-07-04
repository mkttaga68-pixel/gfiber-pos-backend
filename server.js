require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());

const {
  PANCAKE_SHOP_ID,
  PANCAKE_API_KEY,
  MB_BANK_ACCOUNT,
  MB_BANK_ACCOUNT_NAME,
  VARIATION_ID_1,
  VARIATION_ID_2,
  VARIATION_ID_3,
  GOOGLE_SHEETS_WEBHOOK_URL,
  PORT
} = process.env;

const MB_BANK_BIN = '970422'; // BIN NAPAS VietQR cua MB Bank

// Danh muc san pham cua landing page, anh xa sang variation_id that trong Pancake POS.
// Gia lay tu chinh POS de tranh khach sua gia tren trinh duyet.
const PACKAGES = {
  '1': { variationId: VARIATION_ID_1, price: 390000, label: '1 Hộp Fiber Detox' },
  '2': { variationId: VARIATION_ID_2, price: 700000, label: '2 Hộp Fiber Detox' },
  '3': { variationId: VARIATION_ID_3, price: 900000, label: '3 Hộp Fiber Detox' }
};

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/api/order', async (req, res) => {
  try {
    const { name, phone, address, package: pkgId } = req.body || {};

    if (!name || !phone || !address || !pkgId || !PACKAGES[pkgId]) {
      return res.status(400).json({ success: false, error: 'Thiếu hoặc sai thông tin đơn hàng.' });
    }

    const pkg = PACKAGES[pkgId];
    if (!pkg.variationId) {
      return res.status(500).json({
        success: false,
        error: `Chưa cấu hình variation_id cho gói "${pkg.label}" (điền VARIATION_ID_${pkgId} trong .env).`
      });
    }
    if (!PANCAKE_SHOP_ID || !PANCAKE_API_KEY) {
      return res.status(500).json({ success: false, error: 'Chưa cấu hình PANCAKE_SHOP_ID / PANCAKE_API_KEY trong .env.' });
    }

    const orderCode = 'GF' + Date.now().toString().slice(-8);

    const pancakeUrl = `https://pos.pages.fm/api/v1/shops/${PANCAKE_SHOP_ID}/orders?api_key=${encodeURIComponent(PANCAKE_API_KEY)}`;
    const pancakeRes = await fetch(pancakeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bill_full_name: name,
        bill_phone_number: phone,
        shipping_address: address,
        note: `Đơn từ landing page — Mã: ${orderCode}`,
        items: [{ variation_id: pkg.variationId, quantity: 1 }]
      })
    });

    const pancakeData = await pancakeRes.json().catch(() => null);
    console.log('[Pancake create order] status=', pancakeRes.status, 'body=', JSON.stringify(pancakeData));

    if (!pancakeRes.ok || (pancakeData && pancakeData.success === false)) {
      return res.status(502).json({
        success: false,
        error: 'Không tạo được đơn hàng trên POS. Vui lòng kiểm tra log server.',
        detail: pancakeData
      });
    }

    // Cau truc response cua Pancake co the khac nhau tuy phien ban API - log o tren de kiem tra
    // va chinh lai duong dan lay id/code neu can.
    const createdOrder = Array.isArray(pancakeData?.data) ? pancakeData.data[0] : pancakeData?.data;
    const pancakeOrderId = createdOrder?.id ?? null;

    const addInfo = orderCode;
    const qrUrl = `https://img.vietqr.io/image/${MB_BANK_BIN}-${MB_BANK_ACCOUNT}-compact2.png` +
      `?amount=${pkg.price}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(MB_BANK_ACCOUNT_NAME || '')}`;

    // Ghi song song vao Google Sheet - khong lam cham/chan phan hoi cho khach neu Sheet loi
    if (GOOGLE_SHEETS_WEBHOOK_URL) {
      fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCode,
          name,
          phone,
          address,
          package: pkg.label,
          amount: pkg.price,
          pancakeOrderId
        })
      }).catch((err) => console.error('[Google Sheets] ghi that bai:', err.message));
    }

    res.json({
      success: true,
      orderCode,
      pancakeOrderId,
      amount: pkg.price,
      qrUrl,
      bankName: 'MB Bank',
      bankAccount: MB_BANK_ACCOUNT,
      accountName: MB_BANK_ACCOUNT_NAME
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống, vui lòng thử lại sau.' });
  }
});

const port = PORT || 3000;
app.listen(port, () => console.log(`GFiber POS backend running on port ${port}`));
