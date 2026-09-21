import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Factory,
  LogOut,
  MessageSquareText,
  Plus,
  Printer,
  ShieldCheck,
  Truck,
  UserCircle2,
  Wallet,
} from "lucide-react";
import {
  createCustomer,
  createCustomerPayment,
  createOlivePrice,
  createResponsiblePerson,
  createResponsiblePersonPayment,
  deleteCustomer,
  deleteOlivePrice,
  deleteResponsiblePerson,
  deleteSieveStation,
  createSieveStation,
  createSortingRecord,
  getCustomers,
  getOlivePrices,
  getResponsiblePersons,
  getSieveStations,
  getSortingRecords,
  getMerchantParties,
  createMerchantParty,
  getDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getSalesRecords,
  createSalesPayment,
  getShipments,
  createShipment,
  updateShipment,
  patchShipment,
  createSalesRecord,
  updateSalesRecord,
  getSalesPrices,
  createSalesPrice,
  updateSalesPrice,
  deleteSalesPrice,
  getSalesOilPrices,
  createSalesOilPrice,
  updateSalesOilPrice,
  getInventoryEntries,
  createInventoryEntry,
  deleteInventoryEntry,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  login as loginUser,
  updateCustomer,
  updateOlivePrice,
  updateResponsiblePerson,
  updateSortingRecord,
  updateSieveStation,
} from "./services/api";

