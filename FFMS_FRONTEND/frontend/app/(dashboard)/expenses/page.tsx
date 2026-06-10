"use client";

import { useState, useMemo, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { 
  addExpense, 
  approveExpense, 
  rejectExpense, 
  deleteExpense, 
  ExpenseRecord 
} from "@/store/slices/expenseSlice";
import { getStatusColor } from "@/lib/utils";
import { addNotification } from "@/store/slices/notificationSlice";
import { 
  Wallet, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  Eye, 
  RotateCcw, 
  Check, 
  X, 
  AlertCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  UserCheck
} from "lucide-react";

const CATEGORIES = ["Food / Meal", "Travel / Conveyance", "Lodging / Hotel", "Client Entertainment", "Other"];

export default function ExpensesPage() {
  const dispatch = useDispatch();
  const expenses = useSelector((s: RootState) => s.expenses.list);
  const employees = useSelector((s: RootState) => s.employees.list);
  const currentUser = useSelector((s: RootState) => s.auth.user) || {
    firstName: "Admin",
    lastName: "Global Ops",
    email: "admin@fieldforce.com"
  };

  const currentAdminName = `${currentUser.firstName} ${currentUser.lastName}`.trim() || "Admin";

  // Hydration guard — prevents SSR/client mismatch on Redux-dependent renders
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Navigation tabs: ME vs APPROVALS
  const [activeTab, setActiveTab] = useState<"ME" | "APPROVALS">("ME");

  // Filters State
  const [filterUser, setFilterUser] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [filterDateStart, setFilterDateStart] = useState<string>("");
  const [filterDateEnd, setFilterDateEnd] = useState<string>("");

  // Live query search
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Checked Rows Selection
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  // Modal control
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    expenseHead: "",
    expenseCategory: CATEGORIES[0],
    amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
    customer: "",
    remark: ""
  });

  // Reject dialog state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectRemark, setRejectRemark] = useState("");

  // Toast message
  const [toast, setToast] = useState<string | null>(null);

  // Apply filters trigger
  const [appliedFilters, setAppliedFilters] = useState({
    user: "All",
    status: "All",
    category: "All",
    dateStart: "",
    dateEnd: ""
  });

  const handleApplyFilters = () => {
    setAppliedFilters({
      user: filterUser,
      status: filterStatus,
      category: filterCategory,
      dateStart: filterDateStart,
      dateEnd: filterDateEnd
    });
  };

  const handleClearFilters = () => {
    setFilterUser("All");
    setFilterStatus("All");
    setFilterCategory("All");
    setFilterDateStart("");
    setFilterDateEnd("");
    setAppliedFilters({
      user: "All",
      status: "All",
      category: "All",
      dateStart: "",
      dateEnd: ""
    });
  };

  // Filtered lists logic
  const filteredList = useMemo(() => {
    return expenses.filter(item => {
      // 1. Tab filter
      if (activeTab === "ME") {
        if (item.userName !== currentAdminName) return false;
      } else {
        // Approvals tab shows all other employees' expenses
        if (item.userName === currentAdminName) return false;
      }

      // 2. User dropdown filter
      if (appliedFilters.user !== "All" && item.userName !== appliedFilters.user) {
        return false;
      }

      // 3. Status filter
      if (appliedFilters.status !== "All" && item.status !== appliedFilters.status) {
        return false;
      }

      // 4. Category filter
      if (appliedFilters.category !== "All" && item.expenseCategory !== appliedFilters.category) {
        return false;
      }

      // 5. Date range filter
      if (appliedFilters.dateStart && item.expenseDate < appliedFilters.dateStart) {
        return false;
      }
      if (appliedFilters.dateEnd && item.expenseDate > appliedFilters.dateEnd) {
        return false;
      }

      // 6. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = item.expenseHead.toLowerCase().includes(query);
        const matchUser = item.userName.toLowerCase().includes(query);
        const matchCustomer = item.customer.toLowerCase().includes(query);
        const matchRemark = item.remark.toLowerCase().includes(query);
        return matchTitle || matchUser || matchCustomer || matchRemark;
      }

      return true;
    });
  }, [expenses, activeTab, appliedFilters, searchQuery, currentAdminName]);

  // Totals calculations
  const totalAmountFiltered = useMemo(() => {
    return filteredList.reduce((acc, item) => acc + item.amount, 0);
  }, [filteredList]);

  const totalAmountGlobalTab = useMemo(() => {
    return expenses
      .filter(item => activeTab === "ME" ? item.userName === currentAdminName : item.userName !== currentAdminName)
      .reduce((acc, item) => acc + item.amount, 0);
  }, [expenses, activeTab, currentAdminName]);

  // Bulk / individual approvals
  const handleApprove = (id: string) => {
    const exp = expenses.find(e => e.id === id);
    dispatch(approveExpense(id));
    if (exp) {
      dispatch(addNotification({
        employeeId: exp.employeeId,
        employeeName: exp.userName,
        avatar: exp.userName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2),
        type: "system",
        message: `Expense APPROVED: ${exp.userName}'s claim of ₹${exp.amount.toLocaleString("en-IN")} for '${exp.expenseHead}' was approved by ${currentAdminName}.`,
        priority: "normal"
      }));
    }
    setToast("Expense record successfully approved!");
    setTimeout(() => setToast(null), 3000);
  };

  const handleRejectPrompt = (id: string) => {
    setRejectingId(id);
    setRejectRemark("");
  };

  const handleRejectConfirm = () => {
    if (rejectingId) {
      const exp = expenses.find(e => e.id === rejectingId);
      const reason = rejectRemark || "Rejected by operations manager.";
      dispatch(rejectExpense({ id: rejectingId, remark: reason }));
      if (exp) {
        dispatch(addNotification({
          employeeId: exp.employeeId,
          employeeName: exp.userName,
          avatar: exp.userName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2),
          type: "alert",
          message: `Expense REJECTED: ${exp.userName}'s claim of ₹${exp.amount.toLocaleString("en-IN")} for '${exp.expenseHead}' was rejected. Reason: ${reason}`,
          priority: "high"
        }));
      }
      setRejectingId(null);
      setToast("Expense record rejected.");
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Add new expense submit
  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.expenseHead.trim() || !modalForm.amount) {
      alert("Please complete required fields.");
      return;
    }

    const amountNum = parseFloat(modalForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const newRecord: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      userName: activeTab === "ME" ? currentAdminName : (employees[0]?.name || "Field Executive"),
      employeeId: activeTab === "ME" ? "admin" : (employees[0]?.id || "1"),
      expenseHead: modalForm.expenseHead,
      expenseCategory: modalForm.expenseCategory,
      amount: amountNum,
      expenseDate: modalForm.expenseDate,
      submittedOn: new Date().toISOString().split("T")[0],
      customer: modalForm.customer || "Internal / General",
      status: activeTab === "ME" ? "Approved" : "Pending Approval by Manager", // Admin gets auto-approved, others go pending
      remark: modalForm.remark
    };

    dispatch(addExpense(newRecord));
    
    // Dispatch to Notification center
    dispatch(addNotification({
      employeeId: newRecord.employeeId,
      employeeName: newRecord.userName,
      avatar: newRecord.userName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2),
      type: newRecord.status === "Approved" ? "system" : "alert",
      message: `New Expense Filed: ${newRecord.userName} submitted a claim of ₹${newRecord.amount.toLocaleString("en-IN")} for '${newRecord.expenseHead}' (Category: ${newRecord.expenseCategory}). Status: ${newRecord.status}.`,
      priority: newRecord.status === "Pending Approval by Manager" ? "high" : "normal"
    }));

    setShowAddModal(false);
    setModalForm({
      expenseHead: "",
      expenseCategory: CATEGORIES[0],
      amount: "",
      expenseDate: new Date().toISOString().split("T")[0],
      customer: "",
      remark: ""
    });
    setToast("New expense voucher successfully generated!");
    setTimeout(() => setToast(null), 3000);
  };

  // Bulk checkbox controls
  const handleSelectAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    if (checked) {
      filteredList.forEach(item => {
        next[item.id] = true;
      });
    }
    setSelectedIds(next);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedIds(prev => ({
      ...prev,
      [id]: checked
    }));
  };

  // Export to CSV simulation
  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = "User Name,Expense Head,Expense Category,Amount (INR),Expense Date,Submitted On,Customer,Status,Remark\n";
    const rows = filteredList.map(item => 
      `"${item.userName}","${item.expenseHead}","${item.expenseCategory}",${item.amount},"${item.expenseDate}","${item.submittedOn}","${item.customer}","${item.status}","${item.remark}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Expenses_Report_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setToast("CSV export compiled and downloaded successfully!");
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Wallet size={24} color="var(--accent-blue)" /> Expense Control Panel
          </div>
          <div className="page-subtitle">Track, audit, and approve field force operations travel and lodging expenses.</div>
        </div>
      </div>

      {/* Tabs Row */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", gap: "2px" }}>
        <button
          onClick={() => { setActiveTab("ME"); handleClearFilters(); }}
          style={{
            padding: "10px 24px",
            background: activeTab === "ME" ? "var(--accent-blue)" : "transparent",
            color: activeTab === "ME" ? "white" : "var(--text-secondary)",
            border: "none",
            borderRadius: "0",
            fontWeight: 800,
            fontSize: "13.5px",
            fontFamily: "var(--font-jetbrains), monospace",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          ME
        </button>
        <button
          onClick={() => { setActiveTab("APPROVALS"); handleClearFilters(); }}
          style={{
            padding: "10px 24px",
            background: activeTab === "APPROVALS" ? "var(--accent-blue)" : "transparent",
            color: activeTab === "APPROVALS" ? "white" : "var(--text-secondary)",
            border: "none",
            borderRadius: "0",
            fontWeight: 800,
            fontSize: "13.5px",
            fontFamily: "var(--font-jetbrains), monospace",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          APPROVALS
        </button>
      </div>

      {/* Filters Card */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>Search Filters</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          {/* User selector */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>User</label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="input"
              style={{ fontSize: "12.5px", height: "36px" }}
            >
              <option value="All">All Employees</option>
              {mounted && activeTab === "ME" ? (
                <option value={currentAdminName}>{currentAdminName} (You)</option>
              ) : mounted ? (
                Array.from(new Set(expenses.map(e => e.userName)))
                  .filter(name => name !== currentAdminName)
                  .map(name => <option key={name} value={name}>{name}</option>)
              ) : null}
            </select>
          </div>

          {/* Status selector */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
              style={{ fontSize: "12.5px", height: "36px" }}
            >
              <option value="All">All statuses</option>
              <option value="Pending Approval by Manager">Pending Approval</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Category selector */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Expense Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="input"
              style={{ fontSize: "12.5px", height: "36px" }}
            >
              <option value="All">All categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Dates selector */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Date Period (From - To)</label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="date"
                value={filterDateStart}
                onChange={(e) => setFilterDateStart(e.target.value)}
                className="input"
                style={{ fontSize: "12.5px", height: "36px", flex: 1 }}
              />
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>-</span>
              <input
                type="date"
                value={filterDateEnd}
                onChange={(e) => setFilterDateEnd(e.target.value)}
                className="input"
                style={{ fontSize: "12.5px", height: "36px", flex: 1 }}
              />
            </div>
          </div>
        </div>

        {/* Filter buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "12px", marginTop: "4px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleApplyFilters}
              className="btn-primary"
              style={{ padding: "6px 16px", fontSize: "12.5px", height: "36px", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Eye size={14} /> View
            </button>
            <button
              onClick={handleClearFilters}
              className="btn-secondary"
              style={{ padding: "6px 16px", fontSize: "12.5px", height: "36px", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <RotateCcw size={14} /> Clear
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="btn-primary"
            style={{
              background: "var(--accent-green)",
              borderColor: "var(--accent-green)",
              padding: "6px 16px",
              fontSize: "12.5px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <FileSpreadsheet size={14} /> Save as CSV
          </button>
        </div>
      </div>

      {/* Main Table section */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "16px" }}>
        {/* Table header operations */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          {/* Search field */}
          <div style={{ position: "relative", minWidth: "260px" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "11px", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ paddingLeft: "32px", fontSize: "12.5px", height: "36px" }}
            />
          </div>

          {/* Add voucher button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "6px", height: "36px", fontSize: "12.5px" }}
          >
            <Plus size={15} /> Add Expense
          </button>
        </div>

        {/* Expenses List Table */}
        <div className="table-wrapper">
          <table style={{ minWidth: "1100px" }}>
            <thead>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input 
                    type="checkbox" 
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    checked={filteredList.length > 0 && filteredList.every(item => selectedIds[item.id])}
                    style={{ cursor: "pointer" }}
                  />
                </th>
                <th>User Name</th>
                <th>Expense Head</th>
                <th>Expense Category</th>
                <th style={{ textAlign: "right" }}>Amount (₹)</th>
                <th>Expense Date</th>
                <th>Submitted On</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Remark</th>
                {activeTab === "APPROVALS" && <th style={{ textAlign: "center" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredList.length > 0 ? (
                filteredList.map(item => (
                  <tr key={item.id} style={{ background: selectedIds[item.id] ? "rgba(0,82,255,0.02)" : "transparent" }}>
                    <td style={{ textAlign: "center" }}>
                      <input 
                        type="checkbox" 
                        checked={!!selectedIds[item.id]} 
                        onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: "13px" }}>{item.userName}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>{item.expenseHead}</div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", fontSize: "11px" }}>
                        {item.expenseCategory}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-jetbrains), monospace", fontWeight: 700, fontSize: "13px" }}>
                      ₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ fontSize: "12.5px", fontFamily: "var(--font-jetbrains), monospace" }}>{item.expenseDate}</td>
                    <td style={{ fontSize: "12.5px", fontFamily: "var(--font-jetbrains), monospace", color: "var(--text-muted)" }}>{item.submittedOn}</td>
                    <td style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{item.customer}</td>
                    <td>
                      <span className={`badge ${getStatusColor(item.status === "Pending Approval by Manager" ? "pending" : item.status === "Approved" ? "present" : "absent")}`} style={{ fontSize: "11px" }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ fontSize: "12.5px", color: "var(--text-muted)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.remark}>
                      {item.remark || "--"}
                    </td>
                    {activeTab === "APPROVALS" && (
                      <td style={{ textAlign: "center" }}>
                        {item.status === "Pending Approval by Manager" ? (
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            <button
                              onClick={() => handleApprove(item.id)}
                              className="btn-primary"
                              style={{
                                padding: "4px 8px",
                                height: "26px",
                                fontSize: "11px",
                                background: "var(--accent-green)",
                                borderColor: "var(--accent-green)"
                              }}
                              title="Approve Voucher"
                            >
                              <ThumbsUp size={11} /> Approve
                            </button>
                            <button
                              onClick={() => handleRejectPrompt(item.id)}
                              className="btn-primary"
                              style={{
                                padding: "4px 8px",
                                height: "26px",
                                fontSize: "11px",
                                background: "var(--accent-red)",
                                borderColor: "var(--accent-red)"
                              }}
                              title="Reject Voucher"
                            >
                              <ThumbsDown size={11} /> Reject
                            </button>
                          </div>
                        ) : (
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                            <UserCheck size={12} color="var(--accent-green)" /> Done
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={activeTab === "APPROVALS" ? 11 : 10} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "13px" }}>
                    No data available in table
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Totals Summary footer */}
        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          borderTop: "1px solid var(--border)",
          paddingTop: "12px",
          marginTop: "4px",
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: "13.5px"
        }}>
          <div>
            <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Total: </span>
            <span style={{ fontWeight: 800, color: "var(--text-primary)" }}>
              ₹{totalAmountFiltered.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              {" "}( of ₹{totalAmountGlobalTab.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Total )
            </span>
          </div>
        </div>
      </div>

      {/* Floating Success Toast notification */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          background: "var(--accent-green)",
          color: "white",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          zIndex: 9999,
          animation: "fadeIn 0.2s ease",
          border: "1px solid rgba(0,0,0,0.1)",
        }}>
          <Check size={16} />
          <span style={{ fontSize: "13px", fontWeight: 600, fontFamily: "Inter, sans-serif" }}>{toast}</span>
        </div>
      )}

      {/* Add Expense Voucher Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-box" style={{ maxWidth: "520px" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontWeight: 700, fontSize: "18px" }}>File Expense Voucher</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddExpenseSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Expense Head *</label>
                <input
                  className="input"
                  value={modalForm.expenseHead}
                  onChange={(e) => setModalForm(prev => ({ ...prev, expenseHead: e.target.value }))}
                  placeholder="e.g., Client Dinner, Fuel Conveyance"
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Expense Category</label>
                  <select
                    className="input"
                    value={modalForm.expenseCategory}
                    onChange={(e) => setModalForm(prev => ({ ...prev, expenseCategory: e.target.value }))}
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Amount (₹) *</label>
                  <input
                    type="number"
                    className="input"
                    value={modalForm.amount}
                    onChange={(e) => setModalForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Expense Date</label>
                  <input
                    type="date"
                    className="input"
                    value={modalForm.expenseDate}
                    onChange={(e) => setModalForm(prev => ({ ...prev, expenseDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Customer / Site</label>
                  <input
                    className="input"
                    value={modalForm.customer}
                    onChange={(e) => setModalForm(prev => ({ ...prev, customer: e.target.value }))}
                    placeholder="e.g., Tata Motors, Reliance"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Remark / Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={modalForm.remark}
                  onChange={(e) => setModalForm(prev => ({ ...prev, remark: e.target.value }))}
                  placeholder="Details of the operational expense..."
                  style={{ resize: "vertical" }}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "4px" }}>
                Submit Voucher
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Reject Dialog Prompt Modal */}
      {rejectingId && (
        <div className="modal-overlay" onClick={() => setRejectingId(null)}>
          <div className="modal-box" style={{ maxWidth: "420px" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h3 style={{ fontWeight: 700, fontSize: "16px", color: "var(--accent-red)", display: "flex", alignItems: "center", gap: "6px" }}>
                <AlertCircle size={18} /> Reject Expense Voucher
              </h3>
              <button onClick={() => setRejectingId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>
            
            <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginBottom: "12px" }}>
              Please provide a brief audit reason or remark for rejecting this expense claim.
            </p>

            <textarea
              className="input"
              rows={3}
              value={rejectRemark}
              onChange={(e) => setRejectRemark(e.target.value)}
              placeholder="e.g., Missing physical invoice copy."
              style={{ resize: "none", fontSize: "12.5px", marginBottom: "14px" }}
            />

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setRejectingId(null)} className="btn-secondary" style={{ padding: "6px 12px", fontSize: "12px", height: "32px" }}>
                Cancel
              </button>
              <button onClick={handleRejectConfirm} className="btn-primary" style={{ background: "var(--accent-red)", borderColor: "var(--accent-red)", padding: "6px 12px", fontSize: "12px", height: "32px" }}>
                Reject Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
