import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import {
  Plus,
  FileText,
  Search,
  Building2,
  Trash2,
  Edit,
  User,
  Loader2,
  History,
  FilePlus,
} from "lucide-react";
import styles from "./AllQuotations.module.css";

export default function AllQuotations() {
  const [quotes, setQuotes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeLookup, setEmployeeLookup] = useState({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [companySearchInput, setCompanySearchInput] = useState("");
  const [employeeSearchInput, setEmployeeSearchInput] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);

        const { data: empData } = await supabase
          .from("employees")
          .select("user_id, full_name")
          .not("user_id", "is", null);

        const lookup = {};
        const empList = empData || [];
        empList.forEach((e) => {
          if (e.user_id) lookup[e.user_id] = e.full_name;
        });
        setEmployees(empList);
        setEmployeeLookup(lookup);

        const { data, error } = await supabase
          .from("quotations")
          .select(
            `id, quotation_number, quotation_date, total_amount, status,
             created_by, revision_no, is_latest, companies ( company_name )`,
          )
          .order("created_at", { ascending: false });

        if (error) throw error;
        setQuotes(data || []);
      } catch (error) {
        console.error("Error loading data:", error.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!window.confirm("Delete this quotation?")) return;
    const { error } = await supabase.from("quotations").delete().eq("id", id);
    if (!error) setQuotes(quotes.filter((q) => q.id !== id));
  }

  async function handleStatusChange(e, id, newStatus) {
    e.stopPropagation();
    setUpdating(id);
    const { error } = await supabase
      .from("quotations")
      .update({ status: newStatus })
      .eq("id", id);
    if (!error) {
      setQuotes(
        quotes.map((q) => (q.id === id ? { ...q, status: newStatus } : q)),
      );
    }
    setUpdating(null);
  }

  const uniqueCompanies = useMemo(() => {
    const names = quotes.map((q) => q.companies?.company_name).filter(Boolean);
    return [...new Set(names)].sort();
  }, [quotes]);

  const filteredCompanies = uniqueCompanies.filter((c) =>
    c.toLowerCase().includes(companySearchInput.toLowerCase()),
  );

  const filteredEmployees = employees.filter((e) =>
    e.full_name.toLowerCase().includes(employeeSearchInput.toLowerCase()),
  );

  const filteredQuotes = quotes.filter((q) => {
    const matchesSearch = q.quotation_number
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCompany = selectedCompany
      ? q.companies?.company_name === selectedCompany
      : true;
    const matchesUser = filterUser ? q.created_by === filterUser : true;
    return matchesSearch && matchesCompany && matchesUser;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "APPROVED":
        return "#10B981";
      case "REJECTED":
        return "#EF4444";
      default:
        return "#b49448";
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case "APPROVED":
        return "rgba(16,185,129,0.12)";
      case "REJECTED":
        return "rgba(239,68,68,0.10)";
      default:
        return "rgba(180,148,72,0.12)";
    }
  };

  // Shared dropdown container style
  const dropdownStyle = {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "#fffef9",
    border: "1px solid #d4c9b0",
    borderTop: "none",
    maxHeight: "200px",
    overflowY: "auto",
    zIndex: 20,
    borderRadius: "0 0 3px 3px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.10)",
  };

  const dropdownItemBase = {
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: "13px",
    fontFamily: "'DM Sans', sans-serif",
    borderBottom: "1px solid #f0ebe0",
    color: "#2a2a2a",
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>All Quotations</h1>
          <p className={styles.subtitle}>
            View and manage all sales quotations (History included)
          </p>
        </div>
      </div>

      <div className={styles.actionsBar}>
        {/* Quote Search */}
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search quote number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* Company Filter */}
        <div className={styles.filterWrapper}>
          <Building2 size={15} className={styles.filterIcon} />
          <div style={{ position: "relative", width: "100%" }}>
            <input
              type="text"
              placeholder="Filter by company..."
              value={companySearchInput}
              onChange={(e) => {
                setCompanySearchInput(e.target.value);
              }}
              className={styles.filterSelect}
              style={{
                paddingLeft: "32px",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            {companySearchInput && (
              <div style={dropdownStyle}>
                <div
                  onClick={() => {
                    setSelectedCompany("");
                    setCompanySearchInput("");
                  }}
                  style={{
                    ...dropdownItemBase,
                    background: !selectedCompany ? "#f5f0e4" : "transparent",
                    fontWeight: !selectedCompany ? 600 : 400,
                  }}
                >
                  All Companies
                </div>
                {filteredCompanies.map((c) => (
                  <div
                    key={c}
                    onClick={() => {
                      setSelectedCompany(c);
                      setCompanySearchInput(c);
                    }}
                    style={{
                      ...dropdownItemBase,
                      background:
                        selectedCompany === c ? "#f5f0e4" : "transparent",
                      fontWeight: selectedCompany === c ? 600 : 400,
                      color: selectedCompany === c ? "#0f1a2e" : "#2a2a2a",
                    }}
                  >
                    {c}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Employee Filter */}
        <div className={styles.filterWrapper}>
          <User size={15} className={styles.filterIcon} />
          <div style={{ position: "relative", width: "100%" }}>
            <input
              type="text"
              placeholder="Filter by employee..."
              value={employeeSearchInput}
              onChange={(e) => setEmployeeSearchInput(e.target.value)}
              className={styles.filterSelect}
              style={{
                paddingLeft: "32px",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            {employeeSearchInput && (
              <div style={dropdownStyle}>
                <div
                  onClick={() => {
                    setFilterUser("");
                    setEmployeeSearchInput("");
                  }}
                  style={{
                    ...dropdownItemBase,
                    background: !filterUser ? "#f5f0e4" : "transparent",
                    fontWeight: !filterUser ? 600 : 400,
                  }}
                >
                  All Employees
                </div>
                {filteredEmployees.map((e) => (
                  <div
                    key={e.user_id}
                    onClick={() => {
                      setFilterUser(e.user_id);
                      setEmployeeSearchInput(e.full_name);
                    }}
                    style={{
                      ...dropdownItemBase,
                      background:
                        filterUser === e.user_id ? "#f5f0e4" : "transparent",
                      fontWeight: filterUser === e.user_id ? 600 : 400,
                      color: filterUser === e.user_id ? "#0f1a2e" : "#2a2a2a",
                    }}
                  >
                    {e.full_name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => navigate("/admin/quotations/new")}
          className={styles.createButton}
        >
          <Plus size={16} style={{ marginRight: "6px" }} /> Create
        </button>
      </div>

      {loading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "40px",
            color: "#b49448",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            letterSpacing: "1px",
            textTransform: "uppercase",
          }}
        >
          <Loader2 size={18} className="animate-spin" /> Loading...
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Quote No</th>
                <th className={styles.th}>Created By</th>
                <th className={styles.th}>Company</th>
                <th className={styles.th}>Date</th>
                <th className={styles.th}>Total</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th} style={{ textAlign: "right" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map((q) => (
                <tr
                  key={q.id}
                  className={styles.tr}
                  onClick={() => navigate(`/admin/quotations/${q.id}`)}
                  style={{ opacity: q.is_latest ? 1 : 0.65 }}
                >
                  {/* Quote Number */}
                  <td className={styles.td}>
                    <div className={styles.cellContent}>
                      {q.is_latest ? (
                        <FileText size={15} color="#b49448" />
                      ) : (
                        <History size={15} color="#aaa" />
                      )}
                      <span
                        style={{
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        {q.quotation_number}
                        {q.revision_no > 0 && (
                          <span
                            style={{
                              fontSize: "9px",
                              background: "rgba(180,148,72,0.12)",
                              color: "#78590e",
                              padding: "2px 6px",
                              borderRadius: "2px",
                              fontWeight: 700,
                              letterSpacing: "0.5px",
                            }}
                          >
                            REV-{q.revision_no}
                          </span>
                        )}
                        {!q.is_latest && (
                          <span
                            style={{
                              fontSize: "9px",
                              background: "rgba(180,148,72,0.08)",
                              color: "#b49448",
                              padding: "2px 5px",
                              borderRadius: "2px",
                              border: "1px solid rgba(180,148,72,0.3)",
                              fontWeight: 700,
                              letterSpacing: "0.5px",
                            }}
                          >
                            HISTORY
                          </span>
                        )}
                      </span>
                    </div>
                  </td>

                  {/* Created By */}
                  <td className={styles.td}>
                    <span style={{ fontSize: "13px", color: "#555" }}>
                      {employeeLookup[q.created_by] || "Admin/System"}
                    </span>
                  </td>

                  {/* Company */}
                  <td
                    className={styles.td}
                    style={{ color: "#0f1a2e", fontWeight: 600 }}
                  >
                    {q.companies?.company_name || "Unknown"}
                  </td>

                  {/* Date */}
                  <td className={styles.td} style={{ color: "#666" }}>
                    {new Date(q.quotation_date).toLocaleDateString("en-IN")}
                  </td>

                  {/* Total */}
                  <td
                    className={styles.td}
                    style={{ fontWeight: 700, color: "#0f1a2e" }}
                  >
                    ₹ {Number(q.total_amount).toLocaleString("en-IN")}
                  </td>

                  {/* Status */}
                  <td
                    className={styles.td}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {updating === q.id ? (
                      <Loader2
                        size={15}
                        style={{ color: "#b49448" }}
                        className="animate-spin"
                      />
                    ) : (
                      <select
                        value={q.status || "DRAFT"}
                        onChange={(e) =>
                          handleStatusChange(e, q.id, e.target.value)
                        }
                        disabled={!q.is_latest}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "2px",
                          border: "1px solid",
                          borderColor: q.is_latest
                            ? getStatusColor(q.status) + "55"
                            : "#ddd",
                          fontSize: "11px",
                          fontWeight: 700,
                          fontFamily: "'DM Sans', sans-serif",
                          letterSpacing: "0.5px",
                          textTransform: "uppercase",
                          color: q.is_latest
                            ? getStatusColor(q.status)
                            : "#aaa",
                          backgroundColor: q.is_latest
                            ? getStatusBg(q.status)
                            : "#f5f5f5",
                          cursor: q.is_latest ? "pointer" : "not-allowed",
                          outline: "none",
                        }}
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    )}
                  </td>

                  {/* Actions */}
                  <td className={styles.td}>
                    <div className={styles.actionsCell}>
                      {q.is_latest && (
                        <>
                          <button
                            className={styles.actionBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/quotations/edit/${q.id}`);
                            }}
                            title="Edit Quotation"
                          >
                            <Edit size={15} color="#b49448" />
                          </button>

                          {q.revision_no < 1 && (
                            <button
                              className={styles.actionBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/quotations/edit/${q.id}`, {
                                  state: { isRevise: true },
                                });
                              }}
                              title="Create Revision"
                            >
                              <FilePlus size={15} color="#7c5cbf" />
                            </button>
                          )}
                        </>
                      )}
                      <button
                        className={styles.actionBtn}
                        onClick={(e) => handleDelete(e, q.id)}
                        title="Delete"
                      >
                        <Trash2 size={15} color="#ef4444" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