/* Eleme formu ve varsayılan işletme ayarları */
const defaultItem = (oliveType = "Ayvalık") => ({
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

const defaultStation = {
  name: "Yapıntı Elek 1",
  responsible: "Muhammet Erikçi",
  phone: "+905325323232",
  commission_per_kg: 2,
  status: "Aktif",
  commission_basis: "kg",
  commission_scope: "total_weight",
  work_dates: ["2026-10-24", "2026-10-25"],
};

const defaultPrices = [
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

const sizeKeys = [11, 12, 13, 14, 15, 16, 17];
const oilProcessSteps = ["Beklemede", "Sıkımda", "İşlem Tamam"];
const logoSrc = new URL("./assets/AnkaOlive.jpeg", import.meta.url).href;

const calculatePurchaseAmount = (items, priceMap) =>
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

const getComputerDateTime = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
};

const getTodayDate = () => getComputerDateTime().date;

const getSalesPaymentRemaining = (sale, payment) => {
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

const formatDateInput = (dateValue) => {
  const [year, month, day] = String(dateValue || "").split("-");
  return year && month && day ? `${day}.${month}.${year}` : "";
};

const parseDateInput = (dateValue) => {
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

const parseTimeInput = (timeValue) => {
  const match = String(timeValue || "").match(/^(\d{2}):(\d{2})$/);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return "";
  return timeValue;
};

const normalizeNumericInput = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMessageNumber = (value) =>
  new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatPrice = (value) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatTurkishDate = (dateValue) => {
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

const normalizeWhatsAppPhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("90")) return digits;
  if (digits.startsWith("0")) return `90${digits.slice(1)}`;
  return digits;
};

const formatTurkishPhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  const nationalNumber = digits.startsWith("90")
    ? digits.slice(2)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits;
  return `+90${nationalNumber}`;
};

const downloadCsv = (rows, filename) => {
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

const BrandLogo = () => {
  return (
    <img
      src={logoSrc}
      alt="Anka logo"
      className="h-14 w-14 shrink-0 rounded-2xl object-cover shadow-lg shadow-blue-900/20"
      role="img"
    />
  );
};

function App() {
  /* Uygulamanın API'den gelen ana veri ve ekran state'leri */
  const [stations, setStations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [responsiblePersons, setResponsiblePersons] = useState([]);
  const [prices, setPrices] = useState([]);
  const [records, setRecords] = useState([]);
  const [merchantParties, setMerchantParties] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [salesRecords, setSalesRecords] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [salesPrices, setSalesPrices] = useState([]);
  const [salesOilPrices, setSalesOilPrices] = useState([]);
  const [inventoryEntries, setInventoryEntries] = useState([]);
  const [salesPriceEditing, setSalesPriceEditing] = useState(false);
  const [newSalesTypeName, setNewSalesTypeName] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryForm, setInventoryForm] = useState({
    product_type: "olive",
    olive_type: "",
    size: 13,
    quantity: "",
    note: "",
  });
  const [selectedStationId, setSelectedStationId] = useState("");
  const [selectedResponsiblePersonId, setSelectedResponsiblePersonId] =
    useState("");
  const [producerDraft, setProducerDraft] = useState({
    full_name: "",
    phone: "",
  });
  const [producerQueue, setProducerQueue] = useState([]);
  const [showProducerForm, setShowProducerForm] = useState(false);
  const [activeProducerKey, setActiveProducerKey] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [businessMode, setBusinessMode] = useState("producer");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [reportDate, setReportDate] = useState(getTodayDate);
  const [reportDateInput, setReportDateInput] = useState(() =>
    formatDateInput(getTodayDate()),
  );
  const [dateInput, setDateInput] = useState(() =>
    formatDateInput(getTodayDate()),
  );
  const [timeInput, setTimeInput] = useState(() => getComputerDateTime().time);
  const [customerSearch, setCustomerSearch] = useState("");
  const [historyDateInput, setHistoryDateInput] = useState("");
  const [historyFilters, setHistoryFilters] = useState({
    date: "",
    customer: "",
    station: "",
    responsible: "",
    oliveType: "",
    sequence: "",
  });
  const [salesHistoryDateInput, setSalesHistoryDateInput] = useState("");
  const [salesHistoryFilters, setSalesHistoryFilters] = useState({
    date: "",
    party: "",
    partyType: "",
    paymentStatus: "",
    saleNo: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = window.localStorage.getItem("anka_auth_token");
    const user = window.localStorage.getItem("anka_auth_user");
    return Boolean(token && user);
  });
  const [loginError, setLoginError] = useState("");
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const user = window.localStorage.getItem("anka_auth_user");
      return user ? JSON.parse(user) : null;
    } catch (error) {
      return null;
    }
  });
  const [editStationId, setEditStationId] = useState(null);
  const [editPersonId, setEditPersonId] = useState(null);
  const [editCustomerId, setEditCustomerId] = useState(null);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [selectedProcessStatus, setSelectedProcessStatus] = useState(null);
  const [showPendingProducers, setShowPendingProducers] = useState(false);
  const [editPriceId, setEditPriceId] = useState(null);
  const [newOliveTypeName, setNewOliveTypeName] = useState("");
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });
  const [personForm, setPersonForm] = useState({
    full_name: "",
    phone: "",
    status: "Aktif",
  });
  const [personPaymentForms, setPersonPaymentForms] = useState({});
  const [customerForm, setCustomerForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    notes: "",
    oil_process_status: "Beklemede",
    oil_output_liters: "",
    payment_amount: "",
  });
  const [userForm, setUserForm] = useState({
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    can_manage_purchases: false,
    can_manage_sales: false,
    can_manage_users: false,
  });
  const [editUserId, setEditUserId] = useState(null);
  const [stationForm, setStationForm] = useState({
    name: "",
    responsible: "",
    phone: "",
    commission_per_kg: "2",
    status: "Aktif",
    commission_basis: "kg",
    commission_scope: "total_weight",
    work_dates: "",
    responsible_person_ids: [],
  });
  const [saleForm, setSaleForm] = useState({
    partyType: "individual",
    name: "",
    phone: "",
    address: "",
    saleDate: getTodayDate(),
    paidAmount: "",
    vehicleId: "",
    driverId: "",
  });
  const [vehicleForm, setVehicleForm] = useState({ plate: "", driver: "" });
  const [driverForm, setDriverForm] = useState({ full_name: "", phone: "", status: "Aktif" });
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [editingDriverId, setEditingDriverId] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [saleOilLiters, setSaleOilLiters] = useState("");
  const [sellOliveOil, setSellOliveOil] = useState(false);
  const [selectedSaleTypes, setSelectedSaleTypes] = useState([]);
  const [saleTypeToAdd, setSaleTypeToAdd] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [merchantSearch, setMerchantSearch] = useState("");
  const [selectedMerchantPartyId, setSelectedMerchantPartyId] = useState(null);
  const [merchantPaymentForm, setMerchantPaymentForm] = useState({
    saleId: "",
    paymentDate: getTodayDate(),
    amount: "",
    note: "",
  });
  const [shipmentForm, setShipmentForm] = useState(null);
  const [form, setForm] = useState({
    ...getComputerDateTime(),
    customer: "",
    customer_phone: "",
    purchase_amount: "",
    payable_amount: "",
    sequence_no: 1,
    items: [defaultItem("Ayvalık"), defaultItem("Gemlik")],
  });

  const getNextSequenceForStation = (stationId, dateValue) => {
    if (!stationId || !dateValue) return 1;
    const stationRecords = records.filter(
      (record) =>
        String(record.sieve_station) === String(stationId) &&
        record.date === dateValue,
    );
    const maxSequence = stationRecords.reduce(
      (max, record) => Math.max(max, Number(record.sequence_no || 0)),
      0,
    );
    return maxSequence + 1;
  };

  const handleDateInputChange = (event) => {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
    const nextInput =
      digits.length > 4
        ? `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`
        : digits.length > 2
          ? `${digits.slice(0, 2)}.${digits.slice(2)}`
          : digits;
    setDateInput(nextInput);
    const parsedDate = parseDateInput(nextInput);
    if (parsedDate) setForm((prev) => ({ ...prev, date: parsedDate }));
  };

  const handleReportDateInputChange = (event) => {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
    const nextInput =
      digits.length > 4
        ? `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`
        : digits.length > 2
          ? `${digits.slice(0, 2)}.${digits.slice(2)}`
          : digits;
    setReportDateInput(nextInput);
    const parsedDate = parseDateInput(nextInput);
    if (parsedDate) setReportDate(parsedDate);
  };

  const handleHistoryDateInputChange = (event) => {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
    const nextInput =
      digits.length > 4
        ? `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`
        : digits.length > 2
          ? `${digits.slice(0, 2)}.${digits.slice(2)}`
          : digits;
    setHistoryDateInput(nextInput);
    const parsedDate = parseDateInput(nextInput);
    setHistoryFilters((prev) => ({ ...prev, date: parsedDate }));
  };

  const handleSalesHistoryDateInputChange = (event) => {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
    const nextInput =
      digits.length > 4
        ? `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`
        : digits.length > 2
          ? `${digits.slice(0, 2)}.${digits.slice(2)}`
          : digits;
    setSalesHistoryDateInput(nextInput);
    const parsedDate = parseDateInput(nextInput);
    setSalesHistoryFilters((prev) => ({ ...prev, date: parsedDate }));
  };

  const handleTimeInputChange = (event) => {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
    const nextInput =
      digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
    setTimeInput(nextInput);
    const parsedTime = parseTimeInput(nextInput);
    if (parsedTime) setForm((prev) => ({ ...prev, time: parsedTime }));
  };

  /* Veri yenileme */
  const refreshData = async (
    userOverride = null,
    { seedDefaults = true } = {},
  ) => {
    const token = window.localStorage.getItem("anka_auth_token");
    if (!token) {
      setIsAuthenticated(false);
      setCurrentUser(null);
      return;
    }

    try {
      const activeUser = userOverride || currentUser;
      const canAccessPurchases =
        activeUser?.is_superuser === true ||
        activeUser?.can_manage_purchases === true ||
        activeUser?.can_manage_users === true;
      const canAccessSales =
        activeUser?.is_superuser === true ||
        activeUser?.can_manage_sales === true ||
        activeUser?.can_manage_users === true;
      const [
        stationsRes,
        customersRes,
        personsRes,
        pricesRes,
        recordsRes,
        usersRes,
        partiesRes,
        salesRes,
        shipmentsRes,
        salesPricesRes,
        salesOilPricesRes,
        inventoryRes,
        driversRes,
        vehiclesRes,
      ] = await Promise.all([
        canAccessPurchases ? getSieveStations() : Promise.resolve({ data: [] }),
        canAccessPurchases ? getCustomers() : Promise.resolve({ data: [] }),
        canAccessPurchases ? getResponsiblePersons() : Promise.resolve({ data: [] }),
        canAccessPurchases ? getOlivePrices() : Promise.resolve({ data: [] }),
        canAccessPurchases ? getSortingRecords() : Promise.resolve({ data: [] }),
        activeUser?.can_manage_users === true || activeUser?.is_superuser === true
          ? getUsers()
          : Promise.resolve({ data: [] }),
        canAccessSales ? getMerchantParties() : Promise.resolve({ data: [] }),
        canAccessSales ? getSalesRecords() : Promise.resolve({ data: [] }),
        canAccessSales ? getShipments() : Promise.resolve({ data: [] }),
        canAccessSales ? getSalesPrices() : Promise.resolve({ data: [] }),
        canAccessSales ? getSalesOilPrices() : Promise.resolve({ data: [] }),
        canAccessSales ? getInventoryEntries() : Promise.resolve({ data: [] }),
        canAccessSales ? getDrivers() : Promise.resolve({ data: [] }),
        canAccessSales ? getVehicles() : Promise.resolve({ data: [] }),
      ]);

      let stationData = stationsRes.data || [];
      let customerData = customersRes.data || [];
      let personData = personsRes.data || [];
      let priceData = pricesRes.data || [];
      let salesPriceData = salesPricesRes.data || [];

      if (seedDefaults && canAccessPurchases && !stationData.length) {
        const createdStation = await createSieveStation(defaultStation);
        stationData = [createdStation.data];
      }

      if (seedDefaults && canAccessPurchases && !priceData.length) {
        const createdPrices = await Promise.all(
          defaultPrices.map((item) => createOlivePrice(item)),
        );
        priceData = createdPrices.map((item) => item.data);
      }

      if (seedDefaults && canAccessSales && !salesPriceData.length && priceData.length) {
        const createdSalesPrices = await Promise.all(
          priceData.map((item) =>
            createSalesPrice({
              olive_type: item.olive_type,
              ...Object.fromEntries(
                sizeKeys.map((size) => [
                  `size_${size}`,
                  item[`size_${size}`] || 0,
                ]),
              ),
            }),
          ),
        );
        salesPriceData = createdSalesPrices.map((item) => item.data);
      }

      setStations(stationData);
      setCustomers(customerData);
      setResponsiblePersons(personData);
      setPrices(priceData);
      setRecords(recordsRes.data || []);
      setUsers(usersRes.data || []);
      setMerchantParties(partiesRes.data || []);
      setDrivers(driversRes.data || []);
      setVehicles(vehiclesRes.data || []);
      setSalesRecords(salesRes.data || []);
      setShipments(shipmentsRes.data || []);
      setSalesPrices(salesPriceData);
      setSalesOilPrices(salesOilPricesRes.data || []);
      setInventoryEntries(inventoryRes.data || []);

      if (stationData[0]) {
        setSelectedStationId(String(stationData[0].id));
        setForm((prev) => ({
          ...prev,
          sequence_no: getNextSequenceForStation(
            String(stationData[0].id),
            prev.date,
          ),
        }));
      }
    } catch (error) {
      console.error("Veri yuklenemedi", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      await refreshData();
      setIsLoading(false);
    };

    loadData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!selectedStationId || !form.date) return;
    setForm((prev) => ({
      ...prev,
      sequence_no: getNextSequenceForStation(selectedStationId, prev.date),
    }));
  }, [selectedStationId, form.date]);

  useEffect(() => {
    const assignedPeople =
      stations.find(
        (station) => String(station.id) === String(selectedStationId),
      )?.responsible_persons || [];
    setSelectedResponsiblePersonId(
      assignedPeople[0] ? String(assignedPeople[0].id) : "",
    );
  }, [selectedStationId, stations]);

  useEffect(() => {
    if (
      currentUser?.can_manage_users !== true &&
      currentUser?.is_superuser !== true &&
      activeTab === "users"
    ) {
      setActiveTab("overview");
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    const canAccessPurchases =
      currentUser?.is_superuser === true ||
      currentUser?.can_manage_purchases === true ||
      currentUser?.can_manage_users === true;
    const canAccessSales =
      currentUser?.is_superuser === true ||
      currentUser?.can_manage_sales === true ||
      currentUser?.can_manage_users === true;

    if (businessMode === "producer" && !canAccessPurchases && canAccessSales) {
      setBusinessMode("merchant");
      setActiveTab("merchant-overview");
    }
    if (businessMode === "merchant" && !canAccessSales && canAccessPurchases) {
      setBusinessMode("producer");
      setActiveTab("overview");
    }
  }, [businessMode, currentUser]);

  /* Fiyatları zeytin cinsi ve numara üzerinden hızlı erişilecek hale getirir */
  const priceMap = useMemo(() => {
    return prices.reduce((acc, item) => {
      acc[item.olive_type] = {
        11: Number(item.size_11 || 0),
        12: Number(item.size_12 || 0),
        13: Number(item.size_13 || 0),
        14: Number(item.size_14 || 0),
        15: Number(item.size_15 || 0),
        16: Number(item.size_16 || 0),
        17: Number(item.size_17 || 0),
      };
      return acc;
    }, {});
  }, [prices]);

  const oliveTypeOptions = useMemo(
    () => prices.map((price) => price.olive_type).filter(Boolean),
    [prices],
  );

  useEffect(() => {
    if (!oliveTypeOptions.length) return;
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        oliveTypeOptions.includes(item.olive_type)
          ? item
          : { ...item, olive_type: oliveTypeOptions[0] },
      ),
    }));
  }, [oliveTypeOptions]);

  /* Genel durum kartlarında kullanılan özet hesaplamaları */
  const totals = useMemo(() => {
    const processCounts = customers.reduce(
      (counts, customer) => {
        const status = customer.oil_process_status || "Beklemede";
        counts[status] = (counts[status] || 0) + 1;
        return counts;
      },
      { Beklemede: 0, Sıkımda: 0, "İşlem Tamam": 0 },
    );
    return {
      recordsCount: records.length,
      oilRecordsCount: records.filter(
        (record) => Number(record.total_oil_amount || 0) > 0,
      ).length,
      processCounts,
    };
  }, [customers, records]);

  /* Eleme kayıtlarını tarih bazında raporlar */
  const dailyReport = useMemo(() => {
    const grouped = records.reduce((acc, record) => {
      const key = record.date;
      if (!acc[key]) {
        acc[key] = {
          date: key,
          totalAmount: 0,
          customerCount: 0,
          records: [],
        };
      }
      acc[key].totalAmount += Number(record.total_amount || 0);
      acc[key].customerCount += 1;
      acc[key].records.push(record);
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
  }, [records]);

  const customerQueue = useMemo(() => {
    return [...records].sort(
      (a, b) => Number(a.sequence_no || 0) - Number(b.sequence_no || 0),
    );
  }, [records]);

  const stationSummary = useMemo(() => {
    return stations.map((station) => {
      const stationRecords = records.filter(
        (record) => Number(record.sieve_station) === Number(station.id),
      );
      return {
        ...station,
        recordCount: stationRecords.length,
        totalWeight: stationRecords.reduce(
          (sum, record) => sum + Number(record.total_weight || 0),
          0,
        ),
        totalAmount: stationRecords.reduce(
          (sum, record) => sum + Number(record.total_amount || 0),
          0,
        ),
        pendingAmount: stationRecords.reduce(
          (sum, record) => sum + Number(record.remaining_amount || 0),
          0,
        ),
        commissionAmount: stationRecords.reduce(
          (sum, record) => sum + Number(record.commission_amount || 0),
          0,
        ),
      };
    });
  }, [stations, records]);

  const selectedCustomerRecord = useMemo(() => {
    if (selectedCustomerId) {
      return (
        records.find(
          (record) => String(record.id) === String(selectedCustomerId),
        ) || null
      );
    }

    const customerName = customerQueue[0]?.customer || form.customer;
    return (
      records.find((record) => record.customer === customerName) ||
      records[0] ||
      null
    );
  }, [selectedCustomerId, customerQueue, records, form.customer]);

  const filteredDailyReport = useMemo(() => {
    if (!reportDate) return dailyReport;
    return dailyReport.filter((day) => day.date === reportDate);
  }, [dailyReport, reportDate]);

  const filteredHistoryRecords = useMemo(
    () =>
      records.filter((record) => {
        const recordOliveTypes = (record.items || []).map(
          (item) => item.olive_type,
        );

        return (
          (!historyFilters.date || record.date === historyFilters.date) &&
          (!historyFilters.customer ||
            record.customer === historyFilters.customer) &&
          (!historyFilters.station ||
            String(record.sieve_station) === String(historyFilters.station)) &&
          (!historyFilters.responsible ||
            String(record.responsible_person) ===
              String(historyFilters.responsible)) &&
          (!historyFilters.oliveType ||
            recordOliveTypes.includes(historyFilters.oliveType)) &&
          (!historyFilters.sequence ||
            String(record.sequence_no) === String(historyFilters.sequence))
        );
      }),
    [historyFilters, records],
  );

  const filteredSalesHistory = useMemo(
    () =>
      [...salesRecords]
        .filter((sale) => {
          const paymentStatus =
            Number(sale.remaining_amount || 0) <= 0 ? "paid" : "pending";
          return (
            (!salesHistoryFilters.date ||
              sale.sale_date === salesHistoryFilters.date) &&
            (!salesHistoryFilters.party ||
              String(sale.party?.id) === String(salesHistoryFilters.party)) &&
            (!salesHistoryFilters.partyType ||
              sale.party?.party_type === salesHistoryFilters.partyType) &&
            (!salesHistoryFilters.paymentStatus ||
              paymentStatus === salesHistoryFilters.paymentStatus) &&
            (!salesHistoryFilters.saleNo ||
              String(sale.sale_no) === String(salesHistoryFilters.saleNo))
          );
        })
        .sort(
          (first, second) =>
            new Date(second.sale_date) - new Date(first.sale_date) ||
            Number(second.sale_no || 0) - Number(first.sale_no || 0),
        ),
    [salesHistoryFilters, salesRecords],
  );

  const exportReport = () => {
    const exportRecords = reportDate
      ? records.filter((record) => record.date === reportDate)
      : records;
    const rows = [
      [
        "Tarih",
        "Üretici",
        "Telefon",
        "Elek",
        "Sıra",
        "Ürün",
        "Numara",
        "Miktar (KG)",
        "Yağlık (KG)",
        "Alış Tutarı",
        "Verilen Ödeme",
        "Kalan Ödeme",
        "Sıkılmış Zeytinyağı (Litre)",
      ],
      ...exportRecords.map((record) => {
        const customer = customers.find(
          (item) =>
            String(item.full_name || "")
              .trim()
              .toLocaleLowerCase("tr-TR") ===
            String(record.customer || "")
              .trim()
              .toLocaleLowerCase("tr-TR"),
        );
        const liters = Number(customer?.oil_output_liters || 0);
        const items = (record.items || []).flatMap((item) =>
          sizeKeys
            .map((size) => ({
              item,
              size,
              quantity: Number(item[`size_${size}`] || 0),
            }))
            .filter((line) => line.quantity > 0),
        );
        const detailRows = items.length ? items : [{ item: null, size: "", quantity: 0 }];
        return detailRows.map(({ item, size, quantity }) => [
          record.date,
          record.customer,
          customer?.phone || "",
          stations.find(
            (station) => Number(station.id) === Number(record.sieve_station),
          )?.name || "Elek",
          record.sequence_no,
          item?.olive_type || "",
          size,
          quantity ? quantity.toFixed(2) : "",
          item
            ? sizeKeys
                .filter((oilSize) =>
                  item.oil_release === "all" ||
                  (item.oil_release === "11-12" && oilSize <= 12) ||
                  (item.oil_release === "13-17" && oilSize >= 13),
                )
                .reduce((sum, oilSize) => sum + Number(item[`size_${oilSize}`] || 0), 0)
                .toFixed(2)
            : "",
          Number(record.effective_purchase_amount ?? record.total_amount ?? 0).toFixed(2),
          Number(record.total_paid || 0).toFixed(2),
          Number(record.remaining_amount || 0).toFixed(2),
          liters > 0 ? liters.toFixed(2) : "",
        ]);
      }),
    ];

    downloadCsv(rows.flat(), `alis-raporu-${reportDate || "tum"}.csv`);
  };

  const exportSalesReport = () => {
    const rows = [
      [
        "Satış Tarihi",
        "Satış No",
        "Tüccar",
        "Tüccar Türü",
        "Tüccar Telefonu",
        "Ürün",
        "Numara",
        "Miktar",
        "Birim",
        "Toplam Tutar",
        "Tahsil Edilen",
        "Kalan Bakiye",
        "Gönderim Durumu",
        "Gönderim Adresi",
        "Araç Plakası",
        "Şoför",
        "Şoför Telefonu",
      ],
      ...salesRecords.flatMap((sale) => {
        const shipment = shipments.find((item) => item.sale?.id === sale.id);
        const productRows = [
          ...(sale.items || []).map((item) => ({
            product: item.olive_type,
            size: item.size,
            quantity: item.quantity_kg,
            unit: "KG",
          })),
          ...(sale.oil_items || []).map((item) => ({
            product: "Zeytinyağı",
            size: "",
            quantity: item.liters,
            unit: "L",
          })),
        ];
        const details = productRows.length ? productRows : [{ product: "", size: "", quantity: "", unit: "" }];
        return details.map((detail) => [
          sale.sale_date,
          sale.sale_no,
          sale.party?.name || "",
          sale.party?.party_type === "corporate" ? "Kurumsal" : "Bireysel",
          sale.party?.phone || "",
          detail.product,
          detail.size,
          detail.quantity === "" ? "" : Number(detail.quantity || 0).toFixed(2),
          detail.unit,
          Number(sale.total_amount || 0).toFixed(2),
          Number(sale.total_paid || sale.paid_amount || 0).toFixed(2),
          Number(sale.remaining_amount || 0).toFixed(2),
          shipment?.status === "Vardi" ? "Teslimat adresine ulaştı" : shipment?.status === "Yuklemede" ? "Yüklemede" : shipment?.status === "Yolda" ? "Yolda" : "Gönderim yok",
          shipment?.delivery_address || "",
          shipment?.vehicle?.plate || sale.vehicle?.plate || "",
          shipment?.driver?.full_name || sale.driver?.full_name || "",
          shipment?.driver?.phone || sale.driver?.phone || "",
        ]);
      }),
    ];
    downloadCsv(rows, "satis-raporu.csv");
  };

  const sendWhatsApp = async (record, phone = "") => {
    const messageText =
      record.whatsapp_message ||
      record.whatsapp_message_content ||
      previewMessage ||
      "Zeytin takip bilgisi";
    const text = encodeURIComponent(
      messageText || previewMessage || "Zeytin takip bilgisi",
    );
    const normalizedPhone = normalizeWhatsAppPhone(phone);
    window.open(
      `https://wa.me/${normalizedPhone}?text=${text}`,
      "_blank",
      "noopener,noreferrer",
    );
    const update = {
      whatsapp_status: "Gönderildi",
      whatsapp_sent_at: new Date().toISOString(),
      whatsapp_message_content: messageText,
      whatsapp_error: "",
    };

    try {
      const response = await updateSortingRecord(record.id, update);
      setRecords((prev) =>
        prev.map((item) =>
          item.id === record.id ? { ...item, ...response.data } : item,
        ),
      );
    } catch (error) {
      console.error("WhatsApp durumu kaydedilemedi", error);
    }
  };

  const printReceipt = (record) => {
    const receiptWindow = window.open("", "_blank", "width=420,height=720");
    if (!receiptWindow) return;
    const messageText =
      record.whatsapp_message ||
      record.whatsapp_message_content ||
      "Zeytin takip bilgisi";
    const escapeHtml = (value) =>
      String(value).replace(
        /[&<>'"]/g,
        (character) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;",
          })[character],
      );
    receiptWindow.document.write(
      `<!doctype html><html lang="tr"><head><meta charset="UTF-8"><title>Fiş</title><style>body{font-family:Arial,sans-serif;padding:24px;max-width:360px}.message{white-space:pre-wrap;line-height:1.55}</style></head><body><h1>Anka Tarımsal Takip</h1><div class="message">${escapeHtml(messageText)}</div><script>window.onload=function(){window.print();}</script></body></html>`,
    );
    receiptWindow.document.close();
  };

  const printPaymentReceipt = ({
    title,
    name,
    phone,
    paymentDate,
    paidAmount,
    remainingAmount,
    reference,
    note,
  }) => {
    const receiptWindow = window.open("", "_blank", "width=420,height=720");
    if (!receiptWindow) return;
    const escapeHtml = (value) =>
      String(value ?? "").replace(
        /[&<>'"]/g,
        (character) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;",
          })[character],
      );
    const rows = [
      ["Ad Soyad", name || "Belirtilmemiş"],
      ["Telefon", phone || "Belirtilmemiş"],
      ["İşlem", reference || "Ödeme"],
      ["Ödeme tarihi", paymentDate || "-"],
      ["Ödenen tutar", `₺${Number(paidAmount || 0).toFixed(2)}`],
      ["Kalan tutar", `₺${Number(remainingAmount || 0).toFixed(2)}`],
      ["Not", note || "-"],
    ];
    const rowMarkup = rows
      .map(
        ([label, value]) =>
          `<div class="row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`,
      )
      .join("");
    receiptWindow.document.write(
      `<!doctype html><html lang="tr"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;padding:24px;max-width:360px;color:#0f172a}h1{font-size:20px;margin:0 0 6px}.subtitle{color:#64748b;font-size:13px;margin:0 0 20px}.row{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #e2e8f0;padding:10px 0;font-size:13px}.row span{color:#64748b}.row strong{text-align:right;white-space:pre-wrap}</style></head><body><h1>Anka Tarımsal Takip</h1><p class="subtitle">${escapeHtml(title)}</p>${rowMarkup}<script>window.onload=function(){window.print();}</script></body></html>`,
    );
    receiptWindow.document.close();
  };

  const sendProcessWhatsApp = async (customer, processStatus) => {
    let message;
    let updatedCustomer = customer;
    const customerPayload = {
      full_name: customer.full_name,
      phone: customer.phone || "",
      address: customer.address || "",
      notes: customer.notes || "",
      oil_process_status:
        processStatus === "Beklemede" ? "Sıkımda" : "İşlem Tamam",
      oil_output_liters: customer.oil_output_liters || null,
    };
    if (processStatus === "Beklemede") {
      updatedCustomer = (await updateCustomer(customer.id, customerPayload))
        .data;
      if (
        customer.latestRecord?.id &&
        !customer.latestRecord.pressing_sequence_no
      ) {
        const pressingSequence =
          records.reduce(
            (max, record) =>
              Math.max(max, Number(record.pressing_sequence_no || 0)),
            0,
          ) + 1;
        await updateSortingRecord(customer.latestRecord.id, {
          pressing_sequence_no: pressingSequence,
        });
      }
      message = `Sayın ${customer.full_name}, ${Number(customer.totalOil || 0).toFixed(2)} KG yağlık zeytininiz sıkıma alındı.`;
    } else {
      const defaultLiters =
        processStatus === "İşlem Tamam" ? customer.oil_output_liters || "" : "";
      const litersInput = window.prompt(
        "Çıkan zeytinyağı miktarını litre olarak girin:",
        defaultLiters,
      );
      if (litersInput === null) return;
      const liters = Number(String(litersInput).replace(",", "."));
      if (!Number.isFinite(liters) || liters <= 0) {
        window.alert("Geçerli bir litre miktarı girin.");
        return;
      }
      const kgPerLiter = Number(customer.totalOil || 0) / liters;
      updatedCustomer = (
        await updateCustomer(customer.id, {
          ...customerPayload,
          oil_output_liters: liters,
        })
      ).data;
      message = `Sayın ${customer.full_name}, ${Number(customer.totalOil || 0).toFixed(2)} KG yağlık zeytininizin sıkım işlemi tamamlandı. ${liters.toFixed(2)} litre zeytinyağı elde edildi. 1 litre için ${kgPerLiter.toFixed(2)} KG yağlık kullanıldı.`;
    }
    setCustomers((prev) =>
      prev.map((item) =>
        item.id === updatedCustomer.id ? updatedCustomer : item,
      ),
    );
    const phone = normalizeWhatsAppPhone(customer.phone);
    const text = encodeURIComponent(message);
    window.open(
      `https://wa.me/${phone}?text=${text}`,
      "_blank",
      "noopener,noreferrer",
    );
    await refreshData();
  };

  const openPressingRecord = (customer) => {
    setActiveTab("operations");
    setForm((previous) => ({
      ...previous,
      customer: customer.full_name,
      customer_phone: customer.phone || "",
      sequence_no: customer.latestRecord?.sequence_no || previous.sequence_no,
      items: customer.latestRecord?.items?.length
        ? customer.latestRecord.items
        : previous.items,
    }));
  };

  /* Eleme kaydı için WhatsApp mesaj önizlemesini oluşturur */
  const previewMessage = useMemo(() => {
    const totalAmount = calculatePurchaseAmount(form.items, priceMap);
    const totalOil = form.items.reduce((sum, item) => {
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
        oilSizes.reduce(
          (itemSum, size) => itemSum + Number(item[`size_${size}`] || 0),
          0,
        )
      );
    }, 0);
    const lines = [
      `Sayın ${form.customer},`,
      "",
      `${formatTurkishDate(form.date)} tarihli ürün teslim kaydınız:`,
      "",
    ];

    form.items.forEach((item) => {
      const sizePrices = priceMap[item.olive_type] || {};
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
      lines.push(`${item.olive_type}:`);
      sizeKeys.forEach((size) => {
        const value = Number(item[`size_${size}`] || 0);
        const unitPrice = Number(sizePrices[size] || 0);
        if (value > 0 && !oilSizes.includes(size)) {
          lines.push(
            `${size}: ${formatMessageNumber(value)} KG × ${formatMessageNumber(unitPrice)} TL = ${formatMessageNumber(value * unitPrice)} TL`,
          );
        }
      });
      lines.push("");
    });

    lines.push(`Toplam Yağlık: ${formatMessageNumber(totalOil)} KG`);
    lines.push("");
    const purchaseAmount =
      form.purchase_amount === ""
        ? totalAmount
        : Number(form.purchase_amount || 0);
    const payableAmount =
      form.payable_amount === ""
        ? purchaseAmount
        : Number(form.payable_amount || 0);
    lines.push(`Ödenecek Tutar: ${formatMessageNumber(payableAmount)} TL`);
    lines.push("Ödenen Tutar: 0 TL");
    lines.push(`Kalan Tutar: ${formatMessageNumber(payableAmount)} TL`);

    return lines.join("\n");
  }, [form, priceMap]);

  const updateItem = (index, field, value) => {
    const nextValue = field.startsWith("size_") && value === "" ? "0" : value;
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: nextValue } : item,
      ),
    }));
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, defaultItem(oliveTypeOptions[0] || "")],
    }));
  };

  const removeItem = (index) => {
    if (form.items.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const getOilSelection = (oilRelease) => {
    const selected = {
      11: false,
      12: false,
      13: false,
      14: false,
      15: false,
      16: false,
      17: false,
    };

    if (oilRelease === "11-12") {
      selected[11] = true;
      selected[12] = true;
    }
    if (oilRelease === "13-17") {
      [13, 14, 15, 16, 17].forEach((size) => {
        selected[size] = true;
      });
    }
    if (oilRelease === "all") {
      [11, 12, 13, 14, 15, 16, 17].forEach((size) => {
        selected[size] = true;
      });
    }
    if (oilRelease.startsWith("custom:")) {
      oilRelease
        .slice(7)
        .split(",")
        .forEach((size) => {
          if (sizeKeys.includes(Number(size))) selected[Number(size)] = true;
        });
    }
    return selected;
  };

  const toggleOilSize = (index, size) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const selected = getOilSelection(item.oil_release);
        selected[size] = !selected[size];
        const enabled = sizeKeys.filter((key) => selected[key]);

        const nextRelease =
          enabled.length === 0
            ? "none"
            : enabled.length === 7
              ? "all"
              : enabled.length === 2 &&
                  enabled.includes(11) &&
                  enabled.includes(12)
                ? "11-12"
                : enabled.length === 5 &&
                    enabled.every((key) => [13, 14, 15, 16, 17].includes(key))
                  ? "13-17"
                  : `custom:${enabled.join(",")}`;

        return { ...item, oil_release: nextRelease };
      }),
    }));
  };

  const handlePriceSave = async (price) => {
    const oliveType = String(price.olive_type || "").trim();
    if (!oliveType) return;
    try {
      await updateOlivePrice(price.id, {
        ...price,
        olive_type: oliveType,
        ...Object.fromEntries(
          sizeKeys.map((size) => [
            `size_${size}`,
            Number(price[`size_${size}`] || 0),
          ]),
        ),
      });
      await refreshData();
      setEditPriceId(null);
    } catch (error) {
      console.error("Zeytin fiyatı güncellenemedi", error);
      window.alert(
        "Fiyat güncellenemedi. Aynı isimde başka bir zeytin cinsi olabilir.",
      );
    }
  };

  const handlePriceDelete = async (price) => {
    if (!window.confirm(`${price.olive_type} fiyat listesi silinsin mi?`))
      return;
    try {
      await deleteOlivePrice(price.id);
      setEditPriceId(null);
      await refreshData();
    } catch (error) {
      console.error("Zeytin fiyatı silinemedi", error);
      window.alert(
        "Bu zeytin cinsi silinemedi. Kullanılmış kayıtları olabilir.",
      );
    }
  };

  const handleCreateOlivePrice = async (event) => {
    event.preventDefault();
    const oliveType = newOliveTypeName.trim();
    if (!oliveType) return;
    if (
      prices.some(
        (price) =>
          price.olive_type.trim().toLocaleLowerCase("tr-TR") ===
          oliveType.toLocaleLowerCase("tr-TR"),
      )
    ) {
      window.alert("Bu zeytin cinsi zaten kayıtlı.");
      return;
    }

    try {
      await createOlivePrice({
        olive_type: oliveType,
        size_11: 0,
        size_12: 0,
        size_13: 0,
        size_14: 0,
        size_15: 0,
        size_16: 0,
        size_17: 0,
      });
      setNewOliveTypeName("");
      await refreshData();
    } catch (error) {
      console.error("Yeni zeytin cinsi eklenemedi", error);
      window.alert("Yeni zeytin cinsi eklenemedi.");
    }
  };

  const handleAdminLogin = async (event) => {
    event.preventDefault();
    const username = loginForm.username.trim();
    const password = loginForm.password.trim();

    try {
      const response = await loginUser({ username, password });
      const user = response.data.user;
      window.localStorage.setItem("anka_auth_token", response.data.token);
      window.localStorage.setItem("anka_auth_user", JSON.stringify(user));
      setCurrentUser(user);
      setIsAuthenticated(true);
      setLoginError("");
      await refreshData(user, { seedDefaults: true });
    } catch (error) {
      setLoginError(
        error.response?.data?.detail || "Kullanıcı adı veya şifre hatalı.",
      );
    }
  };

  const resetStationForm = () => {
    setStationForm({
      name: "",
      responsible: "",
      phone: "",
      commission_per_kg: "2",
      status: "Aktif",
      commission_basis: "kg",
      commission_scope: "total_weight",
      work_dates: "",
      responsible_person_ids: [],
    });
    setEditStationId(null);
  };

  const resetPersonForm = () => {
    setPersonForm({ full_name: "", phone: "", status: "Aktif" });
    setEditPersonId(null);
  };

  const resetCustomerForm = () => {
    setCustomerForm({
      full_name: "",
      phone: "",
      address: "",
      notes: "",
      oil_process_status: "Beklemede",
      oil_output_liters: "",
      payment_amount: "",
    });
    setEditCustomerId(null);
    setIsEditingCustomer(false);
  };

  const resetUserForm = () => {
    setUserForm({
      username: "",
      password: "",
      first_name: "",
      last_name: "",
      can_manage_purchases: false,
      can_manage_sales: false,
      can_manage_users: false,
    });
    setEditUserId(null);
  };

  const handleUserSave = async (event) => {
    event.preventDefault();
    if (!userForm.username.trim() || (!editUserId && !userForm.password))
      return;
    const payload = { ...userForm, username: userForm.username.trim() };
    if (!payload.password) delete payload.password;
    try {
      if (editUserId) await updateUser(editUserId, payload);
      else await createUser(payload);
      await refreshData();
      resetUserForm();
    } catch (error) {
      console.error("Kullanıcı kaydedilemedi", error);
      window.alert(
        error.response?.data?.username?.[0] || "Kullanıcı kaydedilemedi.",
      );
    }
  };

  const handleUserEdit = (user) => {
    if (user.is_superuser) return;
    setEditUserId(user.id);
    setUserForm({
      username: user.username,
      password: "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      can_manage_purchases: user.can_manage_purchases,
      can_manage_sales: user.can_manage_sales,
      can_manage_users: user.can_manage_users,
    });
  };

  const handleUserDelete = async (user) => {
    if (user.id === currentUser?.id || user.is_superuser) return;
    if (!window.confirm(`${user.username} kullanıcısı silinsin mi?`)) return;
    try {
      await deleteUser(user.id);
      await refreshData();
    } catch (error) {
      console.error("Kullanıcı silinemedi", error);
    }
  };

  const handleCustomerSave = async (event) => {
    event.preventDefault();

    const payload = {
      full_name: customerForm.full_name.trim(),
      phone: formatTurkishPhone(customerForm.phone),
      address: customerForm.address.trim(),
      notes: customerForm.notes.trim(),
      oil_process_status: customerForm.oil_process_status,
      oil_output_liters:
        customerForm.oil_output_liters === ""
          ? null
          : Number(customerForm.oil_output_liters),
    };
    const paymentAmount = Number(customerForm.payment_amount || 0);

    if (!payload.full_name) {
      return;
    }

    try {
      let response;
      if (editCustomerId) {
        response = await updateCustomer(editCustomerId, payload);
      } else {
        response = await createCustomer(payload);
      }
      if (paymentAmount > 0) {
        const paymentRecord = records
          .filter(
            (record) =>
              String(record.customer || "")
                .trim()
                .toLocaleLowerCase("tr-TR") ===
              payload.full_name.toLocaleLowerCase("tr-TR"),
          )
          .sort(
            (first, second) => new Date(second.date) - new Date(first.date),
          )[0];
        if (!paymentRecord) {
          window.alert(
            "Bu üreticiye ait eleme kaydı olmadığı için ödeme eklenemedi.",
          );
          return;
        }
        await createCustomerPayment({
          record: paymentRecord.id,
          payment_date: getTodayDate(),
          amount: paymentAmount,
          note: "Üretici detayından eklenen ödeme",
        });
      }
      if (response?.data?.id) setSelectedCustomerId(String(response.data.id));
      await refreshData();
      resetCustomerForm();
    } catch (error) {
      console.error("Müşteri kaydedilemedi", error);
      window.alert(
        error.response?.data?.detail ||
          "Üretici güncellenemedi. Bu işlem için düzenleme yetkiniz olmayabilir.",
      );
    }
  };

  const handleCustomerEdit = async (customer) => {
    let editableCustomer = customer;
    if (String(customer.id || "").startsWith("legacy-")) {
      const response = await createCustomer({
        full_name: customer.full_name,
        phone: formatTurkishPhone(customer.phone),
        address: customer.address || "",
        notes: customer.notes || "",
      });
      editableCustomer = response.data;
      setCustomers((prev) => [...prev, response.data]);
      setSelectedCustomerId(String(response.data.id));
    }
    const customerId = editableCustomer.id;
    setEditCustomerId(customerId);
    setIsEditingCustomer(true);
    setCustomerForm({
      full_name: editableCustomer.full_name,
      phone: editableCustomer.phone || "",
      address: editableCustomer.address || "",
      notes: editableCustomer.notes || "",
      oil_process_status: editableCustomer.oil_process_status || "Beklemede",
      oil_output_liters: editableCustomer.oil_output_liters || "",
      payment_amount: "",
    });
  };

  const handleCustomerDelete = async (customer) => {
    if (!customer.id) {
      window.alert("Üretici kimliği bulunamadı.");
      return;
    }
    if (
      !window.confirm(
        `${customer.full_name} isimli üretici ve bağlı eleme kayıtları silinsin mi?`,
      )
    )
      return;
    try {
      await deleteCustomer(customer.id);
      setSelectedCustomerId("");
      resetCustomerForm();
      await refreshData();
    } catch (error) {
      console.error("Üretici silinemedi", error);
      window.alert(
        error.response?.data?.detail ||
          "Üretici silinemedi. Silme yetkinizi kontrol edin.",
      );
    }
  };

  const handlePersonSave = async (event) => {
    event.preventDefault();

    const payload = {
      full_name: personForm.full_name.trim(),
      phone: formatTurkishPhone(personForm.phone),
      status: personForm.status,
    };

    if (!payload.full_name || !payload.phone) {
      return;
    }

    try {
      if (editPersonId) {
        await updateResponsiblePerson(editPersonId, payload);
      } else {
        await createResponsiblePerson(payload);
      }
      await refreshData();
      resetPersonForm();
    } catch (error) {
      console.error("Sorumlu kaydedilemedi", error);
    }
  };

  const handlePersonEdit = (person) => {
    setEditPersonId(person.id);
    setPersonForm({
      full_name: person.full_name,
      phone: person.phone,
      status: person.status || "Aktif",
    });
  };

  const handlePersonStatusToggle = async (person) => {
    try {
      const nextStatus = person.status === "Aktif" ? "Pasif" : "Aktif";
      await updateResponsiblePerson(person.id, {
        ...person,
        status: nextStatus,
      });
      await refreshData();
    } catch (error) {
      console.error("Sorumlu durumu güncellenemedi", error);
    }
  };

  const handlePersonPaymentSave = async (event, person) => {
    event.preventDefault();
    const paymentForm = personPaymentForms[person.id] || {};
    const amount = Number(paymentForm.amount || 0);
    const remaining = Number(person.remaining_commission || 0);
    if (amount <= 0 || amount > remaining) return;

    try {
      await createResponsiblePersonPayment({
        person: person.id,
        payment_date:
          paymentForm.payment_date || new Date().toISOString().slice(0, 10),
        amount,
        note: paymentForm.note || "",
      });
      await refreshData();
      setPersonPaymentForms((prev) => ({
        ...prev,
        [person.id]: {
          amount: "",
          payment_date: new Date().toISOString().slice(0, 10),
          note: "",
        },
      }));
    } catch (error) {
      console.error("Personel komisyon ödemesi kaydedilemedi", error);
    }
  };

  const handlePersonDelete = async (person) => {
    if (!window.confirm(`${person.full_name} isimli sorumlu silinsin mi?`))
      return;
    try {
      await deleteResponsiblePerson(person.id);
      if (editPersonId === person.id) resetPersonForm();
      await refreshData();
    } catch (error) {
      console.error("Sorumlu silinemedi", error);
    }
  };

  const handleStationSave = async (event) => {
    event.preventDefault();

    const payload = {
      name: stationForm.name.trim(),
      responsible: stationForm.responsible.trim(),
      phone: formatTurkishPhone(stationForm.phone),
      commission_per_kg: Number(stationForm.commission_per_kg || 0),
      status: stationForm.status,
      commission_basis: stationForm.commission_basis,
      commission_scope: stationForm.commission_scope,
      work_dates: stationForm.work_dates
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      responsible_person_ids: stationForm.responsible_person_ids,
    };

    if (!payload.name) {
      return;
    }

    try {
      if (editStationId) {
        await updateSieveStation(editStationId, payload);
      } else {
        await createSieveStation(payload);
      }
      await refreshData();
      resetStationForm();
    } catch (error) {
      console.error("Elek kaydedilemedi", error);
    }
  };

  const handleStationStatusToggle = async (station) => {
    try {
      const nextStatus = station.status === "Aktif" ? "Pasif" : "Aktif";
      await updateSieveStation(station.id, { ...station, status: nextStatus });
      await refreshData();
    } catch (error) {
      console.error("Elek durumu güncellenemedi", error);
    }
  };

  const handleStationDelete = async (station) => {
    if (
      !window.confirm(
        `${station.name} isimli elek silinsin mi? Bu eleğe bağlı kayıtlar da silinebilir.`,
      )
    )
      return;
    try {
      await deleteSieveStation(station.id);
      if (editStationId === station.id) resetStationForm();
      await refreshData(null, { seedDefaults: false });
    } catch (error) {
      console.error("Elek silinemedi", error);
      window.alert(
        error.response?.data?.detail ||
          "Elek silinemedi. Silme yetkinizi kontrol edin.",
      );
    }
  };

  const handleStationEdit = (station) => {
    setEditStationId(station.id);
    setStationForm({
      name: station.name,
      responsible: station.responsible,
      phone: station.phone,
      commission_per_kg: String(station.commission_per_kg || 0),
      status: station.status || "Aktif",
      commission_basis: station.commission_basis || "kg",
      commission_scope: station.commission_scope || "total_weight",
      work_dates: Array.isArray(station.work_dates)
        ? station.work_dates.join(", ")
        : "",
      responsible_person_ids: Array.isArray(station.responsible_persons)
        ? station.responsible_persons.map((person) => person.id)
        : [],
    });
  };

  const assignResponsiblePerson = async (stationId, personIds) => {
    try {
      const station = stations.find((item) => item.id === stationId);
      if (!station) return;
      await updateSieveStation(stationId, {
        ...station,
        responsible_person_ids: personIds,
      });
      await refreshData();
    } catch (error) {
      console.error("Sorumlu atanamadı", error);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedStationId) return;

    setIsSubmitting(true);
    try {
      const nextSequence = getNextSequenceForStation(
        selectedStationId,
        form.date,
      );
      const calculatedPurchaseAmount = calculatePurchaseAmount(
        form.items,
        priceMap,
      );
      const payload = {
        date: form.date,
        sieve_station: Number(selectedStationId),
        responsible_person: selectedResponsiblePersonId
          ? Number(selectedResponsiblePersonId)
          : null,
        customer: form.customer,
        purchase_amount: calculatedPurchaseAmount,
        payable_amount:
          form.payable_amount === "" ? undefined : Number(form.payable_amount),
        sequence_no: nextSequence,
        items: form.items.map((item) => {
          const sizePrices = priceMap[item.olive_type] || {};
          return {
            olive_type: item.olive_type,
            size_11: normalizeNumericInput(item.size_11),
            size_12: normalizeNumericInput(item.size_12),
            size_13: normalizeNumericInput(item.size_13),
            size_14: normalizeNumericInput(item.size_14),
            size_15: normalizeNumericInput(item.size_15),
            size_16: normalizeNumericInput(item.size_16),
            size_17: normalizeNumericInput(item.size_17),
            price_11: normalizeNumericInput(sizePrices[11]),
            price_12: normalizeNumericInput(sizePrices[12]),
            price_13: normalizeNumericInput(sizePrices[13]),
            price_14: normalizeNumericInput(sizePrices[14]),
            price_15: normalizeNumericInput(sizePrices[15]),
            price_16: normalizeNumericInput(sizePrices[16]),
            price_17: normalizeNumericInput(sizePrices[17]),
            oil_release: item.oil_release,
          };
        }),
      };

      const response = await createSortingRecord(payload);
      let customer = customers.find(
        (item) =>
          String(item.full_name || "")
            .trim()
            .toLowerCase() ===
          String(form.customer || "")
            .trim()
            .toLowerCase(),
      );
      if (!customer && form.customer.trim()) {
        const customerResponse = await createCustomer({
          full_name: form.customer.trim(),
          phone: formatTurkishPhone(form.customer_phone),
          address: "",
          notes: "",
        });
        customer = customerResponse.data;
        setCustomers((prev) => [...prev, customerResponse.data]);
      } else if (
        customer &&
        form.customer_phone.trim() &&
        customer.phone !== formatTurkishPhone(form.customer_phone)
      ) {
        const customerResponse = await updateCustomer(customer.id, {
          ...customer,
          phone: formatTurkishPhone(form.customer_phone),
        });
        customer = customerResponse.data;
        setCustomers((prev) =>
          prev.map((item) =>
            item.id === customer.id ? customerResponse.data : item,
          ),
        );
      }
      setRecords((prev) => [response.data, ...prev]);
      const savedProducerKey = `${form.customer.trim().toLocaleLowerCase("tr-TR")}|${formatTurkishPhone(form.customer_phone)}`;
      setProducerQueue((previous) =>
        previous.map((producer) =>
          producer.key === savedProducerKey
            ? { ...producer, sequence_no: response.data.sequence_no }
            : producer,
        ),
      );
      await sendWhatsApp(response.data, customer?.phone);
      const nextDateTime = getComputerDateTime();
      setDateInput(formatDateInput(nextDateTime.date));
      setTimeInput(nextDateTime.time);
      setForm({
        ...nextDateTime,
        customer: "",
        customer_phone: "",
        purchase_amount: "",
        payable_amount: "",
        sequence_no: Number(response.data.sequence_no) + 1,
        items: [
          defaultItem(oliveTypeOptions[0] || ""),
          defaultItem(oliveTypeOptions[1] || oliveTypeOptions[0] || ""),
        ],
      });
      setSelectedStationId(String(response.data.sieve_station));
      setActiveProducerKey("");
    } catch (error) {
      console.error("Kayit olusturulamadı", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProducerRegister = (event) => {
    event.preventDefault();
    const fullName = producerDraft.full_name.trim();
    const phone = formatTurkishPhone(producerDraft.phone);
    if (!fullName || !phone) return;
    const key = `${fullName.toLocaleLowerCase("tr-TR")}|${phone}`;
    const sequenceNo =
      getNextSequenceForStation(selectedStationId, form.date) +
      producerQueue.length;
    setProducerQueue((previous) =>
      previous.some((producer) => producer.key === key)
        ? previous
        : [
            ...previous,
            { key, full_name: fullName, phone, sequence_no: sequenceNo },
          ],
    );
    setForm((previous) => ({
      ...previous,
      customer: fullName,
      customer_phone: phone,
    }));
    setActiveProducerKey(key);
    setProducerDraft({ full_name: "", phone: "" });
    setShowProducerForm(false);
  };

  const selectProducer = (producer) => {
    setForm((previous) => ({
      ...previous,
      customer: producer.full_name,
      customer_phone: producer.phone,
    }));
    setActiveProducerKey(producer.key);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(30,64,175,0.18),transparent_30%),linear-gradient(135deg,_#edf4ff_0%,_#f8fbff_100%)] p-4">
        <div className="w-full max-w-md rounded-[30px] border border-slate-200 bg-white/90 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-sm">
          <div className="mb-6 flex items-center justify-center">
            <div className="rounded-[22px] bg-[#0b1f3a] p-2 shadow-lg shadow-blue-900/20">
              <BrandLogo />
            </div>
          </div>

          <div className="mb-6 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Admin girişi
            </p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              Anka Tarımsal Takip
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Operasyon yönetimi paneli
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Kullanıcı Adı
              <input
                type="text"
                value={loginForm.username}
                onChange={(event) =>
                  setLoginForm((prev) => ({
                    ...prev,
                    username: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Şifre
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
              />
            </label>

            {loginError && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0b1f3a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#123d73]"
            >
              <ShieldCheck className="h-4 w-4" />
              Giriş Yap
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-lg font-semibold text-slate-600">
        Yükleniyor...
      </div>
    );
  }

  const canManageUsers =
    currentUser?.can_manage_users === true || currentUser?.is_superuser === true;
  const canManagePurchases =
    currentUser?.can_manage_purchases === true || canManageUsers;
  const canManageSales = currentUser?.can_manage_sales === true || canManageUsers;
  const currentUserDisplayName = currentUser?.is_superuser
    ? "admin"
    : [currentUser?.first_name, currentUser?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      currentUser?.username ||
      "Kullanıcı";
  const tabs = canManagePurchases ? [
    { id: "overview", label: "Genel Durum" },
    { id: "operations", label: "Eleme Kaydı" },
    { id: "pressing", label: "Sıkım Kaydı" },
    { id: "customers", label: "Üreticiler" },
    { id: "reports", label: "Rapor" },
    { id: "management", label: "Yönetim" },
    ...(canManageUsers ? [{ id: "users", label: "Kullanıcılar" }] : []),
  ] : canManageUsers ? [{ id: "users", label: "Kullanıcılar" }] : [];
  const merchantTabs = canManageSales ? [
    { id: "merchant-overview", label: "Genel Durum" },
    { id: "merchant-sales", label: "Satış Kaydı" },
    { id: "merchant-vehicles", label: "Araç Kaydı" },
    { id: "merchant-shipments", label: "Gönderim Kaydı" },
    { id: "merchant-traders", label: "Tüccarlar" },
    { id: "merchant-inventory", label: "Envanter Yönetimi" },
    { id: "merchant-reports", label: "Rapor" },
  ] : [];

  const selectedSale =
    salesRecords.find((sale) => sale.id === selectedSaleId) || null;
  const salePriceMap = salesPrices.reduce((map, price) => {
    map[price.olive_type] = Object.fromEntries(
      sizeKeys.map((size) => [size, Number(price[`size_${size}`] || 0)]),
    );
    return map;
  }, {});
  const purchaseInventory = records.reduce(
    (inventory, record) => {
      (record.items || []).forEach((item) =>
        sizeKeys.forEach((size) => {
          const key = `${item.olive_type}|${size}`;
          inventory[key] =
            (inventory[key] || 0) + Number(item[`size_${size}`] || 0);
        }),
      );
      return inventory;
    },
    inventoryEntries
      .filter((entry) => entry.product_type === "olive")
      .reduce((inventory, entry) => {
        const key = `${entry.olive_type}|${entry.size}`;
        inventory[key] = (inventory[key] || 0) + Number(entry.quantity || 0);
        return inventory;
      }, {}),
  );
  const soldInventory = salesRecords.reduce((inventory, sale) => {
    (sale.items || []).forEach((item) => {
      const key = `${item.olive_type}|${item.size}`;
      inventory[key] = (inventory[key] || 0) + Number(item.quantity_kg || 0);
    });
    return inventory;
  }, {});
  const totalManualOilLiters = inventoryEntries
    .filter((entry) => entry.product_type === "oil")
    .reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
  const totalSoldOilLiters = salesRecords.reduce(
    (sum, sale) =>
      sum +
      (sale.oil_items || []).reduce(
        (itemSum, item) => itemSum + Number(item.liters || 0),
        0,
      ),
    0,
  );
  const totalProducedOilLiters = totalManualOilLiters;
  const inventoryRows = Object.entries(purchaseInventory)
    .map(([key, purchased]) => {
      const [oliveType, size] = key.split("|");
      return {
        oliveType,
        size,
        purchased,
        sold: soldInventory[key] || 0,
        remaining: Math.max(purchased - (soldInventory[key] || 0), 0),
      };
    })
    .filter((row) => row.purchased > 0);

  /* Satış formundaki zeytin ve zeytinyağı kalemlerinin toplamı */
  const saleTotalAmount =
    saleItems.reduce(
      (sum, item) =>
        sum +
        Number(item.quantity_kg || 0) *
          Number(salePriceMap[item.olive_type]?.[item.size] || 0),
      0,
    ) +
    (sellOliveOil
      ? Number(saleOilLiters || 0) * Number(salesOilPrices[0]?.unit_price || 0)
      : 0);

  /* Satış müşterisini, kalemlerini ve kurumsal sevkiyat bilgisini kaydeder */
  const handleSaleSave = async (event) => {
    event.preventDefault();
    const name = saleForm.name.trim();
    const phone = formatTurkishPhone(saleForm.phone);
    const totalAmount = saleTotalAmount;
    const paidAmount = Number(saleForm.paidAmount || 0);
    const oilUnitPrice = Number(salesOilPrices[0]?.unit_price || 0);
    if (
      !name ||
      !phone ||
      totalAmount <= 0 ||
      paidAmount < 0 ||
      paidAmount > totalAmount ||
      (!saleItems.length && !sellOliveOil) ||
      (sellOliveOil &&
        (oilUnitPrice <= 0 ||
          Number(saleOilLiters) <= 0 ||
          Number(saleOilLiters) >
            Math.max(totalProducedOilLiters - totalSoldOilLiters, 0))) ||
      !saleItems.every(
        (item) =>
          item.olive_type &&
          Number(item.quantity_kg) > 0 &&
          Number(item.quantity_kg) <=
            Number(purchaseInventory[`${item.olive_type}|${item.size}`] || 0) -
              Number(soldInventory[`${item.olive_type}|${item.size}`] || 0),
      ) ||
      (saleForm.partyType === "corporate" && !saleForm.address.trim())
    )
      return;
    try {
      const existingParty = merchantParties.find(
        (party) =>
          party.party_type === saleForm.partyType &&
          party.name.trim().toLocaleLowerCase("tr-TR") ===
            name.toLocaleLowerCase("tr-TR"),
      );
      const partyResponse = existingParty
        ? { data: existingParty }
        : await createMerchantParty({
            party_type: saleForm.partyType,
            name,
            phone,
            address: saleForm.address.trim(),
          });
      const saleResponse = await createSalesRecord({
        party_id: partyResponse.data.id,
        vehicle_id: saleForm.partyType === "corporate" && saleForm.vehicleId ? Number(saleForm.vehicleId) : null,
        driver_id: saleForm.partyType === "corporate" && saleForm.driverId ? Number(saleForm.driverId) : null,
        sale_date: saleForm.saleDate,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        items: saleItems.map((item) => ({
          ...item,
          quantity_kg: Number(item.quantity_kg),
          unit_price: salePriceMap[item.olive_type]?.[item.size] || 0,
          oil_release: false,
        })),
        oil_items: sellOliveOil
          ? [{ liters: Number(saleOilLiters), unit_price: oilUnitPrice }]
          : [],
      });
      if (!existingParty) {
        setMerchantParties((previous) => [...previous, partyResponse.data]);
      }
      setSalesRecords((previous) => [saleResponse.data, ...previous]);
      setSelectedSaleId(saleResponse.data.id);
      setSaleForm({
        partyType: "individual",
        name: "",
        phone: "",
        address: "",
        saleDate: getTodayDate(),
        paidAmount: "",
        vehicleId: "",
        driverId: "",
      });
      setSaleItems([]);
      setSaleOilLiters("");
      setSellOliveOil(false);
      setSelectedSaleTypes([]);
      setSaleTypeToAdd("");
    } catch (error) {
      window.alert(
        error.response?.data?.detail || "Satış kaydı oluşturulamadı.",
      );
    }
  };

  const handleMerchantPaymentSave = async (event) => {
    event.preventDefault();
    const sale = salesRecords.find(
      (item) => String(item.id) === String(merchantPaymentForm.saleId),
    );
    const amount = Number(merchantPaymentForm.amount || 0);
    const remainingAmount = Number(sale?.remaining_amount || 0);
    if (!sale || amount <= 0 || amount > remainingAmount) return;

    try {
      await createSalesPayment({
        sale: sale.id,
        payment_date: merchantPaymentForm.paymentDate,
        amount,
        note: merchantPaymentForm.note.trim(),
      });
      setMerchantPaymentForm({
        saleId: "",
        paymentDate: getTodayDate(),
        amount: "",
        note: "",
      });
      await refreshData();
    } catch (error) {
      window.alert(
        error.response?.data?.amount?.[0] ||
          error.response?.data?.detail ||
          "Ödeme kaydedilemedi.",
      );
    }
  };

  const sendSaleWhatsApp = async (sale) => {
    const message =
      sale.whatsapp_message || sale.whatsapp_message_content || "Satış bilgisi";
    const phone = normalizeWhatsAppPhone(sale.party?.phone);
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
    try {
      const response = await updateSalesRecord(sale.id, {
        whatsapp_status: "Gönderildi",
        whatsapp_sent_at: new Date().toISOString(),
        whatsapp_message_content: message,
        whatsapp_error: "",
      });
      setSalesRecords((previous) =>
        previous.map((item) =>
          item.id === sale.id ? { ...item, ...response.data } : item,
        ),
      );
    } catch (error) {
      console.error("Satış WhatsApp durumu kaydedilemedi", error);
    }
  };

  const startShipment = (sale) => {
    const existing = shipments.find((shipment) => shipment.sale?.id === sale.id);
    setShipmentForm(existing ? {
      ...existing,
      saleId: sale.id,
      vehicleId: existing.vehicle?.id || "",
      driverId: existing.driver?.id || "",
      items: (existing.items || []).map((item) => ({ ...item, quantity: String(item.quantity) })),
    } : {
      saleId: sale.id,
      deliveryAddress: sale.party?.address || "",
      vehicleId: sale.vehicle?.id || "",
      driverId: sale.driver?.id || sale.vehicle?.driver || "",
      status: "Yuklemede",
      note: "",
      items: [
        ...(sale.items || []).map((item) => ({
          product_type: "olive",
          olive_type: item.olive_type,
          size: item.size,
          quantity: String(item.quantity_kg || ""),
          is_loaded: false,
        })),
        ...(sale.oil_items || []).map((item) => ({
          product_type: "oil",
          olive_type: "",
          size: null,
          quantity: String(item.liters || ""),
          is_loaded: false,
        })),
      ],
    });
  };

  const updateShipmentItem = (index, field, value) => {
    setShipmentForm((previous) => ({
      ...previous,
      items: previous.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const saveShipment = async (event) => {
    event.preventDefault();
    if (!shipmentForm?.deliveryAddress?.trim() || !shipmentForm.items.length) return;
    const payload = {
      sale_id: Number(shipmentForm.saleId),
      delivery_address: shipmentForm.deliveryAddress.trim(),
      vehicle_id: shipmentForm.vehicleId ? Number(shipmentForm.vehicleId) : null,
      driver_id: shipmentForm.driverId ? Number(shipmentForm.driverId) : null,
      status: shipmentForm.status,
      note: shipmentForm.note || "",
      items: shipmentForm.items.map((item) => ({
        product_type: item.product_type,
        olive_type: item.product_type === "olive" ? item.olive_type : "",
        size: item.product_type === "olive" ? Number(item.size) : null,
        quantity: Number(item.quantity || 0),
        is_loaded: Boolean(item.is_loaded),
      })),
    };
    try {
      const response = shipmentForm.id
        ? await updateShipment(shipmentForm.id, payload)
        : await createShipment(payload);
      setShipments((previous) => shipmentForm.id
        ? previous.map((item) => item.id === shipmentForm.id ? response.data : item)
        : [response.data, ...previous]);
      setShipmentForm(null);
    } catch (error) {
      window.alert(error.response?.data?.detail || "Gönderim kaydedilemedi.");
    }
  };

  const sendShipmentWhatsApp = async (shipment, recipient, status) => {
    const phone = normalizeWhatsAppPhone(recipient === "driver" ? shipment.driver?.phone : shipment.party?.phone);
    if (!phone) {
      window.alert(recipient === "driver" ? "Şoför telefonu kayıtlı değil." : "Firma telefonu kayıtlı değil.");
      return;
    }
    const statusLabel = { Yuklemede: "yüklemede", Yolda: "yolda", AdreseUlasti: "teslimat adresine ulaştı", Vardi: "teslimat adresine ulaştı" }[status] || status;
    const locationUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shipment.delivery_address)}`;
    const itemLines = (shipment.items || []).map((item) => item.product_type === "oil"
      ? `Zeytinyağı: ${item.quantity} litre`
      : `${item.olive_type} / ${item.size}: ${item.quantity} KG`);
    const message = [
      `Sayın ${recipient === "driver" ? (shipment.driver?.full_name || "şoför") : (shipment.party?.name || "firma yetkilisi")},`,
      `Gönderiniz şu anda ${statusLabel}.`,
      `Araç: ${shipment.vehicle?.plate || "Atanmadı"}`,
      `Şoför: ${shipment.driver?.full_name || "Atanmadı"}${shipment.driver?.phone ? ` (${shipment.driver.phone})` : ""}`,
      `Gönderim adresi: ${shipment.delivery_address}`,
      `Konum: ${locationUrl}`,
      "",
      "Yüklenen ürünler:",
      ...itemLines,
    ].join("\n");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    if (recipient === "company" && status !== shipment.status) {
      try {
        const response = await patchShipment(shipment.id, { status });
        setShipments((previous) => previous.map((item) => item.id === shipment.id ? response.data : item));
      } catch (error) {
        window.alert("Gönderim durumu güncellenemedi.");
      }
    }
  };

  const printSaleReceipt = (sale) => {
    const receiptWindow = window.open("", "_blank", "width=420,height=720");
    if (!receiptWindow) return;
    const message =
      sale.whatsapp_message || sale.whatsapp_message_content || "Satış bilgisi";
    const escapeHtml = (value) =>
      String(value).replace(
        /[&<>'"]/g,
        (character) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;",
          })[character],
      );
    receiptWindow.document.write(
      `<!doctype html><html lang="tr"><head><meta charset="UTF-8"><title>Satış Fişi</title><style>body{font-family:Arial,sans-serif;padding:24px;max-width:360px}.message{white-space:pre-wrap;line-height:1.55}</style></head><body><h1>Anka Tarımsal Takip</h1><p>Satış Fişi</p><div class="message">${escapeHtml(message)}</div><script>window.onload=function(){window.print();}</script></body></html>`,
    );
    receiptWindow.document.close();
  };

  const updateSaleItem = (index, field, value) => {
    setSaleItems((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const toggleSaleItem = (oliveType, size) => {
    setSaleItems((previous) => {
      const exists = previous.some(
        (item) =>
          item.olive_type === oliveType && Number(item.size) === Number(size),
      );
      return exists
        ? previous.filter(
            (item) =>
              !(
                item.olive_type === oliveType &&
                Number(item.size) === Number(size)
              ),
          )
        : [...previous, { olive_type: oliveType, size, quantity_kg: "" }];
    });
  };

  const addSaleType = () => {
    if (!saleTypeToAdd || selectedSaleTypes.includes(saleTypeToAdd)) return;
    setSelectedSaleTypes((previous) => [...previous, saleTypeToAdd]);
    setSaleTypeToAdd("");
  };

  const removeSaleType = (oliveType) => {
    setSelectedSaleTypes((previous) =>
      previous.filter((item) => item !== oliveType),
    );
    setSaleItems((previous) =>
      previous.filter((item) => item.olive_type !== oliveType),
    );
  };

  const addSalesType = async () => {
    const oliveType = newSalesTypeName.trim();
    if (
      !oliveType ||
      salesPrices.some(
        (price) =>
          price.olive_type.toLocaleLowerCase("tr-TR") ===
          oliveType.toLocaleLowerCase("tr-TR"),
      )
    )
      return;
    const response = await createSalesPrice({
      olive_type: oliveType,
      ...Object.fromEntries(sizeKeys.map((size) => [`size_${size}`, 0])),
    });
    setSalesPrices((previous) => [...previous, response.data]);
    setNewSalesTypeName("");
  };

  const removeSalesType = async (price) => {
    if (
      !price.id ||
      !window.confirm(`${price.olive_type} satış fiyatı silinsin mi?`)
    )
      return;
    await deleteSalesPrice(price.id);
    setSalesPrices((previous) =>
      previous.filter((item) => item.id !== price.id),
    );
  };

  const addInventoryEntry = async (event) => {
    event.preventDefault();
    const payload = {
      ...inventoryForm,
      quantity: Number(inventoryForm.quantity || 0),
      size:
        inventoryForm.product_type === "olive"
          ? Number(inventoryForm.size)
          : null,
      olive_type:
        inventoryForm.product_type === "olive"
          ? inventoryForm.olive_type.trim()
          : "",
    };
    if (
      !payload.quantity ||
      (payload.product_type === "olive" && !payload.olive_type)
    )
      return;
    const response = await createInventoryEntry(payload);
    setInventoryEntries((previous) => [response.data, ...previous]);
    setInventoryForm((previous) => ({ ...previous, quantity: "", note: "" }));
  };

  const removeInventoryEntry = async (entry) => {
    if (!window.confirm("Bu envanter kaydı silinsin mi?")) return;
    await deleteInventoryEntry(entry.id);
    setInventoryEntries((previous) =>
      previous.filter((item) => item.id !== entry.id),
    );
  };

  /* Araç ve şoför formlarını temizler */
  const resetDriverForm = () => {
    setDriverForm({ full_name: "", phone: "", status: "Aktif" });
    setEditingDriverId(null);
  };

  const resetVehicleForm = () => {
    setVehicleForm({ plate: "", driver: "" });
    setEditingVehicleId(null);
  };

  /* Şoför/personel kaydı oluşturur veya günceller */
  const handleDriverSave = async (event) => {
    event.preventDefault();
    const payload = { ...driverForm, full_name: driverForm.full_name.trim(), phone: formatTurkishPhone(driverForm.phone) };
    if (!payload.full_name) return;
    try {
      const response = editingDriverId
        ? await updateDriver(editingDriverId, payload)
        : await createDriver(payload);
      setDrivers((previous) => editingDriverId
        ? previous.map((driver) => driver.id === editingDriverId ? response.data : driver)
        : [...previous, response.data].sort((first, second) => first.full_name.localeCompare(second.full_name, "tr")));
      resetDriverForm();
    } catch (error) {
      window.alert(error.response?.data?.plate?.[0] || "Şoför kaydedilemedi.");
    }
  };

  /* Plaka kaydı oluşturur veya araca şoför atamasını günceller */
  const handleVehicleSave = async (event) => {
    event.preventDefault();
    const payload = { plate: vehicleForm.plate.trim().toLocaleUpperCase("tr-TR"), driver: vehicleForm.driver ? Number(vehicleForm.driver) : null };
    if (!payload.plate) return;
    try {
      const response = editingVehicleId
        ? await updateVehicle(editingVehicleId, payload)
        : await createVehicle(payload);
      setVehicles((previous) => editingVehicleId
        ? previous.map((vehicle) => vehicle.id === editingVehicleId ? response.data : vehicle)
        : [...previous, response.data]);
      resetVehicleForm();
    } catch (error) {
      window.alert(error.response?.data?.plate?.[0] || "Araç kaydedilemedi.");
    }
  };

  const handleDriverDelete = async (driver) => {
    if (!window.confirm(`${driver.full_name} isimli şoför silinsin mi?`)) return;
    await deleteDriver(driver.id);
    setDrivers((previous) => previous.filter((item) => item.id !== driver.id));
    setVehicles((previous) => previous.map((vehicle) => vehicle.driver === driver.id ? { ...vehicle, driver: null, driver_detail: null } : vehicle));
  };

  const handleVehicleDelete = async (vehicle) => {
    if (!window.confirm(`${vehicle.plate} plakalı araç silinsin mi?`)) return;
    await deleteVehicle(vehicle.id);
    setVehicles((previous) => previous.filter((item) => item.id !== vehicle.id));
  };

  /* Araç ve şoför kayıtlarının yönetildiği ekran */
  const renderVehicleManagement = () => (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={handleVehicleSave} className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Araç Kaydı</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">{editingVehicleId ? "Aracı düzenle" : "Yeni araç ekle"}</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <input value={vehicleForm.plate} onChange={(event) => setVehicleForm((previous) => ({ ...previous, plate: event.target.value }))} placeholder="Plaka" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" required />
            <select value={vehicleForm.driver} onChange={(event) => setVehicleForm((previous) => ({ ...previous, driver: event.target.value }))} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <option value="">Şoför atama</option>
              {drivers.filter((driver) => driver.status === "Aktif").map((driver) => <option key={driver.id} value={driver.id}>{driver.full_name}</option>)}
            </select>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="rounded-xl bg-[#0b1f3a] px-4 py-2 text-sm font-semibold text-white">{editingVehicleId ? "Güncelle" : "Araç kaydet"}</button>
            {editingVehicleId && <button type="button" onClick={resetVehicleForm} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">İptal</button>}
          </div>
        </form>

        <form onSubmit={handleDriverSave} className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Personel</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">{editingDriverId ? "Şoförü düzenle" : "Yeni şoför kaydı"}</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <input value={driverForm.full_name} onChange={(event) => setDriverForm((previous) => ({ ...previous, full_name: event.target.value }))} placeholder="Şoför adı soyadı" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" required />
            <input value={driverForm.phone} onChange={(event) => setDriverForm((previous) => ({ ...previous, phone: event.target.value }))} placeholder="Telefon" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" />
            <select value={driverForm.status} onChange={(event) => setDriverForm((previous) => ({ ...previous, status: event.target.value }))} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <option value="Aktif">Aktif</option><option value="Pasif">Pasif</option>
            </select>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">{editingDriverId ? "Güncelle" : "Şoför kaydet"}</button>
            {editingDriverId && <button type="button" onClick={resetDriverForm} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">İptal</button>}
          </div>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">Kayıtlı araçlar</h3>
          <div className="mt-4 space-y-3">{vehicles.length ? vehicles.map((vehicle) => <div key={vehicle.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-slate-900">{vehicle.plate}</p><p className="text-sm text-slate-500">Şoför: {vehicle.driver_detail?.full_name || "Atanmadı"}</p></div><span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">Araç</span></div><div className="mt-3 flex gap-2"><button type="button" onClick={() => { setEditingVehicleId(vehicle.id); setVehicleForm({ plate: vehicle.plate, driver: vehicle.driver || "" }); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Düzenle</button><button type="button" onClick={() => handleVehicleDelete(vehicle)} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white">Sil</button></div></div>) : <p className="text-sm text-slate-500">Henüz araç kaydı yok.</p>}</div>
        </div>
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">Kayıtlı şoförler</h3>
          <div className="mt-4 space-y-3">{drivers.length ? drivers.map((driver) => { const assignedVehicle = vehicles.find((vehicle) => vehicle.driver === driver.id); return <div key={driver.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-slate-900">{driver.full_name}</p><p className="text-sm text-slate-500">{driver.phone || "Telefon yok"} • Araç: {assignedVehicle?.plate || "Atanmadı"}</p></div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${driver.status === "Aktif" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{driver.status}</span></div><div className="mt-3 flex gap-2"><button type="button" onClick={() => { setEditingDriverId(driver.id); setDriverForm({ full_name: driver.full_name, phone: driver.phone || "", status: driver.status || "Aktif" }); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Düzenle</button><button type="button" onClick={() => handleDriverDelete(driver)} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white">Sil</button></div></div>; }) : <p className="text-sm text-slate-500">Henüz şoför kaydı yok.</p>}</div>
        </div>
      </div>
    </section>
  );

  /* Alışlardan ve manuel girişlerden oluşan stok ekranı */
  const renderInventoryManagement = () => {
    const inventoryOliveTypes = [
      ...new Set([
        ...oliveTypeOptions,
        ...inventoryRows.map((row) => row.oliveType),
      ]),
    ];
    const stockRows = [
      ...inventoryRows,
      {
        oliveType: "Zeytinyağı",
        size: "Litre",
        purchased: totalProducedOilLiters,
        sold: totalSoldOilLiters,
        remaining: Math.max(totalProducedOilLiters - totalSoldOilLiters, 0),
      },
    ];
    const recentEntries = [...inventoryEntries]
      .sort(
        (firstEntry, secondEntry) =>
          new Date(secondEntry.created_at || 0) -
          new Date(firstEntry.created_at || 0),
      )
      .slice(0, 8);
    const groupedStockRows = stockRows.reduce((groups, row) => {
      if (!groups[row.oliveType]) groups[row.oliveType] = [];
      groups[row.oliveType].push(row);
      return groups;
    }, {});

    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Envanter Yönetimi
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Stok girişi
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Alış kayıtlarından gelen zeytin otomatik olarak tabloya eklenir.
            Manuel girişler de aynı stok listesine düşer.
          </p>
          <form
            onSubmit={addInventoryEntry}
            className="mt-5 grid gap-3 md:grid-cols-12"
          >
            <select
              value={inventoryForm.product_type}
              onChange={(event) =>
                setInventoryForm((previous) => ({
                  ...previous,
                  product_type: event.target.value,
                }))
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:col-span-3"
            >
              <option value="olive">Zeytin</option>
              <option value="oil">Zeytinyağı</option>
            </select>
            {inventoryForm.product_type === "olive" ? (
              <>
                <select
                  value={inventoryForm.olive_type}
                  onChange={(event) =>
                    setInventoryForm((previous) => ({
                      ...previous,
                      olive_type: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:col-span-3"
                  required
                >
                  <option value="" disabled>
                    Cins seçin
                  </option>
                  {inventoryOliveTypes.map((oliveType) => (
                    <option key={oliveType} value={oliveType}>
                      {oliveType}
                    </option>
                  ))}
                </select>
                <select
                  value={inventoryForm.size}
                  onChange={(event) =>
                    setInventoryForm((previous) => ({
                      ...previous,
                      size: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:col-span-2"
                >
                  {sizeKeys.map((size) => (
                    <option key={size} value={size}>
                      Numara {size}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 md:col-span-5">
                Litre olarak eklenir
              </div>
            )}
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={inventoryForm.quantity}
              onChange={(event) =>
                setInventoryForm((previous) => ({
                  ...previous,
                  quantity: event.target.value,
                }))
              }
              placeholder={
                inventoryForm.product_type === "olive"
                  ? "Miktar (KG)"
                  : "Miktar (Litre)"
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:col-span-2"
              required
            />
            <button
              type="submit"
              className="rounded-xl bg-[#0b1f3a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#16355f] md:col-span-2"
            >
              Envantere ekle
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Stok
              </p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">
                Envanter tablosu
              </h3>
            </div>
            <div className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
              Toplam kalan:{" "}
              {stockRows
                .reduce((sum, row) => sum + row.remaining, 0)
                .toFixed(2)}
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {Object.entries(groupedStockRows).map(([oliveType, rows]) => {
              const purchased = rows.reduce(
                (sum, row) => sum + row.purchased,
                0,
              );
              const sold = rows.reduce((sum, row) => sum + row.sold, 0);
              const remaining = rows.reduce(
                (sum, row) => sum + row.remaining,
                0,
              );
              const stockPercent =
                purchased > 0 ? Math.round((remaining / purchased) * 100) : 0;
              const unit = rows[0].size === "Litre" ? "L" : "KG";
              return (
                <div
                  key={oliveType}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">
                        {oliveType}
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        {rows[0].size === "Litre"
                          ? "Zeytinyağı stoğu"
                          : `${rows.length} numara`}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${stockPercent > 25 ? "bg-emerald-100 text-emerald-700" : stockPercent > 0 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}
                    >
                      %{stockPercent} kaldı
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${stockPercent}%` }}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-white p-2.5">
                      <span className="block text-slate-500">Alış</span>
                      <strong className="mt-1 block text-slate-900">
                        {purchased.toFixed(2)} {unit}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-white p-2.5">
                      <span className="block text-slate-500">Satış</span>
                      <strong className="mt-1 block text-orange-600">
                        {sold.toFixed(2)} {unit}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-white p-2.5">
                      <span className="block text-slate-500">Kalan</span>
                      <strong className="mt-1 block text-emerald-700">
                        {remaining.toFixed(2)} {unit}
                      </strong>
                    </div>
                  </div>
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-500">
                        <tr>
                          <th className="px-3 py-2.5 font-semibold">
                            {rows[0].size === "Litre" ? "Ürün" : "Numara"}
                          </th>
                          <th className="px-3 py-2.5 text-right font-semibold">
                            Alış {unit}
                          </th>
                          <th className="px-3 py-2.5 text-right font-semibold">
                            Satış {unit}
                          </th>
                          <th className="px-3 py-2.5 text-right font-semibold">
                            Kalan {unit}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr
                            key={`${row.oliveType}-${row.size}`}
                            className="border-t border-slate-200 hover:bg-blue-50/50"
                          >
                            <td className="px-3 py-2.5 font-medium text-slate-800">
                              {row.size === "Litre" ? "Zeytinyağı" : row.size}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                              {row.purchased.toFixed(2)}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-orange-600">
                              {row.sold.toFixed(2)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-emerald-700">
                              {row.remaining.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Son girişler
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {recentEntries.length ? (
              recentEntries.map((entry) => {
                const entryName =
                  entry.product_type === "oil"
                    ? "Zeytinyağı"
                    : entry.olive_type || "Zeytin";
                const entryUnit = entry.product_type === "oil" ? "L" : "KG";
                const entryDate = new Date(entry.created_at || Date.now());
                const formattedDate = Number.isNaN(entryDate.getTime())
                  ? "Tarih yok"
                  : entryDate.toLocaleString("tr-TR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                return (
                  <div
                    key={entry.id}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 shadow-sm"
                  >
                    <span className="font-semibold text-slate-800">
                      {entryName}
                    </span>
                    <span className="mx-2 text-slate-400">•</span>
                    <span>
                      {Number(entry.quantity || 0).toFixed(2)} {entryUnit}
                    </span>
                    <span className="mx-2 text-slate-400">•</span>
                    <span>{formattedDate}</span>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-slate-500">
                Henüz giriş yapılmadı.
              </div>
            )}
          </div>
        </div>
      </section>
    );
  };

  const renderSalesOverviewV3 = () => {
    const salesTypeNames = salesPrices.map((price) => price.olive_type);
    const totalPurchased = inventoryRows.reduce(
      (sum, row) => sum + row.purchased,
      0,
    );
    const totalSold = inventoryRows.reduce((sum, row) => sum + row.sold, 0);
    const totalRemaining = inventoryRows.reduce(
      (sum, row) => sum + row.remaining,
      0,
    );
    const filteredRows = inventoryRows.filter((row) =>
      row.oliveType
        .toLocaleLowerCase("tr-TR")
        .includes(inventorySearch.trim().toLocaleLowerCase("tr-TR")),
    );
    const oilInventoryRow = {
      oliveType: "Zeytinyağı",
      size: "Litre",
      purchased: totalProducedOilLiters,
      sold: totalSoldOilLiters,
      remaining: Math.max(totalProducedOilLiters - totalSoldOilLiters, 0),
    };
    const displayRows =
      inventorySearch.trim() &&
      !"zeytinyağı".includes(inventorySearch.trim().toLocaleLowerCase("tr-TR"))
        ? filteredRows
        : [...filteredRows, oilInventoryRow];
    const groupedRows = displayRows.reduce((groups, row) => {
      if (!groups[row.oliveType]) groups[row.oliveType] = [];
      groups[row.oliveType].push(row);
      return groups;
    }, {});
    const stockPercent =
      totalPurchased > 0
        ? Math.round((totalRemaining / totalPurchased) * 100)
        : 0;
    return (
      <section className="space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-[#0b1f3a] to-[#18549a] p-6 text-white shadow-[0_20px_45px_rgba(11,31,58,0.2)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">
                Satış Genel Durum
              </p>
              <h2 className="mt-2 text-3xl font-bold">Envanter özeti</h2>
              <p className="mt-2 text-sm text-blue-100">
                Alınan zeytinlerden satışlarla düşen güncel stok.
              </p>
            </div>
            <div className="min-w-52 rounded-2xl bg-white/10 p-4">
              <div className="flex items-center justify-between text-sm">
                <span>Kalan stok oranı</span>
                <strong>%{stockPercent}</strong>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-emerald-300 transition-all"
                  style={{ width: `${stockPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-sm font-medium text-blue-700">Alış envanteri</p>
            <p className="mt-2 text-3xl font-bold text-blue-950">
              {totalPurchased.toFixed(2)}{" "}
              <span className="text-base font-semibold">KG</span>
            </p>
            <p className="mt-1 text-xs text-blue-700">Toplam alınan</p>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
            <p className="text-sm font-medium text-orange-700">Satılan</p>
            <p className="mt-2 text-3xl font-bold text-orange-950">
              {totalSold.toFixed(2)}{" "}
              <span className="text-base font-semibold">KG</span>
            </p>
            <p className="mt-1 text-xs text-orange-700">
              Satış kayıtlarından düşülen
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-medium text-emerald-700">Kalan stok</p>
            <p className="mt-2 text-3xl font-bold text-emerald-950">
              {totalRemaining.toFixed(2)}{" "}
              <span className="text-base font-semibold">KG</span>
            </p>
            <p className="mt-1 text-xs text-emerald-700">Satışa hazır</p>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Cins ve numara bazlı stok
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Her cins için alınan, satılan ve kalan miktarı karşılaştırın.
              </p>
            </div>
            <input
              value={inventorySearch}
              onChange={(event) => setInventorySearch(event.target.value)}
              placeholder="Cins ara"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white"
            />
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {Object.entries(groupedRows).map(([oliveType, rows]) => {
              const purchased = rows.reduce(
                (sum, row) => sum + row.purchased,
                0,
              );
              const sold = rows.reduce((sum, row) => sum + row.sold, 0);
              const remaining = rows.reduce(
                (sum, row) => sum + row.remaining,
                0,
              );
              const percent =
                purchased > 0 ? Math.round((remaining / purchased) * 100) : 0;
              return (
                <div
                  key={oliveType}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">
                        {oliveType}
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        {rows.length} numara
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${percent > 25 ? "bg-emerald-100 text-emerald-700" : percent > 0 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}
                    >
                      %{percent} kaldı
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-white p-2">
                      <span className="block text-slate-500">Alış</span>
                      <strong className="mt-1 block text-slate-900">
                        {purchased.toFixed(2)}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-white p-2">
                      <span className="block text-slate-500">Satış</span>
                      <strong className="mt-1 block text-orange-700">
                        {sold.toFixed(2)}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-white p-2">
                      <span className="block text-slate-500">Kalan</span>
                      <strong className="mt-1 block text-emerald-700">
                        {remaining.toFixed(2)}
                      </strong>
                    </div>
                  </div>
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Numara</th>
                          <th className="px-3 py-2">Alış KG</th>
                          <th className="px-3 py-2">Satış KG</th>
                          <th className="px-3 py-2">Kalan KG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr
                            key={`${row.oliveType}-${row.size}`}
                            className="border-t border-slate-100"
                          >
                            <td className="px-3 py-2 font-semibold">
                              {row.size}
                            </td>
                            <td className="px-3 py-2">
                              {row.purchased.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-orange-700">
                              {row.sold.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 font-semibold text-emerald-700">
                              {row.remaining.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
          {!Object.keys(groupedRows).length && (
            <p className="mt-6 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
              Aramanızla eşleşen envanter bulunamadı.
            </p>
          )}
        </div>
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-bold text-slate-900">
              Satış fiyatları
            </h3>
            <button
              type="button"
              onClick={() => setSalesPriceEditing((editing) => !editing)}
              className="rounded-xl bg-[#0b1f3a] px-4 py-2 text-sm font-semibold text-white"
            >
              {salesPriceEditing ? "Düzenlemeyi kapat" : "Düzenle"}
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {salesTypeNames.map((oliveType) => {
              const savedPrice = salesPrices.find(
                (item) => item.olive_type === oliveType,
              );
              const basePrice = savedPrice || {
                olive_type: oliveType,
                ...Object.fromEntries(
                  sizeKeys.map((size) => [
                    `size_${size}`,
                    priceMap[oliveType]?.[size] || 0,
                  ]),
                ),
              };
              return (
                <div
                  key={oliveType}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-800">{oliveType}</p>
                    {salesPriceEditing && savedPrice && (
                      <button
                        type="button"
                        onClick={() => removeSalesType(savedPrice)}
                        className="text-xs font-semibold text-rose-600"
                      >
                        Cinsi kaldır
                      </button>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2 md:grid-cols-7">
                    {sizeKeys.map((size) => (
                      <label key={size} className="text-xs text-slate-500">
                        {size}
                        {salesPriceEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={basePrice[`size_${size}`]}
                            onBlur={async (event) => {
                              const payload = {
                                olive_type: oliveType,
                                ...Object.fromEntries(
                                  sizeKeys.map((key) => [
                                    `size_${key}`,
                                    Number(
                                      key === size
                                        ? event.target.value || 0
                                        : basePrice[`size_${key}`] || 0,
                                    ),
                                  ]),
                                ),
                              };
                              const response = savedPrice
                                ? await updateSalesPrice(savedPrice.id, payload)
                                : await createSalesPrice(payload);
                              setSalesPrices((previous) => [
                                ...previous.filter(
                                  (item) => item.olive_type !== oliveType,
                                ),
                                response.data,
                              ]);
                            }}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1"
                          />
                        ) : (
                          <span className="mt-1 block rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800">
                            {formatPrice(basePrice[`size_${size}`])}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-emerald-900">Zeytinyağı</p>
                <p className="text-xs text-emerald-700">Litre satış fiyatı</p>
              </div>
              <label className="text-right text-xs text-emerald-700">
                TL / Litre
                {salesPriceEditing ? (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={salesOilPrices[0]?.unit_price || 0}
                    onBlur={async (event) => {
                      const payload = { unit_price: Number(event.target.value || 0) };
                      const response = salesOilPrices[0]
                        ? await updateSalesOilPrice(salesOilPrices[0].id, payload)
                        : await createSalesOilPrice(payload);
                      setSalesOilPrices([response.data]);
                    }}
                    className="mt-1 block w-32 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-right text-sm text-slate-900"
                  />
                ) : (
                  <span className="mt-1 block w-32 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-right text-sm font-semibold text-slate-900">
                    {formatPrice(salesOilPrices[0]?.unit_price)}
                  </span>
                )}
              </label>
            </div>
          </div>
          {salesPriceEditing && (
            <div className="mt-4 flex gap-2">
              <input
                value={newSalesTypeName}
                onChange={(event) => setNewSalesTypeName(event.target.value)}
                placeholder="Yeni zeytin cinsi"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2"
              />
              <button
                type="button"
                onClick={addSalesType}
                className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Cins ekle
              </button>
            </div>
          )}
        </div>
      </section>
    );
  };

  /* Zeytin, zeytinyağı ve kurumsal sevkiyat bilgilerini alan satış formu */
  const renderSalesForm = () => {
    const individualSales = salesRecords.filter(
      (sale) => sale.party?.party_type === "individual",
    );
    const corporateSales = salesRecords.filter(
      (sale) => sale.party?.party_type === "corporate",
    );
    const saleTypeOptions = [
      ...new Set([
        ...salesPrices.map((price) => price.olive_type),
        ...Object.keys(purchaseInventory).map((key) => key.split("|")[0]),
      ]),
    ];
    const saleList = (title, items) => (
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
        <h3 className="text-lg font-bold">{title}</h3>
        <div className="mt-4 space-y-2">
          {items.length ? (
            items.map((sale) => (
              <button
                key={sale.id}
                type="button"
                onClick={() => setSelectedSaleId(sale.id)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left"
              >
                <div className="flex justify-between">
                  <span className="font-semibold">{sale.party?.name}</span>
                  <span className="text-xs">#{sale.sale_no}</span>
                </div>
                <p className="mt-1 text-xs">
                  ₺{Number(sale.total_amount || 0).toFixed(2)} • Kalan ₺
                  {Number(sale.remaining_amount || 0).toFixed(2)}
                </p>
              </button>
            ))
          ) : (
            <p className="text-sm text-slate-500">Kayıt bulunmuyor.</p>
          )}
        </div>
      </div>
    );
    return (
      <section className="space-y-6">
        <form
          onSubmit={handleSaleSave}
          className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Satış Kaydı
              </p>
              <h2 className="mt-1 text-2xl font-bold">Yeni satış oluştur</h2>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setSaleForm((previous) => ({
                    ...previous,
                    partyType: "individual",
                  }))
                }
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${saleForm.partyType === "individual" ? "bg-blue-700 text-white" : "border border-slate-200"}`}
              >
                Bireysel
              </button>
              <button
                type="button"
                onClick={() =>
                  setSaleForm((previous) => ({
                    ...previous,
                    partyType: "corporate",
                  }))
                }
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${saleForm.partyType === "corporate" ? "bg-blue-700 text-white" : "border border-slate-200"}`}
              >
                Kurumsal
              </button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <input
              value={saleForm.name}
              onChange={(event) =>
                setSaleForm((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              placeholder={
                saleForm.partyType === "individual"
                  ? "Ad Soyad"
                  : "Firma / Şirket adı"
              }
              className="rounded-xl border px-3 py-2"
              required
            />
            <input
              type="tel"
              value={saleForm.phone}
              onChange={(event) =>
                setSaleForm((previous) => ({
                  ...previous,
                  phone: event.target.value,
                }))
              }
              placeholder="İletişim numarası"
              className="rounded-xl border px-3 py-2"
              required
            />
            {saleForm.partyType === "corporate" && (
              <input
                value={saleForm.address}
                onChange={(event) =>
                  setSaleForm((previous) => ({
                    ...previous,
                    address: event.target.value,
                  }))
                }
                placeholder="Adres"
                className="rounded-xl border px-3 py-2 md:col-span-2"
                required
              />
            )}
            <input
              type="date"
              value={saleForm.saleDate}
              onChange={(event) =>
                setSaleForm((previous) => ({
                  ...previous,
                  saleDate: event.target.value,
                }))
              }
              className="rounded-xl border px-3 py-2"
              required
            />
          </div>
          {saleForm.partyType === "corporate" && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">Sevkiyat bilgileri</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <select
                  value={saleForm.vehicleId}
                  onChange={(event) => {
                    const vehicle = vehicles.find((item) => String(item.id) === event.target.value);
                    setSaleForm((previous) => ({ ...previous, vehicleId: event.target.value, driverId: vehicle?.driver ? String(vehicle.driver) : "" }));
                  }}
                  className="rounded-xl border border-amber-200 bg-white px-3 py-2"
                >
                  <option value="">Araç seçin</option>
                  {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate}</option>)}
                </select>
                <select
                  value={saleForm.driverId}
                  onChange={(event) => setSaleForm((previous) => ({ ...previous, driverId: event.target.value }))}
                  className="rounded-xl border border-amber-200 bg-white px-3 py-2"
                  disabled={!saleForm.vehicleId}
                >
                  <option value="">Araca atanmış şoför</option>
                  {vehicles.find((vehicle) => String(vehicle.id) === String(saleForm.vehicleId))?.driver_detail && <option value={vehicles.find((vehicle) => String(vehicle.id) === String(saleForm.vehicleId)).driver_detail.id}>{vehicles.find((vehicle) => String(vehicle.id) === String(saleForm.vehicleId)).driver_detail.full_name}</option>}
                </select>
              </div>
            </div>
          )}
          <div className="mt-6 rounded-2xl border border-dashed border-blue-300 bg-blue-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={saleTypeToAdd}
                onChange={(event) => setSaleTypeToAdd(event.target.value)}
                className="flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2"
              >
                <option value="">Cins seçin</option>
                {saleTypeOptions
                  .filter((type) => !selectedSaleTypes.includes(type))
                  .map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={addSaleType}
                disabled={!saleTypeToAdd}
                className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Ürün ekle
              </button>
            </div>
          </div>
          {renderSalesOilPanel()}
          <div className="mt-6 space-y-5">
            {selectedSaleTypes.map((oliveType, typeIndex) => (
              <div
                key={oliveType}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                      {typeIndex + 1}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                      {oliveType}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSaleType(oliveType)}
                    className="text-sm font-semibold text-rose-600"
                  >
                    Kaldır
                  </button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-7">
                  {sizeKeys.map((size) => {
                    const item = saleItems.find(
                      (saleItem) =>
                        saleItem.olive_type === oliveType &&
                        Number(saleItem.size) === size,
                    );
                    const available = Math.max(
                      (purchaseInventory[`${oliveType}|${size}`] || 0) -
                        (soldInventory[`${oliveType}|${size}`] || 0),
                      0,
                    );
                    const unitPrice = Number(
                      salePriceMap[oliveType]?.[size] || 0,
                    );
                    return (
                      <label
                        key={`${oliveType}-${size}`}
                        className="space-y-2 text-xs font-medium uppercase tracking-wide text-slate-500"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={Boolean(item)}
                            onChange={() => toggleSaleItem(oliveType, size)}
                            className="h-4 w-4"
                          />
                          {size}
                        </span>
                        <input
                          type="number"
                          min="0"
                          max={available}
                          step="0.01"
                          disabled={!item}
                          value={item?.quantity_kg || ""}
                          onChange={(event) => {
                            const index = saleItems.findIndex(
                              (saleItem) =>
                                saleItem.olive_type === oliveType &&
                                Number(saleItem.size) === size,
                            );
                            if (index >= 0)
                              updateSaleItem(
                                index,
                                "quantity_kg",
                                event.target.value,
                              );
                          }}
                          placeholder={`${available.toFixed(2)} KG`}
                          className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                        <span className="block normal-case text-[10px] text-slate-400">
                          ₺{unitPrice.toFixed(2)} / KG
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-blue-50 p-3">
              Toplam satış: <strong>₺{saleTotalAmount.toFixed(2)}</strong>
            </div>
            <input
              type="number"
              min="0"
              max={saleTotalAmount}
              step="0.01"
              value={saleForm.paidAmount}
              onChange={(event) =>
                setSaleForm((previous) => ({
                  ...previous,
                  paidAmount: event.target.value,
                }))
              }
              placeholder="Verilen ödeme"
              className="rounded-xl border px-3 py-2"
            />
            <div className="rounded-xl bg-amber-50 p-3">
              Kalan ödeme:{" "}
              <strong>
                ₺
                {Math.max(
                  saleTotalAmount - Number(saleForm.paidAmount || 0),
                  0,
                ).toFixed(2)}
              </strong>
            </div>
          </div>
          <button
            type="submit"
            disabled={!selectedSaleTypes.length}
            className="mt-5 rounded-xl bg-[#0b1f3a] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Satış Kaydını Oluştur
          </button>
        </form>
        <div className="grid gap-6 xl:grid-cols-2">
          {saleList("Bireysel", individualSales)}
          {saleList("Kurumsal", corporateSales)}
        </div>
        {selectedSale && (
          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
            <h3 className="text-xl font-bold">
              {selectedSale.party.name} • Satış #{selectedSale.sale_no}
            </h3>
            <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-900 p-4 text-sm text-white">
              {selectedSale.whatsapp_message}
            </pre>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => sendSaleWhatsApp(selectedSale)}
                className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
              >
                WhatsApp ile Gönder
              </button>
              <button
                type="button"
                onClick={() => printSaleReceipt(selectedSale)}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold"
              >
                Fiş Kes
              </button>
            </div>
          </div>
        )}
      </section>
    );
  };

  const renderSalesRecords = () => (
    <section className="space-y-6">
      {renderSalesForm()}
    </section>
  );

  const renderMerchantReports = () => {
    const totalSales = salesRecords.reduce(
      (sum, sale) => sum + Number(sale.total_amount || 0),
      0,
    );
    const totalCollected = salesRecords.reduce(
      (sum, sale) => sum + Number(sale.total_paid || sale.paid_amount || 0),
      0,
    );
    const totalRemaining = salesRecords.reduce(
      (sum, sale) => sum + Number(sale.remaining_amount || 0),
      0,
    );
    const shipmentCounts = shipments.reduce(
      (counts, shipment) => {
        const status = shipment.status === "Vardi" ? "AdreseUlasti" : shipment.status;
        counts[status] = (counts[status] || 0) + 1;
        return counts;
      },
      { Yuklemede: 0, Yolda: 0, AdreseUlasti: 0 },
    );
    const productSummary = salesRecords.reduce((summary, sale) => {
      (sale.items || []).forEach((item) => {
        const key = `${item.olive_type} / ${item.size}`;
        summary[key] = (summary[key] || 0) + Number(item.quantity_kg || 0);
      });
      (sale.oil_items || []).forEach((item) => {
        summary["Zeytinyağı"] = (summary["Zeytinyağı"] || 0) + Number(item.liters || 0);
      });
      return summary;
    }, {});
    const topProducts = Object.entries(productSummary).sort(
      (first, second) => second[1] - first[1],
    );
    const recentSales = [...salesRecords]
      .sort((first, second) => new Date(second.sale_date) - new Date(first.sale_date))
      .slice(0, 8);

    return (
      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Satış analizi</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Satış Raporu</h2>
            <p className="mt-2 text-sm text-slate-500">Tüccar, tahsilat, ürün ve gönderim durumunu tek ekranda izleyin.</p>
          </div>
          <button type="button" onClick={exportSalesReport} className="rounded-xl bg-[#0b1f3a] px-4 py-2 text-sm font-semibold text-white">Satış CSV indir</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Toplam satış", `₺${totalSales.toFixed(2)}`, "bg-blue-50 text-blue-800"],
            ["Tahsil edilen", `₺${totalCollected.toFixed(2)}`, "bg-emerald-50 text-emerald-800"],
            ["Kalan bakiye", `₺${totalRemaining.toFixed(2)}`, "bg-amber-50 text-amber-800"],
            ["Satış adedi", `${salesRecords.length}`, "bg-violet-50 text-violet-800"],
          ].map(([label, value, accent]) => (
            <div key={label} className={`rounded-3xl border border-white p-5 shadow-sm ${accent}`}>
              <p className="text-sm font-medium">{label}</p>
              <p className="mt-2 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold">Gönderim durumu</h3>
            <div className="mt-4 space-y-3">
              {[['Yuklemede', 'Yüklemede', 'bg-amber-500'], ['Yolda', 'Yolda', 'bg-blue-600'], ['AdreseUlasti', 'Adrese ulaştı', 'bg-emerald-600']].map(([key, label, color]) => (
                <div key={key} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm">
                  <span className="flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${color}`} />{label}</span>
                  <strong>{shipmentCounts[key]}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold">Ürün hareketi</h3>
            <div className="mt-4 grid max-h-56 gap-2 overflow-y-auto pr-2 sm:grid-cols-2">
              {topProducts.map(([product, quantity]) => (
                <div key={product} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span>{product}</span><strong>{quantity.toFixed(2)} {product === "Zeytinyağı" ? "L" : "KG"}</strong></div>
              ))}
              {!topProducts.length && <p className="text-sm text-slate-500">Henüz ürün satışı yok.</p>}
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold">Son satışlar</h3><span className="text-sm text-slate-500">Son 8 kayıt</span></div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600"><tr><th className="px-3 py-2">Tarih</th><th className="px-3 py-2">Tüccar</th><th className="px-3 py-2">Satış</th><th className="px-3 py-2">Tutar</th><th className="px-3 py-2">Kalan</th></tr></thead>
              <tbody>{recentSales.map((sale) => <tr key={sale.id} className="border-t border-slate-100"><td className="px-3 py-3">{formatTurkishDate(sale.sale_date)}</td><td className="px-3 py-3 font-medium">{sale.party?.name || "-"}</td><td className="px-3 py-3">#{sale.sale_no}</td><td className="px-3 py-3">₺{Number(sale.total_amount || 0).toFixed(2)}</td><td className="px-3 py-3 text-amber-700">₺{Number(sale.remaining_amount || 0).toFixed(2)}</td></tr>)}</tbody>
            </table>
          </div>
          {!recentSales.length && <p className="mt-4 text-sm text-slate-500">Henüz satış kaydı yok.</p>}
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Kayıt Arşivi</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">Satış Geçmişi</h3>
            </div>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              {filteredSalesHistory.length} / {salesRecords.length} kayıt
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="text-sm text-slate-600">
              Tarih
              <input
                type="text"
                inputMode="numeric"
                placeholder="gg.aa.yyyy"
                value={salesHistoryDateInput}
                onChange={handleSalesHistoryDateInputChange}
                onBlur={() => setSalesHistoryDateInput(formatDateInput(salesHistoryFilters.date))}
                maxLength="10"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-600">
              Tüccar
              <select
                value={salesHistoryFilters.party}
                onChange={(event) => setSalesHistoryFilters((prev) => ({ ...prev, party: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <option value="">Tüm tüccarlar</option>
                {merchantParties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Tüccar türü
              <select
                value={salesHistoryFilters.partyType}
                onChange={(event) => setSalesHistoryFilters((prev) => ({ ...prev, partyType: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <option value="">Tümü</option>
                <option value="individual">Bireysel</option>
                <option value="corporate">Kurumsal</option>
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Ödeme durumu
              <select
                value={salesHistoryFilters.paymentStatus}
                onChange={(event) => setSalesHistoryFilters((prev) => ({ ...prev, paymentStatus: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <option value="">Tümü</option>
                <option value="paid">Tamamı ödendi</option>
                <option value="pending">Kalan bakiye var</option>
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Satış numarası
              <input
                type="number"
                min="0"
                value={salesHistoryFilters.saleNo}
                onChange={(event) => setSalesHistoryFilters((prev) => ({ ...prev, saleNo: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                placeholder="Tümü"
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setSalesHistoryFilters({ date: "", party: "", partyType: "", paymentStatus: "", saleNo: "" });
                setSalesHistoryDateInput("");
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Filtreleri temizle
            </button>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">Tüccar</th>
                  <th className="px-4 py-3">Tür / Satış</th>
                  <th className="px-4 py-3">Ürünler</th>
                  <th className="px-4 py-3">Toplam</th>
                  <th className="px-4 py-3">Tahsil edilen</th>
                  <th className="px-4 py-3">Kalan</th>
                  <th className="px-4 py-3">Gönderim</th>
                </tr>
              </thead>
              <tbody>
                {filteredSalesHistory.map((sale) => {
                  const shipment = shipments.find((item) => item.sale?.id === sale.id);
                  const products = [
                    ...(sale.items || []).map((item) => `${item.olive_type}/${item.size}: ${Number(item.quantity_kg || 0).toFixed(2)} KG`),
                    ...(sale.oil_items || []).map((item) => `Zeytinyağı: ${Number(item.liters || 0).toFixed(2)} L`),
                  ];
                  return (
                    <tr key={sale.id} className="border-t border-slate-200">
                      <td className="px-4 py-3 text-slate-600">{formatDateInput(sale.sale_date)}</td>
                      <td className="px-4 py-3"><span className="font-medium text-slate-800">{sale.party?.name || "-"}</span><br /><span className="text-xs text-slate-500">{sale.party?.phone || "Telefon yok"}</span></td>
                      <td className="px-4 py-3 text-slate-600">{sale.party?.party_type === "corporate" ? "Kurumsal" : "Bireysel"}<br />#{sale.sale_no}</td>
                      <td className="max-w-xs px-4 py-3 text-xs text-slate-600">{products.join(" • ") || "Ürün bilgisi yok"}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">₺{Number(sale.total_amount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-emerald-700">₺{Number(sale.total_paid || sale.paid_amount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 font-semibold text-amber-700">₺{Number(sale.remaining_amount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-600">{shipment?.status === "Vardi" ? "Adrese ulaştı" : shipment?.status || "Gönderim yok"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filteredSalesHistory.length && <p className="py-8 text-center text-sm text-slate-500">Filtrelere uyan satış kaydı bulunamadı.</p>}
          </div>
        </div>
      </section>
    );
  };

  const renderMerchantParties = () => {
    const searchTerm = merchantSearch.trim().toLocaleLowerCase("tr-TR");
    const filteredParties = merchantParties.filter((party) =>
      [party.name, party.phone, party.address].some((value) =>
        String(value || "").toLocaleLowerCase("tr-TR").includes(searchTerm),
      ),
    );
    const individualParties = filteredParties.filter(
      (party) => party.party_type === "individual",
    );
    const corporateParties = filteredParties.filter(
      (party) => party.party_type === "corporate",
    );
    const selectedParty = merchantParties.find(
      (party) => party.id === selectedMerchantPartyId,
    );
    const selectedPartySales = selectedParty
      ? salesRecords.filter((sale) => sale.party?.id === selectedParty.id)
      : [];
    const productSummary = selectedPartySales.reduce(
      (summary, sale) => {
        (sale.items || []).forEach((item) => {
          const key = `${item.olive_type} / ${item.size}`;
          summary[key] = (summary[key] || 0) + Number(item.quantity_kg || 0);
        });
        (sale.oil_items || []).forEach((item) => {
          summary["Zeytinyağı"] =
            (summary["Zeytinyağı"] || 0) + Number(item.liters || 0);
        });
        return summary;
      },
      {},
    );
    const partyList = (title, parties, accent) => (
      <div className={`rounded-3xl border p-5 shadow-sm ${accent}`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{title}</h2>
          <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-semibold">
            {parties.length} kayıt
          </span>
        </div>
        <div className="mt-4 grid max-h-[360px] grid-cols-1 gap-3 overflow-y-auto pr-2 sm:grid-cols-2">
          {parties.length ? (
            parties.map((party) => {
              const salesCount = salesRecords.filter(
                (sale) => sale.party?.id === party.id,
              ).length;
              return (
                <button
                  key={party.id}
                  type="button"
                  onClick={() => {
                    setSelectedMerchantPartyId(party.id);
                    setMerchantPaymentForm({
                      saleId: "",
                      paymentDate: getTodayDate(),
                      amount: "",
                      note: "",
                    });
                  }}
                  className="w-full rounded-2xl border border-white/80 bg-white/85 p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{party.name}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {party.phone || "Telefon yok"}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      {salesCount} satış
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {party.address || "Adres girilmemiş"}
                  </p>
                </button>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">Henüz kayıt bulunmuyor.</p>
          )}
        </div>
      </div>
    );
    return (
      <section className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Satış müşterileri
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Tüccarlar</h2>
          <p className="mt-2 text-sm text-slate-500">
            Satış kaydı oluşturulduğunda tüccar bu listelere otomatik eklenir.
          </p>
          <div className="mt-4 max-w-xl">
            <input
              value={merchantSearch}
              onChange={(event) => setMerchantSearch(event.target.value)}
              placeholder="İsim, telefon veya adres ara"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-blue-400"
            />
          </div>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          {partyList("Bireysel", individualParties, "border-sky-200 bg-sky-50")}
          {partyList("Kurumsal", corporateParties, "border-amber-200 bg-amber-50")}
        </div>
        {selectedParty && (
          <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
                  Müşteri detayları
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">{selectedParty.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{selectedParty.phone} • {selectedParty.address || "Adres girilmemiş"}</p>
              </div>
              <button type="button" onClick={() => setSelectedMerchantPartyId(null)} className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold">Kapat</button>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-white p-4"><span className="text-sm text-slate-500">Satış sayısı</span><strong className="mt-1 block text-2xl">{selectedPartySales.length}</strong></div>
              <div className="rounded-2xl bg-white p-4"><span className="text-sm text-slate-500">Toplam tutar</span><strong className="mt-1 block text-2xl">₺{selectedPartySales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0).toFixed(2)}</strong></div>
              <div className="rounded-2xl bg-white p-4"><span className="text-sm text-slate-500">Kalan ödeme</span><strong className="mt-1 block text-2xl">₺{selectedPartySales.reduce((sum, sale) => sum + Number(sale.remaining_amount || 0), 0).toFixed(2)}</strong></div>
            </div>
            <form onSubmit={handleMerchantPaymentSave} className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900">Ödeme yap</h3>
                  <p className="mt-1 text-sm text-slate-600">Ödeme seçilen satışın kalan tutarından düşülür.</p>
                </div>
                <strong className="text-emerald-700">Toplam kalan: ₺{selectedPartySales.reduce((sum, sale) => sum + Number(sale.remaining_amount || 0), 0).toFixed(2)}</strong>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <label className="text-sm font-medium text-slate-700 md:col-span-2">
                  Satış
                  <select
                    value={merchantPaymentForm.saleId}
                    onChange={(event) => {
                      const sale = selectedPartySales.find((item) => String(item.id) === event.target.value);
                      setMerchantPaymentForm((previous) => ({
                        ...previous,
                        saleId: event.target.value,
                        amount: sale?.remaining_amount > 0 ? String(sale.remaining_amount) : "",
                      }));
                    }}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                    required
                  >
                    <option value="">Satış seçin</option>
                    {selectedPartySales.map((sale) => (
                      <option key={sale.id} value={sale.id} disabled={Number(sale.remaining_amount || 0) <= 0}>
                        #{sale.sale_no} • Kalan ₺{Number(sale.remaining_amount || 0).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Tarih
                  <input type="date" value={merchantPaymentForm.paymentDate} onChange={(event) => setMerchantPaymentForm((previous) => ({ ...previous, paymentDate: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" required />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Tutar
                  <input
                    type="number"
                    min="0.01"
                    max={Number(salesRecords.find((sale) => String(sale.id) === String(merchantPaymentForm.saleId))?.remaining_amount || 0)}
                    step="0.01"
                    value={merchantPaymentForm.amount}
                    onChange={(event) => setMerchantPaymentForm((previous) => ({ ...previous, amount: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                    required
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <input value={merchantPaymentForm.note} onChange={(event) => setMerchantPaymentForm((previous) => ({ ...previous, note: event.target.value }))} placeholder="Not (isteğe bağlı)" className="min-w-[240px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                <button type="submit" disabled={!merchantPaymentForm.saleId} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Ödemeyi kaydet</button>
              </div>
            </form>
            <div className="mt-5 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-2xl bg-white p-4">
                <h3 className="font-bold">Ürün özeti</h3>
                <div className="mt-3 space-y-2">
                  {Object.entries(productSummary).map(([product, quantity]) => (
                    <div key={product} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm"><span>{product}</span><strong>{quantity.toFixed(2)} {product === "Zeytinyağı" ? "L" : "KG"}</strong></div>
                  ))}
                  {!Object.keys(productSummary).length && <p className="text-sm text-slate-500">Henüz ürün kaydı yok.</p>}
                </div>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <h3 className="font-bold">Satış geçmişi</h3>
                <div className="mt-3 space-y-3">
                  {selectedPartySales.map((sale) => (
                    <div key={sale.id} className="rounded-xl border border-slate-100 p-3">
                      <div className="flex justify-between gap-2 text-sm"><strong>Satış #{sale.sale_no}</strong><span>{formatTurkishDate(sale.sale_date)}</span></div>
                      <p className="mt-1 text-sm text-slate-600">Toplam ₺{Number(sale.total_amount || 0).toFixed(2)} • Kalan ₺{Number(sale.remaining_amount || 0).toFixed(2)}</p>
                      {(sale.payments || []).length > 0 && (
                        <div className="mt-2 space-y-2">
                          {[...(sale.payments || [])].map((payment) => (
                            <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 px-2 py-2 text-xs text-emerald-800">
                              <span>{payment.payment_date} • Ödenen ₺{Number(payment.amount || 0).toFixed(2)}</span>
                              <button
                                type="button"
                                onClick={() => printPaymentReceipt({
                                  title: "Satış Ödeme Fişi",
                                  name: selectedParty.name,
                                  phone: selectedParty.phone,
                                  paymentDate: payment.payment_date,
                                  paidAmount: payment.amount,
                                  remainingAmount: getSalesPaymentRemaining(sale, payment),
                                  reference: `Satış #${sale.sale_no}`,
                                  note: payment.note,
                                })}
                                className="rounded-lg border border-emerald-200 bg-white px-2 py-1 font-semibold text-emerald-700 hover:bg-emerald-100"
                              >
                                Ödeme fişi kes
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="mt-2 text-xs text-slate-500">{[...(sale.items || []).map((item) => `${item.olive_type} / ${item.size}: ${Number(item.quantity_kg || 0).toFixed(2)} KG`), ...(sale.oil_items || []).map((item) => `Zeytinyağı: ${Number(item.liters || 0).toFixed(2)} L`)].join(" • ") || "Ürün bilgisi yok"}</p>
                    </div>
                  ))}
                  {!selectedPartySales.length && <p className="text-sm text-slate-500">Bu müşteriye ait satış yok.</p>}
                </div>
              </div>
            </div>
          </section>
        )}
      </section>
    );
  };

  const renderShipmentRecords = () => {
    const corporateSales = salesRecords.filter((sale) => sale.party?.party_type === "corporate");
    const selectedShipmentSale = shipmentForm
      ? salesRecords.find((sale) => sale.id === shipmentForm.saleId)
      : null;
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <h2 className="text-2xl font-bold">Kurumsal satışlar</h2>
          <p className="mt-1 text-sm text-slate-500">Gönderim oluşturmak için bir satış seçin.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {corporateSales.map((sale) => {
              const shipment = shipments.find((item) => item.sale?.id === sale.id);
              return (
                <button
                  key={sale.id}
                  type="button"
                  onClick={() => startShipment(sale)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-400 hover:bg-blue-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong>{sale.party.name}</strong>
                    <span className="text-xs text-slate-500">#{sale.sale_no}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{sale.party.address || "Firma adresi yok"}</p>
                  <p className="mt-3 text-sm font-semibold text-blue-700">
                    {shipment ? `Gönderim: ${shipment.status}` : "Gönderim oluştur"}
                  </p>
                </button>
              );
            })}
          </div>
          {!corporateSales.length && <p className="mt-4 text-sm text-slate-500">Henüz kurumsal satış kaydı yok.</p>}
        </div>

        {shipmentForm && selectedShipmentSale && (
          <form onSubmit={saveShipment} className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Gönderim düzenleme</p>
                <h2 className="mt-1 text-2xl font-bold">{selectedShipmentSale.party.name} • Satış #{selectedShipmentSale.sale_no}</h2>
              </div>
              <button type="button" onClick={() => setShipmentForm(null)} className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold">Kapat</button>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700 md:col-span-2">
                Gönderim adresi
                <input value={shipmentForm.deliveryAddress} onChange={(event) => setShipmentForm((previous) => ({ ...previous, deliveryAddress: event.target.value }))} className="mt-1 w-full rounded-xl border bg-white px-3 py-2" required />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Araç
                <select value={shipmentForm.vehicleId} onChange={(event) => { const vehicle = vehicles.find((item) => String(item.id) === event.target.value); setShipmentForm((previous) => ({ ...previous, vehicleId: event.target.value, driverId: vehicle?.driver ? String(vehicle.driver) : "" })); }} className="mt-1 w-full rounded-xl border bg-white px-3 py-2">
                  <option value="">Araç seçin</option>
                  {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate} {vehicle.driver_detail?.phone ? `• ${vehicle.driver_detail.phone}` : ""}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Şoför
                <select value={shipmentForm.driverId} onChange={(event) => setShipmentForm((previous) => ({ ...previous, driverId: event.target.value }))} className="mt-1 w-full rounded-xl border bg-white px-3 py-2">
                  <option value="">Şoför seçin</option>
                  {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.full_name} • {driver.phone || "Telefon yok"}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Gönderim durumu
                <select value={shipmentForm.status} onChange={(event) => setShipmentForm((previous) => ({ ...previous, status: event.target.value }))} className="mt-1 w-full rounded-xl border bg-white px-3 py-2">
                  <option value="Yuklemede">Yüklemede</option>
                  <option value="Yolda">Yolda</option>
                  <option value="Vardi">Vardı</option>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Not
                <input value={shipmentForm.note || ""} onChange={(event) => setShipmentForm((previous) => ({ ...previous, note: event.target.value }))} className="mt-1 w-full rounded-xl border bg-white px-3 py-2" />
              </label>
            </div>
            <div className="mt-5 rounded-2xl border border-blue-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">Araç yükü</h3>
                <button type="button" onClick={() => setShipmentForm((previous) => ({ ...previous, items: [...previous.items, { product_type: "olive", olive_type: "", size: 13, quantity: "", is_loaded: false }] }))} className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Ürün ekle</button>
              </div>
              <div className="mt-3 space-y-2">
                {shipmentForm.items.map((item, index) => (
                  <div key={`${item.id || "new"}-${index}`} className={`grid gap-2 rounded-xl p-2 md:grid-cols-[auto_140px_1fr_100px_130px_auto] ${item.is_loaded ? "bg-emerald-50" : "bg-slate-50"}`}>
                    <label className="flex items-center justify-center gap-1 text-xs font-semibold text-emerald-700" title="Yüklenen ürünü kilitle">
                      <input type="checkbox" checked={Boolean(item.is_loaded)} onChange={(event) => updateShipmentItem(index, "is_loaded", event.target.checked)} className="h-5 w-5 accent-emerald-600" />
                      <span className="hidden md:inline">Yüklendi</span>
                    </label>
                    <select disabled={item.is_loaded} value={item.product_type} onChange={(event) => updateShipmentItem(index, "product_type", event.target.value)} className="rounded-xl border px-3 py-2 disabled:bg-slate-100">
                      <option value="olive">Zeytin</option>
                      <option value="oil">Zeytinyağı</option>
                    </select>
                    {item.product_type === "olive" ? <input disabled={item.is_loaded} value={item.olive_type} onChange={(event) => updateShipmentItem(index, "olive_type", event.target.value)} placeholder="Zeytin cinsi" className="rounded-xl border px-3 py-2 disabled:bg-slate-100" required /> : <input value="Zeytinyağı" readOnly className="rounded-xl border bg-slate-50 px-3 py-2" />}
                    {item.product_type === "olive" ? <input disabled={item.is_loaded} type="number" min="1" value={item.size || ""} onChange={(event) => updateShipmentItem(index, "size", event.target.value)} placeholder="Numara" className="rounded-xl border px-3 py-2 disabled:bg-slate-100" required /> : <span className="hidden md:block" />}
                    <input disabled={item.is_loaded} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateShipmentItem(index, "quantity", event.target.value)} placeholder={item.product_type === "oil" ? "Litre" : "KG"} className="rounded-xl border px-3 py-2 disabled:bg-slate-100" required />
                    <button disabled={item.is_loaded} type="button" onClick={() => setShipmentForm((previous) => ({ ...previous, items: previous.items.filter((_, itemIndex) => itemIndex !== index) }))} className="rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 disabled:cursor-not-allowed disabled:text-slate-400">Sil</button>
                  </div>
                ))}
              </div>
            </div>
            <button type="submit" className="mt-5 rounded-xl bg-[#0b1f3a] px-4 py-3 text-sm font-semibold text-white">Gönderimi kaydet</button>
          </form>
        )}

        <div className="space-y-3">
          {shipments.map((shipment) => (
            <article key={shipment.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">{shipment.party?.name} • Satış #{shipment.sale?.sale_no}</h3>
                  <p className="mt-1 text-sm text-slate-500">{shipment.delivery_address}</p>
                  <p className="mt-2 text-sm">Araç: <strong>{shipment.vehicle?.plate || "Atanmadı"}</strong> • Şoför: <strong>{shipment.driver?.full_name || "Atanmadı"}</strong> {shipment.driver?.phone ? `(${shipment.driver.phone})` : ""}</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800"><Truck className="h-4 w-4" />{shipment.status === "Yuklemede" ? "Yüklemede" : shipment.status === "Yolda" ? "Yolda" : "Teslimat adresine ulaştı"}</span>
              </div>
              <div className="mt-5 flex items-center gap-2">
                {["Yuklemede", "Yolda", "AdreseUlasti"].map((status, index) => {
                  const currentIndex = shipment.status === "Vardi" ? 2 : ["Yuklemede", "Yolda", "AdreseUlasti"].indexOf(shipment.status);
                  const complete = index <= currentIndex;
                  return (
                    <div key={status} className="flex flex-1 items-center gap-2">
                      <span className={`h-3 w-3 shrink-0 rounded-full ${complete ? "bg-blue-700" : "bg-slate-300"}`} />
                      <span className={`text-xs font-semibold ${complete ? "text-blue-800" : "text-slate-400"}`}>{status === "Yuklemede" ? "Yüklemede" : status === "Yolda" ? "Yolda" : "Adrese ulaştı"}</span>
                      {index < 2 && <span className={`h-0.5 flex-1 ${index < currentIndex ? "bg-blue-700" : "bg-slate-300"}`} />}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                {(shipment.items || []).map((item) => <span key={item.id} className="rounded-full bg-slate-100 px-3 py-1">{item.product_type === "oil" ? `Zeytinyağı ${item.quantity} L` : `${item.olive_type} / ${item.size}: ${item.quantity} KG`}</span>)}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => startShipment(salesRecords.find((sale) => sale.id === shipment.sale?.id))} className="rounded-xl border px-3 py-2 text-sm font-semibold">Düzenle</button>
                {shipment.status === "Yuklemede" && <button type="button" onClick={() => sendShipmentWhatsApp(shipment, "company", "Yolda")} className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-semibold text-white">Firmaya: Yola çıktı</button>}
                {shipment.status === "Yolda" && <button type="button" onClick={() => sendShipmentWhatsApp(shipment, "company", "AdreseUlasti")} className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-semibold text-white">Firmaya: Teslimat adresine ulaştı</button>}
                <button type="button" onClick={() => sendShipmentWhatsApp(shipment, "driver", "Yuklemede")} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"><Truck className="mr-1 inline h-4 w-4" />Şoföre: Araç yüklendi</button>
              </div>
            </article>
          ))}
          {!shipments.length && <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">Henüz gönderim kaydı yok.</p>}
        </div>
      </section>
    );
  };

  /* Satışa zeytinyağı ekleme ve litre stok kontrolü */
  const renderSalesOilPanel = () => {
    const oilPrice = Number(salesOilPrices[0]?.unit_price || 0);
    const remainingOil = Math.max(
      totalProducedOilLiters - totalSoldOilLiters,
      0,
    );
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={sellOliveOil}
            onChange={(event) => setSellOliveOil(event.target.checked)}
            className="h-4 w-4"
          />
          <h3 className="font-bold text-emerald-900">Zeytinyağı ekle</h3>
        </div>
        <p className="mt-1 text-sm text-emerald-800">
          Kalan zeytinyağı: <strong>{remainingOil.toFixed(2)} litre</strong> •
          Litre fiyatı: <strong>₺{oilPrice.toFixed(2)}</strong>
        </p>
        {sellOliveOil && (
          <input
            type="number"
            min="0.01"
            max={remainingOil}
            step="0.01"
            value={saleOilLiters}
            onChange={(event) => setSaleOilLiters(event.target.value)}
            placeholder="Satılacak litre"
            className="mt-3 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2"
          />
        )}
      </div>
    );
  };

  /* Üretim tarafının genel durum ekranı */
  const renderOverview = () => (
    <>
      <section className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={async () => {
            setIsRefreshing(true);
            await refreshData();
            setIsRefreshing(false);
          }}
          className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100"
        >
          {isRefreshing ? "Yenileniyor..." : "Veriyi Yenile"}
        </button>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-blue-50 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-medium text-slate-500">Kayıt Sayısı</p>
          <p className="mt-3 text-3xl font-bold text-blue-900">
            {totals.recordsCount}
          </p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
          <p className="text-sm text-sky-700">Zeytinyağı Kayıt Sayısı</p>
          <p className="mt-2 text-3xl font-bold text-sky-900">
            {totals.oilRecordsCount}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl bg-amber-50 p-2 text-amber-700">
              <span className="block font-semibold">Beklemede</span>
              <strong className="text-lg">
                {totals.processCounts.Beklemede}
              </strong>
            </div>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
              <span className="block font-semibold">Sıkımda</span>
              <strong className="text-lg">
                {totals.processCounts["Sıkımda"]}
              </strong>
            </div>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
              <span className="block font-semibold">Tamamlanan</span>
              <strong className="text-lg">
                {totals.processCounts["İşlem Tamam"]}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-2 text-slate-700">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Factory className="h-4 w-4" />
            </span>
            <h3 className="text-xl font-bold">Elek Yönetimi</h3>
          </div>
          <div className="space-y-3">
            {stationSummary.map((station) => {
              const assignedPeople = station.responsible_persons || [];
              return (
                <div
                  key={station.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {station.name}
                      </p>
                      {assignedPeople.map((person) => (
                        <p key={person.id} className="text-sm text-slate-500">
                          Sorumlu: {person.full_name} • {person.phone}
                        </p>
                      ))}
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                      {station.recordCount} kayıt
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Toplam: ₺{station.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>
                        Toplam KG: {station.totalWeight.toFixed(2)} kg
                      </span>
                      <span>
                        Komisyon: ₺{station.commissionAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-2 text-slate-700">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Wallet className="h-4 w-4" />
            </span>
            <h3 className="text-xl font-bold">Fiyat Yönetimi</h3>
          </div>
          <div className="space-y-4">
            {prices.map((price) => (
              <div
                key={price.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  {editPriceId === price.id ? (
                    <input
                      value={price.olive_type}
                      onChange={(event) =>
                        setPrices((prev) =>
                          prev.map((item) =>
                            item.id === price.id
                              ? { ...item, olive_type: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                    />
                  ) : (
                    <span className="font-semibold text-slate-800">
                      {price.olive_type}
                    </span>
                  )}
                  {editPriceId === price.id ? (
                    <div className="ml-2 flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => handlePriceSave(price)}
                        className="rounded-xl bg-blue-700 px-2 py-1 text-[10px] font-semibold text-white hover:bg-blue-800"
                      >
                        Kaydet
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditPriceId(null);
                          refreshData();
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700"
                      >
                        İptal
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePriceDelete(price)}
                        className="rounded-xl bg-rose-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-rose-700"
                      >
                        Sil
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditPriceId(price.id)}
                      className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Düzenle
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {[11, 12, 13, 14, 15, 16, 17].map((size) => (
                    <label
                      key={`${price.id}-${size}`}
                      className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500"
                    >
                      {size}
                      {editPriceId === price.id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={price[`size_${size}`] ?? 0}
                          onChange={(event) => {
                            const next = event.target.value;
                            setPrices((prev) =>
                              prev.map((item) =>
                                item.id === price.id
                                  ? { ...item, [`size_${size}`]: next }
                                  : item,
                              ),
                            );
                          }}
                          className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-2 py-2 text-right text-sm text-slate-800"
                        />
                      ) : (
                        <span className="mt-1 block rounded-lg border border-slate-200 bg-slate-100 px-2 py-2 text-right text-sm text-slate-800">
                          {formatPrice(price[`size_${size}`])}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <form
              onSubmit={handleCreateOlivePrice}
              className="rounded-2xl border border-dashed border-blue-300 bg-blue-50 p-3"
            >
              <label className="block text-sm font-semibold text-blue-800">
                Yeni zeytin cinsi
                <input
                  value={newOliveTypeName}
                  onChange={(event) => setNewOliveTypeName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-blue-500"
                  placeholder="Örn. Ayvalık"
                />
              </label>
              <button
                type="submit"
                className="mt-3 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Yeni Zeytin Cinsi Ekle
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );

  /* Üretici listesi, bakiye ve müşteri detay ekranı */
  const renderCustomers = () => {
    const customerSummaries = customers.length
      ? customers.map((customer) => {
          const customerRecords = records.filter(
            (record) =>
              String(record.customer || "")
                .trim()
                .toLowerCase() ===
              String(customer.full_name || "")
                .trim()
                .toLowerCase(),
          );
          const totalPurchases = customerRecords.reduce(
            (sum, record) => sum + Number(record.total_amount || 0),
            0,
          );
          const totalPaid = customerRecords.reduce(
            (sum, record) => sum + Number(record.total_paid || 0),
            0,
          );
          const totalWeight = customerRecords.reduce(
            (sum, record) => sum + Number(record.total_weight || 0),
            0,
          );
          const totalOil = customerRecords.reduce(
            (sum, record) => sum + Number(record.total_oil_amount || 0),
            0,
          );
          const history = [...customerRecords].sort(
            (a, b) => new Date(b.date) - new Date(a.date),
          );

          return {
            ...customer,
            totalPurchases,
            totalPaid,
            remainingAmount: Math.max(totalPurchases - totalPaid, 0),
            totalWeight,
            totalOil,
            oilProcessStatus: customer.oil_process_status || "Beklemede",
            oilOutputLiters: Number(customer.oil_output_liters || 0),
            oilKgPerLiter: Number(customer.oil_kg_per_liter || 0),
            history,
          };
        })
      : records.reduce((accumulator, record) => {
          const existing = accumulator.find(
            (customer) =>
              String(customer.full_name || "")
                .trim()
                .toLowerCase() ===
              String(record.customer || "")
                .trim()
                .toLowerCase(),
          );

          if (existing) {
            existing.totalPurchases += Number(record.total_amount || 0);
            existing.totalPaid += Number(record.total_paid || 0);
            existing.remainingAmount = Math.max(
              existing.totalPurchases - existing.totalPaid,
              0,
            );
            existing.totalWeight += Number(record.total_weight || 0);
            existing.totalOil += Number(record.total_oil_amount || 0);
            existing.history.push(record);
            existing.history.sort(
              (a, b) => new Date(b.date) - new Date(a.date),
            );
            return accumulator;
          }

          const fallback = {
            id: `legacy-${record.customer}`,
            full_name: record.customer,
            phone: "",
            address: "",
            notes: "",
            totalPurchases: Number(record.total_amount || 0),
            totalPaid: Number(record.total_paid || 0),
            remainingAmount: Math.max(
              Number(record.total_amount || 0) - Number(record.total_paid || 0),
              0,
            ),
            totalWeight: Number(record.total_weight || 0),
            totalOil: Number(record.total_oil_amount || 0),
            oilProcessStatus: "Beklemede",
            oilOutputLiters: 0,
            oilKgPerLiter: 0,
            history: [record],
          };

          return [...accumulator, fallback];
        }, []);

    const normalizedSearch = customerSearch.trim().toLocaleLowerCase("tr-TR");
    const visibleCustomerSummaries = normalizedSearch
      ? customerSummaries.filter((customer) =>
          customer.full_name
            .toLocaleLowerCase("tr-TR")
            .includes(normalizedSearch),
        )
      : customerSummaries;
    const selectedCustomerSummary =
      customerSummaries.find(
        (customer) => String(customer.id) === String(selectedCustomerId),
      ) ||
      customerSummaries[0] ||
      null;
    const selectedCustomerMovements = selectedCustomerSummary?.history
      ? selectedCustomerSummary.history
          .flatMap((record) => {
            const payments = [...(record.payments || [])].sort(
              (first, second) =>
                new Date(first.payment_date) - new Date(second.payment_date) ||
                Number(first.id || 0) - Number(second.id || 0),
            );
            let paidBefore = Number(record.paid_amount || 0);
            const paymentMovements = payments.map((payment) => {
              paidBefore += Number(payment.amount || 0);
              return {
                id: `customer-payment-${payment.id}`,
                date: payment.payment_date,
                type: "Ödeme",
                amount: Number(payment.amount || 0),
                note: payment.note || `${record.customer} ödeme`,
                positive: false,
                isPayment: true,
                payment,
                record,
                remainingAfterPayment: Math.max(
                  Number(record.effective_payable_amount || record.total_amount || 0) -
                    paidBefore,
                  0,
                ),
              };
            });
            return [
              {
                id: `sale-${record.id}`,
                date: record.date,
                type: "Alım",
                amount: Number(record.total_amount || 0),
                note: `${record.customer} — ${record.sequence_no}. kayıt`,
                positive: true,
              },
              ...paymentMovements,
            ];
          })
          .sort((a, b) => new Date(b.date) - new Date(a.date))
      : [];

    return (
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2 text-slate-700">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Factory className="h-4 w-4" />
              </span>
              <h3 className="text-xl font-bold">Üretici Listesi</h3>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium text-slate-600">
                İsim ara
                <input
                  type="search"
                  value={customerSearch}
                  onChange={(event) => setCustomerSearch(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none transition focus:border-blue-400 focus:bg-white"
                  placeholder="Üretici adı yazın..."
                />
              </label>
            </div>
            <div className="max-h-[430px] space-y-3 overflow-y-auto pr-2">
              {visibleCustomerSummaries.length ? (
                visibleCustomerSummaries.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId(String(customer.id));
                      const firstRecord = customer.history[0];
                      if (firstRecord) {
                        setForm((prev) => ({
                          ...prev,
                          customer: customer.full_name,
                          customer_phone: customer.phone || "",
                          sequence_no: firstRecord.sequence_no,
                        }));
                      }
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition ${String(selectedCustomerId) === String(customer.id) ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-blue-300"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {customer.full_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {customer.phone || "Telefon yok"} •{" "}
                          {customer.history.length} işlem
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                        ₺{Number(customer.remainingAmount || 0).toFixed(2)}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Aramanızla eşleşen üretici bulunamadı.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <div className="mb-3 text-sm uppercase tracking-[0.2em] text-slate-500">
            Üretici Detayı
          </div>
          {selectedCustomerSummary ? (
            <div className="space-y-5">
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {selectedCustomerSummary.full_name}
                </p>
                <p className="text-sm text-slate-500">
                  {selectedCustomerSummary.phone || "Telefon belirtilmemiş"} •{" "}
                  {selectedCustomerSummary.address || "Adres belirtilmemiş"}
                </p>
              </div>

              {isEditingCustomer && (
                <form
                  onSubmit={handleCustomerSave}
                  className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                    Üretici düzenle
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-slate-500">Toplam alacağı</p>
                      <p className="mt-1 font-bold text-slate-900">
                        ₺
                        {Number(
                          selectedCustomerSummary.totalPurchases || 0,
                        ).toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-slate-500">Ödenen tutar</p>
                      <p className="mt-1 font-bold text-emerald-700">
                        ₺
                        {Number(selectedCustomerSummary.totalPaid || 0).toFixed(
                          2,
                        )}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-slate-500">İçerideki para</p>
                      <p className="mt-1 font-bold text-amber-700">
                        ₺
                        {Number(
                          selectedCustomerSummary.remainingAmount || 0,
                        ).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <label className="block text-sm font-medium text-slate-700">
                    Ad Soyad
                    <input
                      value={customerForm.full_name}
                      onChange={(event) =>
                        setCustomerForm((prev) => ({
                          ...prev,
                          full_name: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Telefon
                    <input
                      value={customerForm.phone}
                      onChange={(event) =>
                        setCustomerForm((prev) => ({
                          ...prev,
                          phone: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                      placeholder="05xxxxxxxxx"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Adres
                    <input
                      value={customerForm.address}
                      onChange={(event) =>
                        setCustomerForm((prev) => ({
                          ...prev,
                          address: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                      placeholder="Adres"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Not
                    <textarea
                      value={customerForm.notes}
                      onChange={(event) =>
                        setCustomerForm((prev) => ({
                          ...prev,
                          notes: event.target.value,
                        }))
                      }
                      className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                      placeholder="Not..."
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Yağlık işlem durumu
                    <select
                      value={customerForm.oil_process_status}
                      onChange={(event) =>
                        setCustomerForm((prev) => ({
                          ...prev,
                          oil_process_status: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                    >
                      {oilProcessSteps.map((step) => (
                        <option key={step} value={step}>
                          {step}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Elde edilen zeytinyağı (litre)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={customerForm.oil_output_liters}
                      onChange={(event) =>
                        setCustomerForm((prev) => ({
                          ...prev,
                          oil_output_liters: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                      placeholder="Örn. 120"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Ek ödeme
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={customerForm.payment_amount}
                      onChange={(event) =>
                        setCustomerForm((prev) => ({
                          ...prev,
                          payment_amount: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                      placeholder="Örn. 500"
                    />
                    <span className="mt-1 block text-xs font-normal text-slate-500">
                      Girilen tutar içerideki paradan düşülür.
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="rounded-xl bg-[#0b1f3a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#123d73]"
                    >
                      {editCustomerId ? "Güncelle" : "Kaydet"}
                    </button>
                    <button
                      type="button"
                      onClick={resetCustomerForm}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      İptal
                    </button>
                    {isEditingCustomer && (
                      <button
                        type="button"
                        onClick={() =>
                          handleCustomerDelete({
                            ...selectedCustomerSummary,
                            id: editCustomerId,
                          })
                        }
                        className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                      >
                        Üreticiyi Sil
                      </button>
                    )}
                  </div>
                </form>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    İçerideki para
                  </p>
                  <p className="mt-2 text-xl font-bold text-slate-900">
                    ₺
                    {Number(
                      selectedCustomerSummary.remainingAmount || 0,
                    ).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-blue-700">
                    Toplam yağlık
                  </p>
                  <p className="mt-2 text-xl font-bold text-blue-900">
                    {Number(selectedCustomerSummary.totalOil || 0).toFixed(2)}{" "}
                    kg
                  </p>
                </div>
                <div className="rounded-2xl bg-violet-50 p-4 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-violet-700">
                    Toplam teslim edilen KG
                  </p>
                  <p className="mt-2 text-xl font-bold text-violet-900">
                    {Number(selectedCustomerSummary.totalWeight || 0).toFixed(
                      2,
                    )}{" "}
                    kg
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                  Not
                </p>
                <p className="text-sm leading-6 text-slate-700">
                  {selectedCustomerSummary.notes || "Not eklenmemiş."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  İçerideki para
                </p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  ₺
                  {Number(selectedCustomerSummary.remainingAmount || 0).toFixed(
                    2,
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-lg font-bold text-slate-900">
                    Yağlık üretim durumu
                  </h4>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                    {selectedCustomerSummary.oilProcessStatus}
                  </span>
                </div>
                <div className="mt-5 flex items-start">
                  {oilProcessSteps.map((step, index) => {
                    const currentIndex = oilProcessSteps.indexOf(
                      selectedCustomerSummary.oilProcessStatus,
                    );
                    const complete = index <= currentIndex;
                    return (
                      <div key={step} className="flex flex-1 items-start">
                        <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${complete ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-500"}`}
                          >
                            {index + 1}
                          </span>
                          <span className="mt-2 text-xs font-medium text-slate-600">
                            {step}
                          </span>
                        </div>
                        {index < oilProcessSteps.length - 1 && (
                          <span
                            className={`mt-4 h-0.5 flex-1 ${index < currentIndex ? "bg-blue-700" : "bg-slate-200"}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs text-slate-500">Zeytinyağı çıktısı</p>
                    <p className="mt-1 font-bold text-slate-900">
                      {Number(
                        selectedCustomerSummary.oilOutputLiters || 0,
                      ).toFixed(2)}{" "}
                      litre
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs text-slate-500">
                      1 litre için gereken yağlık
                    </p>
                    <p className="mt-1 font-bold text-slate-900">
                      {selectedCustomerSummary.oilKgPerLiter
                        ? `${Number(selectedCustomerSummary.oilKgPerLiter).toFixed(2)} kg`
                        : "Henüz hesaplanmadı"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold text-slate-900">
                    Tüm hareketler
                  </h4>
                  <span className="text-xs text-slate-500">
                    {selectedCustomerMovements.length} kayıt
                  </span>
                </div>
                {selectedCustomerMovements.length ? (
                  selectedCustomerMovements.map((movement) => (
                    <div
                      key={movement.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-800">
                            {movement.type}
                          </p>
                          <p className="text-xs text-slate-500">
                            {movement.date} • {movement.note}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-semibold ${movement.positive ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}
                        >
                          {movement.positive ? "+" : "-"}₺
                          {Number(movement.amount || 0).toFixed(2)}
                        </span>
                      </div>
                      {movement.isPayment && (
                        <button
                          type="button"
                          onClick={() =>
                            printPaymentReceipt({
                              title: "Alış Ödeme Fişi",
                              name: selectedCustomerSummary.full_name,
                              phone: selectedCustomerSummary.phone,
                              paymentDate: movement.payment.payment_date,
                              paidAmount: movement.payment.amount,
                              remainingAmount: movement.remainingAfterPayment,
                              reference: `${movement.record.sequence_no}. alım kaydı`,
                              note: movement.payment.note,
                            })
                          }
                          className="mt-3 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          Ödeme fişi kes
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Hareket bulunmuyor.</p>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-lg font-bold text-slate-900">
                  WhatsApp gönderim geçmişi
                </h4>
                {selectedCustomerSummary.history.length ? (
                  selectedCustomerSummary.history.slice(0, 4).map((record) => (
                    <div
                      key={`${record.id}-wa`}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-800">
                            {record.date}
                          </p>
                          <p className="text-xs text-slate-500">
                            {record.customer}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-semibold ${record.whatsapp_status === "Bekliyor" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
                          >
                            {record.whatsapp_status === "Bekliyor"
                              ? "Bekliyor"
                              : "✓ Gönderildi"}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              sendWhatsApp(
                                record,
                                customers.find(
                                  (customer) =>
                                    customer.full_name === record.customer,
                                )?.phone,
                              )
                            }
                            className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                          >
                            Gönder
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500">
                        {record.whatsapp_sent_at
                          ? `Gönderim: ${new Date(record.whatsapp_sent_at).toLocaleString("tr-TR")}`
                          : "Henüz gönderim yapılmadı."}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    WhatsApp geçmişi bulunmuyor.
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCustomerEdit(selectedCustomerSummary)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Düzenle
                </button>
                {selectedCustomerSummary.history[0] && (
                  <button
                    type="button"
                    onClick={() =>
                      sendWhatsApp(
                        selectedCustomerSummary.history[0],
                        selectedCustomerSummary.phone,
                      )
                    }
                    className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    Üretim bilgisini WhatsApp ile gönder
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Üretici seçilmedi.</p>
          )}
        </div>
      </section>
    );
  };

  /* Günlük rapor ve eleme geçmişi ekranı */
  const renderReports = () => (
    <>
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between gap-3 text-slate-700">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <h3 className="text-xl font-bold">Günlük Rapor</h3>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">
                <span className="mr-2">Tarih</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="gg.aa.yyyy"
                  value={reportDateInput}
                  onChange={handleReportDateInputChange}
                  onBlur={() => setReportDateInput(formatDateInput(reportDate))}
                  maxLength="10"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                />
              </label>
              <button
                type="button"
                onClick={exportReport}
                className="rounded-xl bg-[#0b1f3a] px-3 py-2 text-sm font-semibold text-white hover:bg-[#122d4f]"
              >
                CSV Dışa Aktar
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {filteredDailyReport.length ? (
              filteredDailyReport.map((day) => (
                <div
                  key={day.date}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800">{day.date}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                    <div>
                      Toplam:{" "}
                      <span className="font-semibold text-slate-900">
                        ₺{day.totalAmount.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      Kayıt sayısı:{" "}
                      <span className="font-semibold text-slate-900">
                        {day.customerCount}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                Seçili tarihte kayıt bulunamadı.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-2 text-slate-700">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Wallet className="h-4 w-4" />
            </span>
            <h3 className="text-xl font-bold">Elek Özeti</h3>
          </div>
          <div className="space-y-3">
            {stationSummary.map((station) => (
              <div
                key={station.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800">{station.name}</p>
                  <span className="text-sm font-semibold text-blue-700">
                    ₺{station.totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  Kayıt sayısı: {station.recordCount}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
              Kayıt Arşivi
            </p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">
              Eleme Geçmişi
            </h3>
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            {filteredHistoryRecords.length} / {records.length} kayıt
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm text-slate-600">
            Tarih
            <input
              type="text"
              inputMode="numeric"
              placeholder="gg.aa.yyyy"
              value={historyDateInput}
              onChange={handleHistoryDateInputChange}
              maxLength="10"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-600">
            Üretici
            <select
              value={historyFilters.customer}
              onChange={(event) =>
                setHistoryFilters((prev) => ({
                  ...prev,
                  customer: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <option value="">Tüm üreticiler</option>
              {[...new Set(records.map((record) => record.customer))]
                .sort()
                .map((customer) => (
                  <option key={customer} value={customer}>
                    {customer}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Elek
            <select
              value={historyFilters.station}
              onChange={(event) =>
                setHistoryFilters((prev) => ({
                  ...prev,
                  station: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <option value="">Tüm elekler</option>
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Sorumlu
            <select
              value={historyFilters.responsible}
              onChange={(event) =>
                setHistoryFilters((prev) => ({
                  ...prev,
                  responsible: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <option value="">Tüm sorumlular</option>
              {responsiblePersons.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Zeytin cinsi
            <select
              value={historyFilters.oliveType}
              onChange={(event) =>
                setHistoryFilters((prev) => ({
                  ...prev,
                  oliveType: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <option value="">Tüm cinsler</option>
              {[
                ...new Set(
                  records.flatMap((record) =>
                    (record.items || []).map((item) => item.olive_type),
                  ),
                ),
              ]
                .sort()
                .map((oliveType) => (
                  <option key={oliveType} value={oliveType}>
                    {oliveType}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Sıra numarası
            <input
              type="number"
              min="0"
              value={historyFilters.sequence}
              onChange={(event) =>
                setHistoryFilters((prev) => ({
                  ...prev,
                  sequence: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              placeholder="Tümü"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setHistoryFilters({
                date: "",
                customer: "",
                station: "",
                responsible: "",
                oliveType: "",
                sequence: "",
              });
              setHistoryDateInput("");
            }}
            className="self-end rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Filtreleri temizle
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Üretici</th>
                <th className="px-4 py-3">Elek / Sorumlu</th>
                <th className="px-4 py-3">Zeytin cinsi</th>
                <th className="px-4 py-3">Sıra</th>
                <th className="px-4 py-3">Alış tutarı</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistoryRecords.map((record) => {
                const station = stations.find(
                  (item) => Number(item.id) === Number(record.sieve_station),
                );
                const responsiblePerson = responsiblePersons.find(
                  (person) =>
                    Number(person.id) === Number(record.responsible_person),
                );
                return (
                  <tr key={record.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateInput(record.date)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {record.customer}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {station?.name || "Elek"}
                      <br />
                      <span className="text-xs text-slate-400">
                        {responsiblePerson?.full_name || "Sorumlu yok"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {(record.items || [])
                        .map((item) => item.olive_type)
                        .filter(
                          (value, index, values) =>
                            values.indexOf(value) === index,
                        )
                        .join(", ") || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      #{record.sequence_no}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      ₺{Number(record.total_amount || 0).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filteredHistoryRecords.length && (
            <p className="py-8 text-center text-sm text-slate-500">
              Filtrelere uyan eleme kaydı bulunamadı.
            </p>
          )}
        </div>
      </section>
    </>
  );

  /* Kullanıcı ve yetki yönetimi ekranı */
  const renderUsers = () => (
    <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
          Yetkili kullanıcı
        </p>
        <h3 className="mt-1 text-xl font-bold text-slate-900">
          {editUserId ? "Kullanıcı düzenle" : "Kullanıcı oluştur"}
        </h3>
        <form onSubmit={handleUserSave} className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Kullanıcı adı
            <input
              value={userForm.username}
              onChange={(event) =>
                setUserForm((prev) => ({
                  ...prev,
                  username: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Şifre{" "}
            {editUserId && (
              <span className="text-xs font-normal text-slate-500">
                (değiştirmek istemiyorsanız boş bırakın)
              </span>
            )}
            <input
              type="password"
              value={userForm.password}
              onChange={(event) =>
                setUserForm((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              required={!editUserId}
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Ad
              <input
                value={userForm.first_name}
                onChange={(event) =>
                  setUserForm((prev) => ({
                    ...prev,
                    first_name: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Soyad
              <input
                value={userForm.last_name}
                onChange={(event) =>
                  setUserForm((prev) => ({
                    ...prev,
                    last_name: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              />
            </label>
          </div>
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            {[
              ["can_manage_purchases", "Alış işlemlerini yapabilir"],
              ["can_manage_sales", "Satış işlemlerini yapabilir"],
              ["can_manage_users", "Kullanıcı oluşturma ve düzenleme"],
            ].map(([field, label]) => (
              <label key={field} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={userForm[field]}
                  onChange={(event) =>
                    setUserForm((prev) => ({
                      ...prev,
                      [field]: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                {label}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-[#0b1f3a] px-4 py-2 text-sm font-semibold text-white"
            >
              {editUserId ? "Güncelle" : "Kullanıcı oluştur"}
            </button>
            {editUserId && (
              <button
                type="button"
                onClick={resetUserForm}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                İptal
              </button>
            )}
          </div>
        </form>
      </div>
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <h3 className="text-xl font-bold text-slate-900">Kullanıcılar</h3>
        <div className="mt-4 space-y-3">
          {users.map((user) => {
            const isProtectedSuperuser = user.is_superuser;
            return (
              <div
                key={user.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {user.username}
                    </p>
                    <p className="text-xs text-slate-500">
                      {user.first_name} {user.last_name}
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                    {isProtectedSuperuser
                      ? "Korunan superuser"
                      : user.is_active
                        ? "Aktif"
                        : "Pasif"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  {user.can_manage_purchases ? "Alış işlemleri" : ""} {" "}
                  {user.can_manage_sales ? "• Satış işlemleri" : ""} {" "}
                  {user.can_manage_users ? "• Kullanıcı yönetimi ve tam erişim" : ""}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleUserEdit(user)}
                    disabled={isProtectedSuperuser}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isProtectedSuperuser ? "Korunan hesap" : "Düzenle"}
                  </button>
                  {user.id !== currentUser?.id && !isProtectedSuperuser && (
                    <button
                      type="button"
                      onClick={() => handleUserDelete(user)}
                      className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Sil
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );

  /* Elek, personel, fiyat ve ödeme yönetimi ekranı */
  const renderManagement = () => {
    const oliveKgSummary = records.reduce((summary, record) => {
      (record.items || []).forEach((item) => {
        if (!summary[item.olive_type])
          summary[item.olive_type] = Object.fromEntries(
            sizeKeys.map((size) => [size, 0]),
          );
        sizeKeys.forEach((size) => {
          summary[item.olive_type][size] += Number(item[`size_${size}`] || 0);
        });
      });
      return summary;
    }, {});
    const pendingProducers = Object.values(
      records.reduce((summary, record) => {
        const producerName = String(record.customer || "").trim();
        if (!producerName) return summary;
        if (!summary[producerName])
          summary[producerName] = { name: producerName, amount: 0 };
        summary[producerName].amount += Number(record.remaining_amount || 0);
        return summary;
      }, {}),
    )
      .filter((producer) => producer.amount > 0)
      .sort((first, second) => second.amount - first.amount);
    const pendingAmount = pendingProducers.reduce(
      (sum, producer) => sum + producer.amount,
      0,
    );
    const managementCards = [
      {
        title: "Elekler",
        count: stations.length,
        note: "Açık istasyonlar",
        accent: "bg-blue-50 text-blue-700",
      },
      {
        title: "Üreticiler",
        count: new Set(records.map((record) => record.customer)).size,
        note: "Farklı üreticiler",
        accent: "bg-sky-50 text-sky-700",
      },
      {
        title: "Zeytin Türleri",
        count: prices.length,
        note: "Fiyat listesi",
        accent: "bg-violet-50 text-violet-700",
      },
      {
        title: "Aktif Personeller",
        count: responsiblePersons.filter((person) => person.status === "Aktif")
          .length,
        note: "Görevdeki personeller",
        accent: "bg-emerald-50 text-emerald-700",
      },
    ];

    return (
      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {managementCards.map((card) => (
            <div
              key={card.title}
              className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
            >
              <div
                className={`inline-flex rounded-xl px-2.5 py-2 text-sm font-semibold ${card.accent}`}
              >
                {card.title}
              </div>
              <p className="mt-4 text-3xl font-bold text-slate-900">
                {card.count}
              </p>
              <p className="mt-2 text-sm text-slate-500">{card.note}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <h3 className="text-xl font-bold text-slate-900">
              Alınan Zeytin Özeti
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Cins ve numara bazında toplam kilogram
            </p>
            <div className="mt-4 space-y-3">
              {Object.entries(oliveKgSummary).length ? (
                Object.entries(oliveKgSummary).map(([oliveType, sizes]) => (
                  <div
                    key={oliveType}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="font-semibold text-slate-800">{oliveType}</p>
                    <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
                      {sizeKeys.map((size) => (
                        <div
                          key={size}
                          className="rounded-lg bg-white p-2 text-center"
                        >
                          <span className="block text-[10px] text-slate-500">
                            {size}
                          </span>
                          <strong className="text-sm text-slate-900">
                            {sizes[size].toFixed(2)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Henüz zeytin kaydı bulunmuyor.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <button
              type="button"
              onClick={() => setShowPendingProducers((visible) => !visible)}
              className="w-full text-left"
            >
              <p className="text-sm font-semibold text-amber-700">
                Ödeme Bekleyen Üreticiler
              </p>
              <p className="mt-2 text-3xl font-bold text-amber-900">
                ₺{pendingAmount.toFixed(2)}
              </p>
              <p className="mt-2 text-sm text-amber-700">
                {pendingProducers.length} üretici • Detay için tıklayın
              </p>
            </button>
            {showPendingProducers && (
              <div className="mt-4 space-y-2 border-t border-amber-200 pt-4">
                {pendingProducers.length ? (
                  pendingProducers.map((producer) => (
                    <div
                      key={producer.name}
                      className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-slate-800">
                        {producer.name}
                      </span>
                      <span className="font-bold text-amber-800">
                        ₺{producer.amount.toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-amber-700">
                    Ödeme bekleyen üretici yok.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                Elek ve Sorumlu Yönetimi
              </h3>
              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                {stations.length} aktif
              </span>
            </div>
            <div className="space-y-3">
              {stations.map((station) => {
                const assignedPeople = station.responsible_persons || [];
                return (
                  <div
                    key={station.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {station.name}
                        </p>
                        {assignedPeople.length
                          ? assignedPeople.map((person) => (
                              <p
                                key={`summary-${person.id}`}
                                className="text-sm text-slate-500"
                              >
                                {person.full_name} • {person.phone}
                              </p>
                            ))
                          : null}
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${station.status === "Aktif" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}
                      >
                        {station.status || "Aktif"}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                      <span>Komisyon</span>
                      <span className="font-semibold text-slate-900">
                        ₺{Number(station.commission_per_kg || 0).toFixed(2)} /
                        kg
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                      <span>Uygulama</span>
                      <span className="font-semibold text-slate-900">
                        {station.commission_scope || "toplam kg"}
                      </span>
                    </div>
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Sorumlu personel
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {assignedPeople.length
                          ? assignedPeople.map((person) => (
                              <span
                                key={person.id}
                                className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700"
                              >
                                {person.full_name}
                              </span>
                            ))
                          : null}
                      </div>
                    </div>
                    {editStationId === station.id && (
                      <form
                        onSubmit={handleStationSave}
                        className="mt-3 space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-3"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                          Elek düzenle
                        </p>
                        <label className="block text-xs font-medium text-slate-700">
                          Elek adı
                          <input
                            value={stationForm.name}
                            onChange={(event) =>
                              setStationForm((prev) => ({
                                ...prev,
                                name: event.target.value,
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="block text-xs font-medium text-slate-700">
                          Komisyon TL/KG
                          <input
                            type="number"
                            step="0.01"
                            value={stationForm.commission_per_kg}
                            onChange={(event) =>
                              setStationForm((prev) => ({
                                ...prev,
                                commission_per_kg: event.target.value,
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="block text-xs font-medium text-slate-700">
                          Sorumlu personel
                          <select
                            multiple
                            value={stationForm.responsible_person_ids.map(
                              String,
                            )}
                            onChange={(event) =>
                              setStationForm((prev) => ({
                                ...prev,
                                responsible_person_ids: Array.from(
                                  event.target.selectedOptions,
                                  (option) => Number(option.value),
                                ),
                              }))
                            }
                            className="mt-1 min-h-20 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm"
                          >
                            {responsiblePersons.map((person) => (
                              <option key={person.id} value={person.id}>
                                {person.full_name} ({person.phone})
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                          >
                            Kaydet
                          </button>
                          <button
                            type="button"
                            onClick={resetStationForm}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                          >
                            İptal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStationDelete(station)}
                            className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                          >
                            Elek Sil
                          </button>
                        </div>
                      </form>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleStationEdit(station)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStationStatusToggle(station)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {station.status === "Aktif"
                          ? "Pasifleştir"
                          : "Aktifleştir"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <h3 className="text-xl font-bold text-slate-900">
                Sorumlu Personel
              </h3>
              <form onSubmit={handlePersonSave} className="mt-4 space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Ad Soyad
                  <input
                    value={personForm.full_name}
                    onChange={(event) =>
                      setPersonForm((prev) => ({
                        ...prev,
                        full_name: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Telefon
                  <input
                    value={personForm.phone}
                    onChange={(event) =>
                      setPersonForm((prev) => ({
                        ...prev,
                        phone: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Durum
                  <select
                    value={personForm.status}
                    onChange={(event) =>
                      setPersonForm((prev) => ({
                        ...prev,
                        status: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Pasif">Pasif</option>
                  </select>
                </label>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-xl bg-[#0b1f3a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#123d73]"
                  >
                    {editPersonId ? "Güncelle" : "Kaydet"}
                  </button>
                  <button
                    type="button"
                    onClick={resetPersonForm}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    İptal
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <h3 className="text-xl font-bold text-slate-900">
                Personel Listesi
              </h3>
              <div className="mt-4 space-y-3">
                {responsiblePersons.map((person) => {
                  const personStations = stations.filter((station) =>
                    (station.responsible_persons || []).some(
                      (assigned) => Number(assigned.id) === Number(person.id),
                    ),
                  );
                  return (
                    <div
                      key={person.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-800">
                            {person.full_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {person.phone}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-semibold ${person.status === "Aktif" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}
                        >
                          {person.status}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-600">
                        {personStations.length ? (
                          <span>
                            Sorumlu olduğu elekler:{" "}
                            {personStations
                              .map((station) => station.name)
                              .join(", ")}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-lg bg-blue-50 p-2">
                          <span className="block text-blue-700">
                            Hak edilen
                          </span>
                          <strong className="text-slate-900">
                            ₺{Number(person.total_commission || 0).toFixed(2)}
                          </strong>
                        </div>
                        <div className="rounded-lg bg-emerald-50 p-2">
                          <span className="block text-emerald-700">Ödenen</span>
                          <strong className="text-slate-900">
                            ₺
                            {Number(person.total_commission_paid || 0).toFixed(
                              2,
                            )}
                          </strong>
                        </div>
                        <div className="rounded-lg bg-amber-50 p-2">
                          <span className="block text-amber-700">Kalan</span>
                          <strong className="text-slate-900">
                            ₺
                            {Number(person.remaining_commission || 0).toFixed(
                              2,
                            )}
                          </strong>
                        </div>
                      </div>
                      <form
                        onSubmit={(event) =>
                          handlePersonPaymentSave(event, person)
                        }
                        className="mt-3 grid gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 md:grid-cols-[1fr_1fr_1.4fr_auto] md:items-end"
                      >
                        <label className="text-[11px] font-medium text-slate-700">
                          Ödeme tutarı
                          <input
                            type="number"
                            min="0.01"
                            max={Number(person.remaining_commission || 0)}
                            step="0.01"
                            value={personPaymentForms[person.id]?.amount || ""}
                            onChange={(event) =>
                              setPersonPaymentForms((prev) => ({
                                ...prev,
                                [person.id]: {
                                  ...prev[person.id],
                                  amount: event.target.value,
                                },
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-2 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
                            placeholder={
                              Number(person.remaining_commission || 0) > 0
                                ? "0.00"
                                : "Bakiye yok"
                            }
                            disabled={
                              Number(person.remaining_commission || 0) <= 0
                            }
                            required
                          />
                        </label>
                        <label className="text-[11px] font-medium text-slate-700">
                          Tarih
                          <input
                            type="date"
                            value={
                              personPaymentForms[person.id]?.payment_date ||
                              new Date().toISOString().slice(0, 10)
                            }
                            onChange={(event) =>
                              setPersonPaymentForms((prev) => ({
                                ...prev,
                                [person.id]: {
                                  ...prev[person.id],
                                  payment_date: event.target.value,
                                },
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-2 py-2 text-sm"
                            required
                          />
                        </label>
                        <label className="text-[11px] font-medium text-slate-700">
                          Not
                          <input
                            value={personPaymentForms[person.id]?.note || ""}
                            onChange={(event) =>
                              setPersonPaymentForms((prev) => ({
                                ...prev,
                                [person.id]: {
                                  ...prev[person.id],
                                  note: event.target.value,
                                },
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-2 py-2 text-sm"
                            placeholder="Nakit, havale..."
                          />
                        </label>
                        <button
                          type="submit"
                          disabled={
                            Number(person.remaining_commission || 0) <= 0
                          }
                          className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Ödeme kaydet
                        </button>
                        {Number(person.remaining_commission || 0) <= 0 && (
                          <p className="text-[11px] text-slate-500 md:col-span-4">
                            Ödeme bekleyen komisyon bulunmuyor.
                          </p>
                        )}
                      </form>
                      <div className="mt-2 text-[11px] text-slate-500">
                        {(person.commission_payments || []).length
                          ? `Son ödeme: ${person.commission_payments[0].payment_date} • ₺${Number(person.commission_payments[0].amount || 0).toFixed(2)}`
                          : "Henüz komisyon ödemesi yok."}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handlePersonEdit(person)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePersonStatusToggle(person)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          {person.status === "Aktif"
                            ? "Pasifleştir"
                            : "Aktifleştir"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePersonDelete(person)}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          Sil
                        </button>
                      </div>
                      {editPersonId === person.id && (
                        <form
                          onSubmit={handlePersonSave}
                          className="mt-3 space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-3"
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                            Sorumlu düzenle
                          </p>
                          <label className="block text-xs font-medium text-slate-700">
                            Ad Soyad
                            <input
                              value={personForm.full_name}
                              onChange={(event) =>
                                setPersonForm((prev) => ({
                                  ...prev,
                                  full_name: event.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm"
                            />
                          </label>
                          <label className="block text-xs font-medium text-slate-700">
                            Telefon
                            <input
                              value={personForm.phone}
                              onChange={(event) =>
                                setPersonForm((prev) => ({
                                  ...prev,
                                  phone: event.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm"
                            />
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                            >
                              Kaydet
                            </button>
                            <button
                              type="button"
                              onClick={resetPersonForm}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                            >
                              İptal
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePersonDelete(person)}
                              className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                            >
                              Sil
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <h3 className="text-xl font-bold text-slate-900">
            {editStationId ? "Elek Düzenle" : "Elek Ekle"}
          </h3>
          <form onSubmit={handleStationSave} className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Elek Adı
              <input
                value={stationForm.name}
                onChange={(event) =>
                  setStationForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Komisyon TL/KG
                <input
                  type="number"
                  step="0.01"
                  value={stationForm.commission_per_kg}
                  onChange={(event) =>
                    setStationForm((prev) => ({
                      ...prev,
                      commission_per_kg: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Durum
                <select
                  value={stationForm.status}
                  onChange={(event) =>
                    setStationForm((prev) => ({
                      ...prev,
                      status: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Pasif">Pasif</option>
                </select>
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Komisyon Temeli
                <select
                  value={stationForm.commission_basis}
                  onChange={(event) =>
                    setStationForm((prev) => ({
                      ...prev,
                      commission_basis: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <option value="kg">TL/KG</option>
                  <option value="amount">Toplam Tutar</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Uygulama Alanı
                <select
                  value={stationForm.commission_scope}
                  onChange={(event) =>
                    setStationForm((prev) => ({
                      ...prev,
                      commission_scope: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <option value="total_weight">Toplam KG</option>
                  <option value="net_weight">Net KG</option>
                  <option value="oil_weight">Yağlık KG</option>
                  <option value="sales_amount">Alış Tutarı</option>
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Çalışma Tarihleri
              <input
                value={stationForm.work_dates}
                onChange={(event) =>
                  setStationForm((prev) => ({
                    ...prev,
                    work_dates: event.target.value,
                  }))
                }
                placeholder="2026-10-24, 2026-10-25"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Sorumlu Personel
              <select
                multiple
                value={stationForm.responsible_person_ids.map(String)}
                onChange={(event) => {
                  const values = Array.from(
                    event.target.selectedOptions,
                    (option) => Number(option.value),
                  );
                  setStationForm((prev) => ({
                    ...prev,
                    responsible_person_ids: values,
                  }));
                }}
                className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                {responsiblePersons.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.full_name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              {canManagePurchases && <button
                type="submit"
                className="rounded-xl bg-[#0b1f3a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#123d73]"
              >
                {editStationId ? "Güncelle" : "Kaydet"}
              </button>}
              {canManageSales && <button
                type="button"
                onClick={resetStationForm}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                İptal
              </button>}
            </div>
          </form>
        </div>

        <div className="grid gap-6 xl:grid-cols-1">
          <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <h3 className="text-xl font-bold text-slate-900">
              WhatsApp Gönderim Kayıtları
            </h3>
            <div className="mt-4 space-y-3">
              {records.slice(0, 4).map((record) => (
                <div
                  key={record.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800">
                      {record.customer}
                    </p>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-700">
                      {record.date}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Mesaj hazır • Toplam ₺
                    {Number(record.total_amount || 0).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  };

  /* Üretici seçimi ve yeni eleme kaydı ekranı */
  const renderOperations = () => (
    <section className="grid gap-8 xl:grid-cols-[1.6fr_0.9fr]">
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Elek Kaydı
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Önce üretici seçin
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowProducerForm((visible) => !visible)}
              className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Elek Kaydı
            </button>
          </div>
          {showProducerForm && (
            <form
              onSubmit={handleProducerRegister}
              className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
            >
              <input
                value={producerDraft.full_name}
                onChange={(event) =>
                  setProducerDraft((previous) => ({
                    ...previous,
                    full_name: event.target.value,
                  }))
                }
                placeholder="Üretici adı"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                required
              />
              <input
                type="tel"
                value={producerDraft.phone}
                onChange={(event) =>
                  setProducerDraft((previous) => ({
                    ...previous,
                    phone: event.target.value,
                  }))
                }
                placeholder="Telefon"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                required
              />
              <button
                type="submit"
                className="rounded-xl bg-[#0b1f3a] px-4 py-2 text-sm font-semibold text-white"
              >
                Listeye Ekle
              </button>
            </form>
          )}
          <div className="mt-5 space-y-2">
            {producerQueue.length ? (
              producerQueue.map((producer) => (
                <button
                  key={producer.key}
                  type="button"
                  onClick={() => selectProducer(producer)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left ${activeProducerKey === producer.key ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-slate-50"}`}
                >
                  <span className="font-semibold text-slate-800">
                    {producer.full_name}
                  </span>
                  <span className="text-right text-sm text-slate-500">
                    {producer.phone}
                    <br />
                    <strong className="text-slate-700">
                      Sıra No: #{producer.sequence_no}
                    </strong>
                  </span>
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-500">Henüz üretici eklenmedi.</p>
            )}
          </div>
        </div>
        {activeProducerKey && (
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Yeni Eleme Kaydı
                </p>
                <h2 className="mt-1 text-2xl font-bold">Eleme bilgileri</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-600">
                    <span>Toplam alış tutarı</span>
                    <input
                      type="text"
                      value={formatMessageNumber(
                        calculatePurchaseAmount(form.items, priceMap),
                      )}
                      readOnly
                      className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-600"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-slate-600">
                    <span>Ödenecek tutar</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.payable_amount}
                      onChange={(e) =>
                        setForm({ ...form, payable_amount: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                      placeholder="Toplam alış tutarı"
                    />
                  </label>
                </div>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                <Plus className="h-4 w-4" />
                Tür Ekle
              </button>
            </div>

            <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 md:grid-cols-5">
                <label className="space-y-2 text-sm text-slate-600">
                  <span>Tarih</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="gg.aa.yyyy"
                    value={dateInput}
                    onChange={handleDateInputChange}
                    onBlur={() => setDateInput(formatDateInput(form.date))}
                    maxLength="10"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                  />
                </label>

                <label className="space-y-2 text-sm text-slate-600">
                  <span>Saat</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="HH:mm"
                    value={timeInput}
                    onChange={handleTimeInputChange}
                    onBlur={() => setTimeInput(form.time)}
                    maxLength="5"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                  />
                </label>

                <label className="space-y-2 text-sm text-slate-600">
                  <span>Elek</span>
                  <select
                    value={selectedStationId}
                    onChange={(e) => setSelectedStationId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <option value="">Seçiniz</option>
                    {stations.map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm text-slate-600">
                  <span>Sorumlu</span>
                  <select
                    value={selectedResponsiblePersonId}
                    onChange={(event) =>
                      setSelectedResponsiblePersonId(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <option value="">Seçiniz</option>
                    {(
                      stations.find(
                        (station) =>
                          String(station.id) === String(selectedStationId),
                      )?.responsible_persons || []
                    ).map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.full_name} ({person.phone})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm text-slate-600">
                  <span>Sıra No</span>
                  <input
                    type="number"
                    value={form.sequence_no}
                    readOnly
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-600"
                  />
                </label>
              </div>

              <div className="mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-600">
                    <span>Üretici / Köylü</span>
                    <input
                      type="text"
                      value={form.customer}
                      onChange={(e) =>
                        setForm({ ...form, customer: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-slate-600">
                    <span>Telefon</span>
                    <input
                      type="tel"
                      value={form.customer_phone}
                      onChange={(e) =>
                        setForm({ ...form, customer_phone: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                      placeholder="05xxxxxxxxx"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-6">
              {form.items.map((item, index) => (
                <div
                  key={`${item.olive_type}-${index}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                        {index + 1}
                      </span>
                      <select
                        value={item.olive_type}
                        onChange={(e) =>
                          updateItem(index, "olive_type", e.target.value)
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
                      >
                        {oliveTypeOptions.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    {form.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-sm font-medium text-rose-600"
                      >
                        Kaldır
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-7">
                    {sizeKeys.map((size) => (
                      <label
                        key={size}
                        className="space-y-2 text-xs font-medium uppercase tracking-wide text-slate-500"
                      >
                        <span>{size}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={item[`size_${size}`]}
                          onChange={(e) =>
                            updateItem(index, `size_${size}`, e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl bg-white px-3 py-3">
                    <div className="mb-2 text-sm font-medium text-slate-600">
                      Yağlığa bırakılacaklar:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sizeKeys.map((size) => {
                        const selectedSizes = getOilSelection(item.oil_release);
                        return (
                          <label
                            key={`${item.olive_type}-${size}`}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={selectedSizes[size] || false}
                              onChange={() => toggleOilSize(index, size)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>{size}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Kaydediliyor..." : "Kaydı Oluştur"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>

      <aside className="space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-[#0b1f3a] to-[#123d73] p-5 text-white shadow-[0_20px_45px_rgba(11,31,58,0.22)]">
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-blue-200">
            <MessageSquareText className="h-4 w-4" />
            WhatsApp Önizleme
          </div>
          <pre className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-100">
            {previewMessage}
          </pre>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-slate-500">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Wallet className="h-4 w-4" />
            </span>
            Son Kayıtlar
          </div>
          <div className="mt-4 space-y-3">
            {records.slice(0, 4).map((record) => (
              <div
                key={record.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800">
                    {record.customer}
                  </p>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                    #{record.sequence_no}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{record.date}</p>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-600">Toplam</span>
                  <span className="font-bold text-slate-900">
                    ₺{Number(record.total_amount || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <div className="mb-3 text-sm uppercase tracking-[0.2em] text-slate-500">
            Üretici Detayı
          </div>
          {selectedCustomerRecord ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-bold text-slate-900">
                  {selectedCustomerRecord.customer}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Sıra</span>
                  <span className="font-semibold text-slate-900">
                    #{selectedCustomerRecord.sequence_no}
                  </span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span>Tarih</span>
                  <span className="font-semibold text-slate-900">
                    {selectedCustomerRecord.date}
                  </span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span>Ödenecek</span>
                  <span className="font-semibold text-slate-900">
                    ₺
                    {Number(selectedCustomerRecord.total_amount || 0).toFixed(
                      2,
                    )}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  sendWhatsApp(
                    selectedCustomerRecord,
                    customers.find(
                      (customer) =>
                        customer.full_name === selectedCustomerRecord.customer,
                    )?.phone,
                  )
                }
                className="w-full rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                WhatsApp ile Gönder
              </button>
              <button
                type="button"
                onClick={() => printReceipt(selectedCustomerRecord)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                <Printer className="h-4 w-4" />
                Fiş Kes
              </button>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">WhatsApp</span>
                  <span
                    className={`font-semibold ${selectedCustomerRecord.whatsapp_status === "Bekliyor" ? "text-amber-700" : "text-emerald-700"}`}
                  >
                    {selectedCustomerRecord.whatsapp_status === "Bekliyor"
                      ? "Bekliyor"
                      : "✓ Gönderildi"}
                  </span>
                </div>
                {selectedCustomerRecord.whatsapp_sent_at && (
                  <p className="mt-2 text-xs text-slate-500">
                    {new Date(
                      selectedCustomerRecord.whatsapp_sent_at,
                    ).toLocaleString("tr-TR")}
                  </p>
                )}
              </div>
              <pre className="whitespace-pre-wrap rounded-2xl bg-slate-900 p-3 text-xs leading-5 text-slate-100">
                {selectedCustomerRecord.whatsapp_message || "Mesaj bulunamadı."}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Henüz üretici kaydı yok.</p>
          )}
        </div>
      </aside>
    </section>
  );

  /* Zeytinyağı sıkım sürecinin durum takibi */
  const renderPressingRecords = () => {
    const processGroups = oilProcessSteps.reduce((groups, status) => {
      groups[status] = customers
        .map((customer) => {
          const customerRecords = records.filter(
            (record) =>
              String(record.customer || "")
                .trim()
                .toLocaleLowerCase("tr-TR") ===
              String(customer.full_name || "")
                .trim()
                .toLocaleLowerCase("tr-TR"),
          );
          const latestRecord =
            [...customerRecords].sort(
              (first, second) => new Date(second.date) - new Date(first.date),
            )[0] || null;
          return {
            ...customer,
            latestRecord,
            totalOil: customerRecords.reduce(
              (sum, record) => sum + Number(record.total_oil_amount || 0),
              0,
            ),
            recordCount: customerRecords.length,
          };
        })
        .filter(
          (customer) =>
            customer.oil_process_status === status && customer.totalOil > 0,
        );
      return groups;
    }, {});
    const activeProcessStatus = selectedProcessStatus || oilProcessSteps[0];
    const activeProcessGroup = processGroups[activeProcessStatus] || [];
    return (
      <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Üretim takibi
          </p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">Sıkım Kaydı</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {oilProcessSteps.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setSelectedProcessStatus(status)}
              className={`rounded-2xl border p-4 text-left transition ${activeProcessStatus === status ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-blue-300"}`}
            >
              <span className="text-sm font-semibold text-slate-700">
                {status}
              </span>
              <strong className="mt-2 block text-2xl text-slate-900">
                {processGroups[status].length}
              </strong>
              <span className="text-xs text-slate-500">üretici</span>
            </button>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-bold text-slate-900">
              {activeProcessStatus} üreticileri
            </h4>
            <span className="text-xs text-slate-500">
              {activeProcessGroup.length} kişi
            </span>
          </div>
          {activeProcessGroup.length ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {activeProcessGroup.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {customer.full_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {customer.recordCount} eleme kaydı
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                      {customer.totalOil.toFixed(2)} kg
                    </span>
                    {customer.latestRecord && (
                      <button
                        type="button"
                        onClick={() => openPressingRecord(customer)}
                        className="rounded-lg border border-blue-200 bg-white px-2 py-1 text-[10px] font-semibold text-blue-700"
                      >
                        Eleme kaydını kullan
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        sendProcessWhatsApp(customer, activeProcessStatus)
                      }
                      className="rounded-lg bg-blue-700 px-2 py-1 text-[10px] font-semibold text-white hover:bg-blue-800"
                    >
                      {activeProcessStatus === "Beklemede"
                        ? "Sıkıma al"
                        : activeProcessStatus === "Sıkımda"
                          ? "Sıkımı tamamla"
                          : "WhatsApp gönder"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Bu aşamada üretici bulunmuyor.
            </p>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),transparent_25%),linear-gradient(180deg,_#edf4ff_0%,_#f8fbff_100%)] text-slate-900">
      <div className="mx-auto flex max-w-[1600px] gap-6 p-4 lg:p-6">
        <aside className="hidden w-72 shrink-0 rounded-[28px] border border-blue-900/10 bg-gradient-to-b from-[#071d35] via-[#0a2140] to-[#102f5d] p-5 text-white shadow-[0_18px_45px_rgba(7,29,53,0.28)] lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <div className="rounded-[18px] bg-white/8 p-1 ring-1 ring-white/15">
              <BrandLogo />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-blue-200">
                Anka
              </p>
              <h2 className="mt-1 text-lg font-bold">Tarımsal Takip</h2>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-white/10 p-1 ring-1 ring-white/10">
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                role="switch"
                aria-checked={businessMode === "producer"}
                onClick={() => {
                  setBusinessMode("producer");
                  setActiveTab("overview");
                }}
                className={`rounded-xl px-3 py-2 text-xs font-semibold ${businessMode === "producer" ? "bg-white text-[#0a2140]" : "text-blue-100"}`}
              >
                Alış
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={businessMode === "merchant"}
                onClick={() => {
                  setBusinessMode("merchant");
                  setActiveTab("merchant-overview");
                }}
                className={`rounded-xl px-3 py-2 text-xs font-semibold ${businessMode === "merchant" ? "bg-white text-[#0a2140]" : "text-blue-100"}`}
              >
                Satış
              </button>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {(businessMode === "producer" ? tabs : merchantTabs).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${activeTab === tab.id ? "bg-white text-[#0a2140] shadow-lg shadow-blue-950/10" : "text-blue-100 hover:bg-white/8 hover:text-white"}`}
              >
                <span>{tab.label}</span>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${activeTab === tab.id ? "bg-blue-700" : "bg-white/35"}`}
                />
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1">
          <header className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm lg:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Operasyon Merkezi
                </p>
                <h1 className="mt-2 text-2xl font-bold text-slate-900">
                  {businessMode === "merchant"
                    ? merchantTabs.find((tab) => tab.id === activeTab)?.label ||
                      "Genel Durum"
                    : tabs.find((tab) => tab.id === activeTab)?.label ||
                      "Genel Durum"}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <UserCircle2 className="h-4 w-4 text-blue-700" />
                  {currentUserDisplayName}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setIsRefreshing(true);
                    await refreshData();
                    setIsRefreshing(false);
                  }}
                  className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100"
                >
                  {isRefreshing ? "Yenileniyor..." : "Yenile"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAuthenticated(false);
                    setLoginError("");
                    setCurrentUser(null);
                    window.localStorage.removeItem("anka_auth_token");
                    window.localStorage.removeItem("anka_auth_user");
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" />
                  Çıkış
                </button>
              </div>
            </div>
          </header>

          <main className="space-y-8 pt-6">
            {canManagePurchases && businessMode === "producer" &&
              activeTab === "overview" &&
              renderOverview()}
            {canManagePurchases && businessMode === "producer" &&
              activeTab === "management" &&
              renderManagement()}
            {canManagePurchases && businessMode === "producer" &&
              activeTab === "customers" &&
              renderCustomers()}
            {canManagePurchases && businessMode === "producer" &&
              activeTab === "reports" &&
              renderReports()}
            {canManagePurchases && businessMode === "producer" &&
              activeTab === "operations" &&
              renderOperations()}
            {canManagePurchases && businessMode === "producer" &&
              activeTab === "pressing" &&
              renderPressingRecords()}
            {canManagePurchases && businessMode === "producer" &&
              activeTab === "users" &&
              renderUsers()}
            {canManageSales && businessMode === "merchant" &&
              activeTab === "merchant-overview" &&
              renderSalesOverviewV3()}
            {canManageSales && businessMode === "merchant" &&
              activeTab === "merchant-sales" &&
              renderSalesRecords()}
            {canManageSales && businessMode === "merchant" &&
              activeTab === "merchant-shipments" &&
              renderShipmentRecords()}
            {canManageSales && businessMode === "merchant" &&
              activeTab === "merchant-traders" &&
              renderMerchantParties()}
            {canManageSales && businessMode === "merchant" &&
              activeTab === "merchant-reports" &&
              renderMerchantReports()}
            {canManageSales && businessMode === "merchant" &&
              activeTab === "merchant-vehicles" &&
              renderVehicleManagement()}
            {canManageSales && businessMode === "merchant" &&
              activeTab === "merchant-inventory" &&
              renderInventoryManagement()}

            {businessMode === "producer" && activeTab !== "operations" && (
              <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm">
                <div className="mb-4 flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <h3 className="text-xl font-bold">Açık Eleme İşlemleri</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Üretici</th>
                        <th className="px-4 py-3">Elek</th>
                        <th className="px-4 py-3">Tarih</th>
                        <th className="px-4 py-3">Sıra</th>
                        <th className="px-4 py-3">Toplam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record) => (
                        <tr
                          key={record.id}
                          className="border-t border-slate-200"
                        >
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {record.customer}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {stations.find((s) => s.id === record.sieve_station)
                              ?.name || "Elek"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {record.date}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            #{record.sequence_no}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            ₺{Number(record.total_amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
