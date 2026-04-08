import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Plus, X, Building2, MapPin, Search, Users, Truck } from "lucide-react";
import styles from "./CompanyMaster.module.css";

export default function CompanyMaster() {
  const [quoteCompanies, setQuoteCompanies] = useState([]);
  const [poCompanies, setPoCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ New State for the Toggle Bar
  const [activeTab, setActiveTab] = useState("quotation"); // 'quotation' or 'po'

  // Modal Form States
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [gstType, setGstType] = useState("INTRA");
  const [saving, setSaving] = useState(false);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch both databases at the same time
      const [quoteRes, poRes] = await Promise.all([
        supabase
          .from("companies")
          .select("*")
          .order("company_name", { ascending: true }),
        supabase
          .from("pocompany")
          .select("*")
          .order("name", { ascending: true }),
      ]);

      if (quoteRes.error) throw quoteRes.error;
      if (poRes.error) throw poRes.error;

      setQuoteCompanies(quoteRes.data || []);
      setPoCompanies(poRes.data || []);
    } catch (error) {
      console.error("Error fetching master data:", error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ✅ Dynamically filter based on the Active Tab
  const filteredData = useMemo(() => {
    const activeList = activeTab === "quotation" ? quoteCompanies : poCompanies;

    return activeList.filter((c) => {
      // Note: Quotation DB uses 'company_name', PO DB uses 'name'
      const nameToSearch = activeTab === "quotation" ? c.company_name : c.name;
      return nameToSearch?.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [quoteCompanies, poCompanies, searchTerm, activeTab]);

  async function addCompany(e) {
    e.preventDefault();
    setSaving(true);

    let submitError = null;

    if (activeTab === "quotation") {
      // 🟢 Save to Quotation Companies DB
      const { error } = await supabase.from("companies").insert([
        {
          company_name: companyName,
          address: address,
          gst_type: gstType,
        },
      ]);
      submitError = error;
    } else {
      // 🔵 Save to Purchase Order Vendors DB
      const { error } = await supabase.from("pocompany").insert([
        {
          name: companyName, // pocompany uses 'name'
          address: address,
        },
      ]);
      submitError = error;
    }

    if (!submitError) {
      setCompanyName("");
      setAddress("");
      setGstType("INTRA");
      fetchAllData(); // Refresh the lists
      setIsModalOpen(false);
    } else {
      alert("Error adding company: " + submitError.message);
    }
    setSaving(false);
  }

  // Common Styles for the Toggle Bar
  const tabStyle = (isActive) => ({
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 20px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    fontFamily: "'DM Sans', sans-serif",
    border: "none",
    borderBottom: isActive ? "3px solid #b49448" : "3px solid transparent",
    backgroundColor: isActive ? "#faf8f2" : "transparent",
    color: isActive ? "#b49448" : "#64748b",
    transition: "all 0.2s ease-in-out",
  });

  return (
    <div className={styles.container}>
      {/* --- TOP ROW: Title Left | Button Right --- */}
      <div className={styles.topRow}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Company Master</h1>
          <p className={styles.subtitle}>Manage your Clients and Vendors</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className={styles.addButton}
          style={{
            backgroundColor: activeTab === "quotation" ? "#b49448" : "#3b82f6",
          }} // Changes color based on tab!
        >
          <Plus size={18} style={{ marginRight: "8px" }} />
          Add {activeTab === "quotation" ? "Client" : "Vendor"}
        </button>
      </div>

      {/* --- TOGGLE BAR --- */}
      <div
        style={{
          display: "flex",
          backgroundColor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          marginBottom: "20px",
          overflow: "hidden",
        }}
      >
        <button
          onClick={() => setActiveTab("quotation")}
          style={tabStyle(activeTab === "quotation")}
        >
          <Users size={16} /> Clients (Quotations)
        </button>
        <button
          onClick={() => setActiveTab("po")}
          style={tabStyle(activeTab === "po")}
        >
          <Truck size={16} /> Vendors (Purchase Orders)
        </button>
      </div>

      {/* --- SEARCH ROW --- */}
      <div className={styles.searchRow}>
        <div
          className={styles.searchWrapper}
          style={{ width: "100%", maxWidth: "400px", position: "relative" }}
        >
          <Search
            size={18}
            className={styles.searchIcon}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
            }}
          />
          <input
            type="text"
            placeholder={`Search ${activeTab === "quotation" ? "clients" : "vendors"}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
            style={{
              width: "100%",
              padding: "10px 10px 10px 38px",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
            }}
          />
        </div>
      </div>

      {/* --- DATA TABLE --- */}
      {loading ? (
        <p style={{ color: "#b49448", fontWeight: "bold" }}>
          Loading database...
        </p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <colgroup>
              <col style={{ width: "35%" }} />
              <col style={{ width: "65%" }} />
            </colgroup>
            <thead>
              <tr style={{ backgroundColor: "#0f1a2e" }}>
                <th className={styles.th} style={{ color: "#e8d99a" }}>
                  {activeTab === "quotation" ? "Client Name" : "Vendor Name"}
                </th>
                <th className={styles.th} style={{ color: "#e8d99a" }}>
                  Address
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((c) => (
                <tr key={c.id} className={styles.tr}>
                  <td className={styles.td}>
                    <div
                      className={styles.cellContent}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div
                        className={styles.iconCircle}
                        style={{
                          color:
                            activeTab === "quotation" ? "#b49448" : "#3b82f6",
                        }}
                      >
                        <Building2 size={18} />
                      </div>
                      <span
                        className={styles.companyNameText}
                        style={{ fontWeight: "bold", color: "#1e293b" }}
                      >
                        {activeTab === "quotation" ? c.company_name : c.name}
                      </span>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div
                      className={styles.cellContent}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                      }}
                    >
                      <MapPin
                        size={16}
                        className={styles.textGray}
                        style={{
                          flexShrink: 0,
                          marginTop: "2px",
                          color: "#94a3b8",
                        }}
                      />
                      <span
                        className={styles.addressText}
                        style={{ color: "#475569" }}
                      >
                        {c.address}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td
                    colSpan="2"
                    className={styles.emptyState}
                    style={{
                      padding: "30px",
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
                    No {activeTab === "quotation" ? "clients" : "vendors"} match
                    your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div
          className={styles.overlay}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 50,
          }}
        >
          <div
            className={styles.modal}
            style={{
              backgroundColor: "#fff",
              padding: "24px",
              borderRadius: "8px",
              width: "100%",
              maxWidth: "500px",
            }}
          >
            <div
              className={styles.modalHeader}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <h3
                className={styles.modalTitle}
                style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}
              >
                Add New {activeTab === "quotation" ? "Client" : "Vendor"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className={styles.closeBtn}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={addCompany}
              className={styles.modalForm}
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              <div>
                <label
                  className={styles.label}
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "600",
                    fontSize: "13px",
                  }}
                >
                  {activeTab === "quotation" ? "Client Name" : "Vendor Name"}
                </label>
                <input
                  placeholder="Ex. Stark Industries"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className={styles.input}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                  }}
                />
              </div>

              <div>
                <label
                  className={styles.label}
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "600",
                    fontSize: "13px",
                  }}
                >
                  Full Address
                </label>
                <textarea
                  placeholder="Street, City, State, ZIP..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  className={`${styles.input} ${styles.textarea}`}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    minHeight: "80px",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Only show GST type if we are adding a Quotation Client */}
              {activeTab === "quotation" && (
                <div>
                  <label
                    className={styles.label}
                    style={{
                      display: "block",
                      marginBottom: "5px",
                      fontWeight: "600",
                      fontSize: "13px",
                    }}
                  >
                    GST Type
                  </label>
                  <select
                    value={gstType}
                    onChange={(e) => setGstType(e.target.value)}
                    className={styles.input}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                    }}
                  >
                    <option value="INTRA">INTRA</option>
                    <option value="INTER">INTER</option>
                  </select>
                </div>
              )}

              <div
                className={styles.modalFooter}
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={styles.cancelBtn}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#f1f5f9",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={styles.saveBtn}
                  style={{
                    padding: "8px 16px",
                    backgroundColor:
                      activeTab === "quotation" ? "#b49448" : "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
