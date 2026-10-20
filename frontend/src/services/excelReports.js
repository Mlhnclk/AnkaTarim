import ExcelJS from "exceljs";

const sizes = [11, 12, 13, 14, 15, 16, 17];
const currencyFormat = '#,##0.00 "₺"';
const quantityFormat = "#,##0.00";

const numberValue = (value) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

const normalizedName = (value) => String(value || "").trim().toLocaleLowerCase("tr-TR");

const recordPayable = (record) =>
  numberValue(
    record.effective_payable_amount ??
      record.effective_purchase_amount ??
      record.payable_amount ??
      record.purchase_amount ??
      record.total_amount,
  );

const recordPaid = (record) =>
  numberValue(record.total_paid ?? record.paid_amount);

const producerPaid = (record) =>
  numberValue(
    record.total_paid ??
      (record.payments?.length
        ? record.payments.reduce((total, payment) => total + numberValue(payment.amount), 0)
        : record.paid_amount),
  );

const sumRecordWeight = (record) =>
  (record.items || []).reduce(
    (recordTotal, item) =>
      recordTotal + sizes.reduce((itemTotal, size) => itemTotal + numberValue(item[`size_${size}`]), 0),
    0,
  );

const getPurchaseProductSummary = (record) => {
  const quantitiesByType = new Map();
  for (const item of record.items || []) {
    const type = String(item.olive_type || "Ürün belirtilmemiş");
    const quantity = sizes.reduce(
      (total, size) => total + numberValue(item[`size_${size}`]),
      0,
    );
    quantitiesByType.set(type, (quantitiesByType.get(type) || 0) + quantity);
  }
  return [...quantitiesByType]
    .map(([type, quantity]) => `${type}: ${quantity.toLocaleString("tr-TR")} KG`)
    .join("; ");
};

const getSaleProductSummary = (sale) => {
  const quantitiesByType = new Map();
  for (const item of sale.items || []) {
    const key = `${item.olive_type || "Zeytin"} / ${item.size || "-"}`;
    quantitiesByType.set(key, (quantitiesByType.get(key) || 0) + numberValue(item.quantity_kg));
  }
  const products = [...quantitiesByType].map(
    ([type, quantity]) => `${type}: ${quantity.toLocaleString("tr-TR")} KG`,
  );
  for (const item of sale.oil_items || []) {
    products.push(`Zeytinyağı: ${numberValue(item.liters).toLocaleString("tr-TR")} L`);
  }
  return products.join("; ");
};

const addSheet = (workbook, name, headers, rows, options = {}) => {
  const worksheet = workbook.addWorksheet(name);
  worksheet.addRow(headers);
  worksheet.addRows(rows);
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(rows.length + 1, 1), column: headers.length },
  };
  worksheet.columns = headers.map((header, index) => ({
    header,
    width: options.widths?.[index] || Math.min(Math.max(header.length + 3, 14), 28),
  }));

  const header = worksheet.getRow(1);
  header.height = 26;
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF173B35" },
  };
  header.alignment = { vertical: "middle", wrapText: true };

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = { vertical: "middle" };
      for (const column of options.currencyColumns || []) {
        row.getCell(column).numFmt = currencyFormat;
      }
      for (const column of options.quantityColumns || []) {
        row.getCell(column).numFmt = quantityFormat;
      }
    }
  });
  return worksheet;
};

const getProducerPayments = (record) => {
  if (record.payments?.length) {
    return record.payments.map((payment) => ({
      date: payment.payment_date || record.date,
      amount: numberValue(payment.amount),
      note: payment.note || "",
    }));
  }
  const legacyAmount = numberValue(record.paid_amount);
  return legacyAmount > 0
    ? [{ date: record.date, amount: legacyAmount, note: "Kayda girilen ödeme" }]
    : [];
};

const getMerchantPayments = (sale) => {
  const legacyAmount = numberValue(sale.paid_amount);
  const payments = (sale.payments || []).map((payment) => ({
    date: payment.payment_date || sale.sale_date,
    amount: numberValue(payment.amount),
    note: payment.note || "",
  }));
  if (legacyAmount > 0) {
    payments.unshift({
      date: sale.sale_date,
      amount: legacyAmount,
      note: "Satış kaydındaki başlangıç ödemesi",
    });
  }
  return payments;
};

export const downloadBusinessExcelReport = async ({
  customers = [],
  records = [],
  salesRecords = [],
  reportDate = "",
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Anka Tarımsal Takip";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.subject = "Alış ve satış raporu";
  workbook.title = "Anka Tarımsal Rapor";

  const purchaseRows = records
    .filter((record) => !reportDate || record.date === reportDate)
    .sort((first, second) =>
      String(first.date || "").localeCompare(String(second.date || "")) ||
      numberValue(first.sequence_no) - numberValue(second.sequence_no),
    )
    .map((record) => {
      const payable = recordPayable(record);
      const paid = producerPaid(record);
      const remaining = Math.max(payable - paid, 0);
      const productSummary = getPurchaseProductSummary(record);
      return [
        record.customer || "Adsız üretici",
        productSummary,
        payable,
        paid,
        remaining,
      ];
    });

  const salesRows = salesRecords
    .filter((sale) => !reportDate || sale.sale_date === reportDate)
    .sort((first, second) =>
      String(first.sale_date || "").localeCompare(String(second.sale_date || "")) ||
      numberValue(first.sale_no) - numberValue(second.sale_no),
    )
    .map((sale) => {
      const partyType = sale.party?.party_type === "corporate" ? "Kurumsal" : "Bireysel";
      const partyName = sale.party?.name || "Adsız müşteri";
      const productSummary = getSaleProductSummary(sale);
      const total = numberValue(sale.total_amount);
      const paid = recordPaid(sale);
      const remaining = Math.max(total - paid, 0);
      return [
        partyType,
        partyType === "Bireysel" ? "Ad Soyad" : "Firma Adı",
        partyName,
        productSummary,
        total,
        paid,
        remaining,
      ];
    });

  addSheet(
    workbook,
    "Alış Raporu",
    ["Üretici / Köylü Adı", "Alınan zeytin KG (Gemlik / Ayvalık)", "Ödenecek Tutar", "Ödenen Tutar", "Kalan Tutar"],
    purchaseRows,
    { widths: [28, 38, 18, 18, 18], currencyColumns: [3, 4, 5] },
  );

  addSheet(
    workbook,
    "Satış Raporu",
    ["Bireysel / Kurumsal", "Bireysel ise ad soyad / Kurumsal ise firma adı", "Hangi ürün kaç KG satış", "Satış Toplamı", "Tahsil Edilen", "Kalan"],
    salesRows.map(([type, _, partyName, productSummary, total, paid, remaining]) => [
      type,
      partyName,
      productSummary,
      total,
      paid,
      remaining,
    ]),
    { widths: [20, 30, 42, 18, 18, 18], currencyColumns: [4, 5, 6] },
  );

  const bytes = await workbook.xlsx.writeBuffer();
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `anka-rapor-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
