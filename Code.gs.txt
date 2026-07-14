/**
 * TECH UNIVERSE — App Backend (Google Apps Script)
 * ---------------------------------------------------
 * Ei script ta apnar Google Sheet ke ekta simple API banie dey,
 * jate mobile app theke direct data read/write kora jay.
 *
 * SETUP STEPS (README.md e bistarito ache):
 * 1. sheets.google.com e notun ekta Sheet khulun, naam din: "Tech Universe Data"
 * 2. Extensions > Apps Script e click korun
 * 3. Ei pura file-er content ta copy kore Code.gs e paste kore dile hobe
 * 4. Save korun, tarpor Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Deploy korle ekta URL pabe (.../exec) — seta index.html e SCRIPT_URL e boshan
 */

const SHEET_NAMES = {
  PRODUCTS: 'Products',
  SALES: 'Sales'
};

function doGet(e) {
  const action = e.parameter.action;
  let result;

  if (action === 'getProducts') {
    result = getProducts();
  } else if (action === 'getSales') {
    result = getSales(e.parameter.date);
  } else if (action === 'getSummary') {
    result = getSummary(e.parameter.date);
  } else {
    result = { error: 'Unknown action' };
  }

  return jsonOutput(result);
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const action = body.action;
  let result;

  if (action === 'addSale') {
    result = addSale(body.data);
  } else if (action === 'addProduct') {
    result = addProduct(body.data);
  } else if (action === 'updateProduct') {
    result = updateProduct(body.data);
  } else if (action === 'deleteProduct') {
    result = deleteProduct(body.data);
  } else {
    result = { error: 'Unknown action' };
  }

  return jsonOutput(result);
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === SHEET_NAMES.PRODUCTS) {
      sheet.appendRow(['ID', 'Name', 'Category', 'Price', 'Stock']);
    } else if (name === SHEET_NAMES.SALES) {
      sheet.appendRow(['Serial', 'Date', 'CustomerName', 'Phone', 'Type', 'Item', 'Amount', 'PaymentMode']);
    }
  }
  return sheet;
}

// ---------- PRODUCTS ----------

function getProducts() {
  const sheet = getSheet(SHEET_NAMES.PRODUCTS);
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1);
  return rows.map(r => ({
    id: r[0], name: r[1], category: r[2], price: r[3], stock: r[4]
  })).filter(p => p.name);
}

function addProduct(p) {
  const sheet = getSheet(SHEET_NAMES.PRODUCTS);
  const id = 'P' + new Date().getTime();
  sheet.appendRow([id, p.name, p.category || '', p.price, p.stock]);
  return { success: true, id: id };
}

function updateProduct(p) {
  const sheet = getSheet(SHEET_NAMES.PRODUCTS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === p.id) {
      sheet.getRange(i + 1, 2, 1, 4).setValues([[p.name, p.category || '', p.price, p.stock]]);
      return { success: true };
    }
  }
  return { success: false, error: 'Product not found' };
}

function deleteProduct(p) {
  const sheet = getSheet(SHEET_NAMES.PRODUCTS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === p.id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'Product not found' };
}

// ---------- SALES ----------

function addSale(s) {
  const sheet = getSheet(SHEET_NAMES.SALES);
  const lastRow = sheet.getLastRow();
  const serial = lastRow; // header is row 1, so row 2 = serial 1
  const date = s.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

  sheet.appendRow([serial, date, s.customerName, s.phone, s.type, s.item, s.amount, s.paymentMode || '']);

  // Reduce stock if this sale matches a product name and type is Purchase
  if (s.type === 'Purchase' && s.productId) {
    const pSheet = getSheet(SHEET_NAMES.PRODUCTS);
    const data = pSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === s.productId) {
        const newStock = Math.max(0, Number(data[i][4]) - 1);
        pSheet.getRange(i + 1, 5).setValue(newStock);
        break;
      }
    }
  }

  return { success: true, serial: serial };
}

function getSales(dateFilter) {
  const sheet = getSheet(SHEET_NAMES.SALES);
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1).map(r => ({
    serial: r[0], date: r[1], customerName: r[2], phone: r[3],
    type: r[4], item: r[5], amount: r[6], paymentMode: r[7]
  })).filter(s => s.customerName);

  if (dateFilter) {
    return rows.filter(s => String(s.date).indexOf(dateFilter) === 0);
  }
  return rows.reverse(); // most recent first
}

function getSummary(dateFilter) {
  const targetDate = dateFilter || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const sales = getSales(targetDate);
  const total = sales.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const count = sales.length;
  const byType = {};
  sales.forEach(s => {
    byType[s.type] = (byType[s.type] || 0) + Number(s.amount || 0);
  });
  return { date: targetDate, total: total, count: count, byType: byType, sales: sales };
}
