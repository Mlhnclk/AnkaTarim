export const defaultItem = (oliveType = "Ayvalık") => ({
  olive_type: oliveType,
  size_11: "0",
  size_12: "0",
  size_13: "0",
  size_14: "0",
  size_15: "0",
  size_16: "0",
  size_17: "0",
  oil_release: "11-12",
});

export const defaultPrices = [
  {
    olive_type: "Ayvalık",
    size_11: 5,
    size_12: 6,
    size_13: 15,
    size_14: 20,
    size_15: 25,
    size_16: 30,
    size_17: 35,
  },
  {
    olive_type: "Gemlik",
    size_11: 5,
    size_12: 6,
    size_13: 14,
    size_14: 19,
    size_15: 24,
    size_16: 29,
    size_17: 34,
  },
];

export const sizeKeys = [11, 12, 13, 14, 15, 16, 17];
export const oilProcessSteps = ["Beklemede", "Sıkımda", "İşlem Tamam"];

export const calculatePurchaseAmount = (items, priceMap) =>
  items.reduce((sum, item) => {
    const oilSizes =
      item.oil_release === "11-12"
        ? [11, 12]
        : item.oil_release === "13-17"
          ? [13, 14, 15, 16, 17]
          : item.oil_release === "all"
            ? sizeKeys
            : item.oil_release.startsWith("custom:")
              ? item.oil_release.slice(7).split(",").map(Number)
              : [];
    return (
      sum +
      sizeKeys.reduce(
        (rowSum, size) =>
          oilSizes.includes(size)
            ? rowSum
            : rowSum +
              Number(item[`size_${size}`] || 0) *
                Number((priceMap[item.olive_type] || {})[size] || 0),
        0,
      )
    );
  }, 0);

export const getComputerDateTime = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
};

export const getTodayDate = () => getComputerDateTime().date;

export const getSalesPaymentRemaining = (sale, payment) => {
  const payments = [...(sale.payments || [])].sort(
    (first, second) =>
      new Date(first.payment_date) - new Date(second.payment_date) ||
      Number(first.id || 0) - Number(second.id || 0),
  );
  const paymentIndex = payments.findIndex((item) => item.id === payment.id);
  const paidThroughPayment =
    Number(sale.paid_amount || 0) +
    payments
      .slice(0, paymentIndex + 1)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return Math.max(Number(sale.total_amount || 0) - paidThroughPayment, 0);
};

export const formatDateInput = (dateValue) => {
  const [year, month, day] = String(dateValue || "").split("-");
  return year && month && day ? `${day}.${month}.${year}` : "";
};

export const parseDateInput = (dateValue) => {
  const match = String(dateValue || "").match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return "";

  const [, day, month, year] = match;
  const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    parsedDate.getFullYear() !== Number(year) ||
    parsedDate.getMonth() !== Number(month) - 1 ||
    parsedDate.getDate() !== Number(day)
  )
    return "";

  return `${year}-${month}-${day}`;
};

export const parseTimeInput = (timeValue) => {
  const match = String(timeValue || "").match(/^(\d{2}):(\d{2})$/);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return "";
  return timeValue;
};

export const normalizeNumericInput = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatMessageNumber = (value) =>
  new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export const formatPrice = (value) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export const formatTurkishDate = (dateValue) => {
  const [year, month, day] = String(dateValue || "")
    .split("-")
    .map(Number);
  if (!year || !month || !day) return dateValue;
  const monthNames = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ];
  return `${day} ${monthNames[month - 1]} ${year}`;
};

export const normalizeWhatsAppPhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("90")) return digits;
  if (digits.startsWith("0")) return `90${digits.slice(1)}`;
  return digits;
};

export const openWhatsAppPopupWindow = () =>
  window.open(
    "about:blank",
    "_blank",
    "popup=yes,width=560,height=760,resizable=yes,scrollbars=yes",
  );

export const openWhatsAppMessage = (phone, message, popupWindow = null) => {
  const whatsappWindow = popupWindow || openWhatsAppPopupWindow();
  if (!whatsappWindow) {
    window.alert(
      "WhatsApp penceresi açılamadı. Tarayıcıda açılır pencerelere izin verin.",
    );
    return false;
  }
  whatsappWindow.opener = null;
  whatsappWindow.location.href = `https://wa.me/${normalizeWhatsAppPhone(phone)}?text=${encodeURIComponent(message)}`;
  whatsappWindow.focus();
  return true;
};

export const formatTurkishPhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  const nationalNumber = digits.startsWith("90")
    ? digits.slice(2)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits;
  return `+90${nationalNumber}`;
};

export const downloadCsv = (rows, filename) => {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(";"),
    )
    .join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
