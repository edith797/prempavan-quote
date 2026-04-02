import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import {
  Plus,
  Search,
  Loader2,
  Building2,
  Calendar, // ✅ Added Calendar Icon for FY Filter
} from "lucide-react";

// ✅ Helper to calculate Financial Year from a Date string
const getFinancialYear = (dateString) => {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  const month = date.getMonth(); // 0 = Jan, 3 = Apr
  const year = date.getFullYear();

  if (month >= 3) {
    return `${year}-${year + 1}`; // April to December
  } else {
    return `${year - 1}-${year}`; // January to March
  }
};

export default function PurchaseOrderList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");

  // ✅ Added State for Financial Year Filter
  const [selectedFY, setSelectedFY] = useState("");

  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("purchase_orders")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error) setOrders(data || []);
      } catch (error) {
        console.error("Error loading orders:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  const uniqueCompanies = [
    ...new Set(
      orders.map((o) => o.vendor_name || o.company_name).filter(Boolean),
    ),
  ].sort();

  // ✅ Extract unique Financial Years for the dropdown
  const uniqueFYs = useMemo(() => {
    // We use po_date to calculate the FY
    const fys = orders.map((o) => getFinancialYear(o.po_date)).filter(Boolean);
    return [...new Set(fys)].sort((a, b) => b.localeCompare(a)); // Descending order
  }, [orders]);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      (o.vendor_name &&
        o.vendor_name.toLowerCase().includes(search.toLowerCase())) ||
      (o.company_name &&
        o.company_name.toLowerCase().includes(search.toLowerCase())) ||
      (o.po_number && o.po_number.toLowerCase().includes(search.toLowerCase()));

    const matchesCompany =
      !selectedCompany ||
      o.vendor_name === selectedCompany ||
      o.company_name === selectedCompany;

    // ✅ Check FY match
    const oFY = getFinancialYear(o.po_date);
    const matchesFY = selectedFY ? oFY === selectedFY : true;

    return matchesSearch && matchesCompany && matchesFY;
  });

  const inputBase = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "13px",
    border: "1px solid #d4c9b0",
    borderRadius: "3px",
    background: "#fffef9",
    color: "#0f1a2e",
    outline: "none",
    height: "42px",
    boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

  return (
    <>
      {/* Inject Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        .po-list-row:hover { background-color: #f5f0e4 !important; }
        .po-list-row:nth-child(even) { background-color: #faf8f2; }
        .po-list-row:nth-child(odd)  { background-color: #fffef9; }
        .po-view-btn:hover { color: #9c7e38 !important; }
        .po-search-input:focus {
          border-color: #b49448 !important;
          box-shadow: 0 0 0 3px rgba(180,148,72,0.12) !important;
          background: #fff !important;
        }
        .po-select:focus {
          border-color: #b49448 !important;
          box-shadow: 0 0 0 3px rgba(180,148,72,0.12) !important;
          background: #fff !important;
        }
        @keyframes poFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        style={{
          padding: "48px 24px 64px",
          background: "#f5f1e8",
          minHeight: "100vh",
          fontFamily: "'DM Sans', sans-serif",
          animation: "poFadeIn 0.35s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: "28px",
            borderBottom: "1px solid #ddd5bb",
            paddingBottom: "18px",
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "26px",
                fontWeight: 900,
                margin: 0,
                color: "#0f1a2e",
                letterSpacing: "0.3px",
              }}
            >
              Purchase Orders
            </h1>
            <p
              style={{
                color: "#888",
                margin: "5px 0 0 0",
                fontSize: "13px",
                fontWeight: 400,
              }}
            >
              Manage procurement and suppliers
            </p>
          </div>

          <button
            onClick={() => navigate("/admin/purchase-order/create")}
            style={{
              background: "#b49448",
              color: "#fff",
              padding: "0 22px",
              height: "42px",
              borderRadius: "3px",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: "13px",
              letterSpacing: "0.4px",
              boxShadow: "0 2px 8px rgba(180,148,72,0.3)",
              transition: "background 0.18s, transform 0.12s, box-shadow 0.18s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#9c7e38";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 4px 14px rgba(180,148,72,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#b49448";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 2px 8px rgba(180,148,72,0.3)";
            }}
          >
            <Plus size={16} /> Create New PO
          </button>
        </div>

        {/* Search & Filter */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          {/* Search Box */}
          <div style={{ position: "relative", flex: 2, minWidth: "260px" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#b49448",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder="Search by vendor or PO number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="po-search-input"
              style={{
                ...inputBase,
                width: "100%",
                paddingLeft: "38px",
                paddingRight: "12px",
              }}
            />
          </div>

          {/* ✅ Financial Year Dropdown */}
          <div style={{ position: "relative", minWidth: "160px", flex: 1 }}>
            <Calendar
              size={14}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#b49448",
                pointerEvents: "none",
              }}
            />
            <select
              value={selectedFY}
              onChange={(e) => setSelectedFY(e.target.value)}
              className="po-select"
              style={{
                ...inputBase,
                width: "100%",
                paddingLeft: "32px",
                paddingRight: "12px",
                cursor: "pointer",
                appearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23b49448' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 10px center",
                backgroundSize: "1.1em",
              }}
            >
              <option value="">All FY</option>
              {uniqueFYs.map((fy) => (
                <option key={fy} value={fy}>
                  FY {fy}
                </option>
              ))}
            </select>
          </div>

          {/* Company Dropdown */}
          <div style={{ position: "relative", minWidth: "200px", flex: 1 }}>
            <Building2
              size={14}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#b49448",
                pointerEvents: "none",
              }}
            />
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="po-select"
              style={{
                ...inputBase,
                width: "100%",
                paddingLeft: "32px",
                paddingRight: "12px",
                cursor: "pointer",
                appearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23b49448' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 10px center",
                backgroundSize: "1.1em",
              }}
            >
              <option value="">All Companies</option>
              {uniqueCompanies.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div
          style={{
            background: "#fffef9",
            borderRadius: "2px",
            borderTop: "3px solid #b49448",
            border: "1px solid #d4c9b0",
            borderTopWidth: "3px",
            boxShadow:
              "0 2px 4px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.28)",
            overflow: "hidden",
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontFamily: "'DM Sans', sans-serif",
              minWidth: "600px",
            }}
          >
            <thead>
              <tr style={{ background: "#0f1a2e" }}>
                {["PO Number", "Date", "Vendor", "Amount", "Action"].map(
                  (col, i) => (
                    <th
                      key={col}
                      style={{
                        padding: "12px 18px",
                        fontSize: "9.5px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        color: "#e8d99a",
                        textAlign:
                          i === 3 ? "right" : i === 4 ? "center" : "left",
                        whiteSpace: "nowrap",
                        border: "none",
                      }}
                    >
                      {col}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "#b49448",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "13px",
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                    }}
                  >
                    <Loader2
                      size={16}
                      style={{
                        display: "inline",
                        marginRight: "8px",
                        verticalAlign: "middle",
                      }}
                      className="animate-spin"
                    />
                    Loading...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      padding: "48px",
                      textAlign: "center",
                      color: "#b49448",
                      opacity: 0.5,
                      fontStyle: "italic",
                      fontSize: "13px",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    No purchase orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po) => (
                  <tr
                    key={po.id}
                    className="po-list-row"
                    style={{
                      borderBottom: "1px solid #ede8da",
                      transition: "background 0.12s",
                      cursor: "default",
                    }}
                  >
                    <td
                      style={{
                        padding: "13px 18px",
                        fontWeight: 700,
                        fontFamily: "'Courier New', monospace",
                        fontSize: "12px",
                        color: "#0f1a2e",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {po.po_number}
                    </td>
                    <td
                      style={{
                        padding: "13px 18px",
                        color: "#666",
                        fontSize: "13px",
                      }}
                    >
                      {new Date(po.po_date).toLocaleDateString("en-IN")}
                    </td>
                    <td
                      style={{
                        padding: "13px 18px",
                        fontWeight: 600,
                        color: "#0f1a2e",
                        fontSize: "13px",
                      }}
                    >
                      {po.vendor_name || po.company_name}
                    </td>
                    <td
                      style={{
                        padding: "13px 18px",
                        textAlign: "right",
                        fontWeight: 700,
                        color: "#0f1a2e",
                        fontSize: "13px",
                      }}
                    >
                      ₹{" "}
                      {po.total_amount?.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td style={{ padding: "13px 18px", textAlign: "center" }}>
                      <button
                        className="po-view-btn"
                        onClick={() =>
                          navigate(`/admin/purchase-order/${po.id}`)
                        }
                        style={{
                          color: "#b49448",
                          background: "none",
                          border: "1px solid rgba(180,148,72,0.35)",
                          borderRadius: "3px",
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: "11px",
                          fontFamily: "'DM Sans', sans-serif",
                          letterSpacing: "0.8px",
                          textTransform: "uppercase",
                          padding: "5px 14px",
                          transition:
                            "color 0.15s, border-color 0.15s, background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "rgba(180,148,72,0.08)";
                          e.currentTarget.style.borderColor = "#b49448";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "none";
                          e.currentTarget.style.borderColor =
                            "rgba(180,148,72,0.35)";
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
