import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
// ✅ IMPORT THE NEW PO UTIL
import { getNextPONumber } from "../../components/quotationUtils";
import {
  Printer,
  Trash2,
  Save,
  ArrowLeft,
  Layout,
  Loader2,
  Search,
} from "lucide-react";
import "./PurchaseOrder.css";

export default function CreatePurchaseOrder() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [vendors, setVendors] = useState([]);

  // Search States
  const [vendorSearch, setVendorSearch] = useState("");
  const [showVendorList, setShowVendorList] = useState(false);
  const dropdownRef = useRef(null);

  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [vendorDetails, setVendorDetails] = useState({ name: "", address: "" });

  const [items, setItems] = useState([
    {
      id: 1,
      drgNo: "",
      description: "",
      quotationNo: "",
      qty: 1,
      price: "",
      disPercent: "",
      customer: "",
      delivery: "IMMEDIATE",
    },
  ]);

  const safeNum = (val) => {
    if (val === "" || val === null || val === undefined) return 0;
    return Number(val);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const calculateNetPrice = (item) => {
    const price = safeNum(item.price);
    const disc = safeNum(item.disPercent);
    return price - price * (disc / 100);
  };

  const calculateRowTotal = (item) => {
    return calculateNetPrice(item) * safeNum(item.qty);
  };

  const totalAmount = items.reduce(
    (acc, item) => acc + calculateRowTotal(item),
    0,
  );
  const totalQty = items.reduce((acc, item) => acc + safeNum(item.qty), 0);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowVendorList(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        const [settingsRes, vendorsRes] = await Promise.all([
          supabase.from("system_settings").select("*").maybeSingle(),
          supabase.from("pocompany").select("*").order("name"),
        ]);

        if (isMounted) {
          setSettings(
            settingsRes.data || {
              company_name: "PREMPAVAN ENGINEERS INDIA PVT LTD",
              address: "Coimbatore",
              phone: "",
              email: "",
              gstin: "",
            },
          );
          if (vendorsRes.data) setVendors(vendorsRes.data);
          setInitialLoading(false);
        }
      } catch (error) {
        console.error(error);
      }
    }
    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!id) {
      const genNum = async () => {
        // ✅ USES THE NEW FINANCIAL YEAR LOGIC FOR POs
        const nextNum = await getNextPONumber(supabase);
        if (isMounted) setPoNumber(nextNum);
      };
      genNum();
      return;
    }

    async function loadPO() {
      setLoading(true);
      const { data: po } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("id", id)
        .single();
      if (po && isMounted) {
        setPoNumber(po.po_number);
        setPoDate(po.po_date);
        setContactPerson(po.contact_person || "");
        setSelectedVendorId(po.vendor_id || "");
        setVendorDetails({ name: po.vendor_name, address: po.vendor_address });
        setVendorSearch(po.vendor_name);

        const { data: poItems } = await supabase
          .from("purchase_order_items")
          .select("*")
          .eq("po_id", id)
          .order("id");
        if (poItems) {
          setItems(
            poItems.map((i) => ({
              id: i.id,
              drgNo: i.drg_no,
              description: i.description,
              quotationNo: i.quotation_ref,
              qty: i.quantity,
              price: i.price === 0 ? "" : i.price,
              disPercent: i.discount_percent === 0 ? "" : i.discount_percent,
              customer: i.customer_ref || "",
              delivery: i.delivery_date,
            })),
          );
        }
      }
      if (isMounted) setLoading(false);
    }
    loadPO();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const selectVendor = (v) => {
    setSelectedVendorId(v.id);
    setVendorDetails({ name: v.name, address: v.address || "" });
    setVendorSearch(v.name);
    setShowVendorList(false);
  };

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase()),
  );

  const handleItemChange = (id, field, value) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const addItem = () =>
    setItems([
      ...items,
      {
        id: Date.now(),
        drgNo: "",
        description: "",
        quotationNo: "",
        qty: 1,
        price: "",
        disPercent: "",
        customer: "",
        delivery: "IMMEDIATE",
      },
    ]);

  const removeItem = (id) => {
    if (items.length > 1) setItems(items.filter((item) => item.id !== id));
  };

  const handleSave = async () => {
    if (!selectedVendorId && !vendorDetails.name)
      return alert("Select a Vendor first.");

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const poPayload = {
        po_date: poDate,
        vendor_id: selectedVendorId || null,
        vendor_name: vendorDetails.name,
        vendor_address: vendorDetails.address,
        contact_person: contactPerson,
        total_quantity: totalQty,
        total_amount: totalAmount,
        created_by: user?.id,
      };

      let finalSavedId = id;

      if (id) {
        // UPDATE EXISTING
        await supabase
          .from("purchase_orders")
          .update({ ...poPayload, po_number: poNumber })
          .eq("id", id);
        await supabase.from("purchase_order_items").delete().eq("po_id", id);
      } else {
        // ✅ NEW PO: Auto-Retry Loop to Fix Duplicate Keys!
        let activePoNo = poNumber;
        let dbInsertError = null;

        for (let i = 0; i < 10; i++) {
          const { data, error } = await supabase
            .from("purchase_orders")
            .insert([{ ...poPayload, po_number: activePoNo }])
            .select()
            .single();

          if (error) {
            if (error.code === "23505") {
              // 409 Duplicate Key Detected
              const parts = activePoNo.split("-");
              if (parts.length > 0) {
                const lastPart = parts[parts.length - 1];
                let num = parseInt(lastPart, 10);
                parts[parts.length - 1] = String(num + 1).padStart(
                  lastPart.length,
                  "0",
                );
                activePoNo = parts.join("-");
                dbInsertError = error;
                continue; // Retry with next number
              }
            }
            throw error; // Other error, break out
          }
          finalSavedId = data.id;
          dbInsertError = null;
          break; // Success!
        }

        if (dbInsertError)
          throw new Error(
            "Failed to generate a unique PO number. Please try again.",
          );
      }

      const itemsPayload = items.map((i) => ({
        po_id: finalSavedId,
        drg_no: i.drgNo,
        description: i.description,
        quotation_ref: i.quotationNo,
        quantity: safeNum(i.qty),
        price: safeNum(i.price),
        discount_percent: safeNum(i.disPercent),
        net_price: calculateNetPrice(i),
        total_price: calculateRowTotal(i),
        customer_ref: i.customer,
        delivery_date: i.delivery,
      }));

      await supabase.from("purchase_order_items").insert(itemsPayload);
      alert("Saved Successfully!");
      navigate("/admin/purchase-orders");
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // --- PERFECT BROWSER PRINT LOGIC ---
  const handlePrint = () => {
    const iframe = document.createElement("iframe");
    iframe.style.visibility = "hidden";
    iframe.style.position = "absolute";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    document.body.appendChild(iframe);

    const poContentHTML = document.getElementById("po-content").outerHTML;

    const styles = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style'),
    )
      .map((style) => style.outerHTML)
      .join("");

    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${poNumber}</title>
          ${styles}
          <style>
            @page { size: landscape; margin: 10mm; }
            body { background-color: #fff !important; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
            #po-content { width: 100% !important; max-width: none !important; box-shadow: none !important; padding: 0 !important; }
            .no-print, .vendor-search-container, [data-html2canvas-ignore="true"] { display: none !important; }
            .po-input { border: none !important; background: transparent !important; color: #000 !important; resize: none !important; appearance: none !important; padding: 0 !important; font-size: 11px !important;}
            .po-table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse; }
            .po-table th, .po-table td { border: 1px solid #000 !important; font-size: 10px !important; padding: 6px !important; }
            .po-table th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #000 !important; }
            
            /* GUARANTEE MULTI-PAGE REPEATING HEADERS */
            .master-print-table { width: 100%; border-collapse: collapse; }
            .master-print-table > thead { display: table-header-group; }
            .master-print-table > tbody { display: table-row-group; }
            .po-item-row { page-break-inside: avoid !important; }
          </style>
        </head>
        <body>
          ${poContentHTML}
        </body>
      </html>
    `);
    iframeDoc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  };

  if (initialLoading)
    return (
      <div className="p-10 flex gap-2 justify-center">
        <Loader2 className="animate-spin" /> Loading...
      </div>
    );

  return (
    <div className="po-screen-container">
      {/* ACTION BAR */}
      <div className="po-action-bar no-print">
        <button
          onClick={() => navigate("/admin/purchase-orders")}
          className="po-btn po-btn-back"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="po-btn po-btn-save"
        >
          <Save size={16} /> {loading ? "Saving..." : "Save PO"}
        </button>
        {id && (
          <button onClick={handlePrint} className="po-btn po-btn-print">
            <Printer size={16} /> Print
          </button>
        )}
      </div>

      <div id="po-content" className="po-paper">
        {/* MASTER TABLE: Repeats the Header on every page, but NOT the footer */}
        <table
          className="master-print-table"
          style={{ width: "100%", borderCollapse: "collapse", border: "none" }}
        >
          {/* --- REPEATING HEADER --- */}
          <thead>
            <tr>
              <td style={{ padding: 0, border: "none" }}>
                <div className="po-header">
                  <div className="po-logo-section">
                    <div className="po-logo-box">
                      {settings.company_logo_url ? (
                        <img src={settings.company_logo_url} alt="Logo" />
                      ) : (
                        <Layout size={24} className="text-slate-300" />
                      )}
                    </div>
                    <div className="po-company-info">
                      <h1>{settings.company_name}</h1>
                      <p style={{ whiteSpace: "pre-wrap" }}>
                        {settings.address}
                      </p>
                      <p>
                        <strong>PH:</strong> {settings.phone} |{" "}
                        <strong>EMAIL:</strong> {settings.email}
                      </p>
                      <p>
                        <strong>GSTIN:</strong> {settings.gstin}
                      </p>
                    </div>
                  </div>
                  <div className="po-title-section">
                    <h2>
                      PURCHASE
                      <br />
                      ORDER
                    </h2>
                  </div>
                </div>

                <div className="po-info-grid">
                  <div>
                    <div className="po-section-title">VENDOR DETAILS</div>
                    <div
                      className="vendor-search-container no-print"
                      ref={dropdownRef}
                      data-html2canvas-ignore="true"
                      style={{ position: "relative" }}
                    >
                      <div
                        className="search-input-wrapper"
                        style={{ position: "relative" }}
                      >
                        <input
                          type="text"
                          className="po-input search-input"
                          placeholder="Search vendor name..."
                          value={vendorSearch}
                          onChange={(e) => {
                            setVendorSearch(e.target.value);
                            setShowVendorList(true);
                          }}
                          onFocus={() => setShowVendorList(true)}
                        />
                        <Search
                          size={14}
                          className="search-icon"
                          style={{
                            position: "absolute",
                            right: 8,
                            top: 10,
                            color: "#94a3b8",
                          }}
                        />
                      </div>
                      {showVendorList && (
                        <div className="vendor-dropdown">
                          {filteredVendors.length > 0 ? (
                            filteredVendors.map((v) => (
                              <div
                                key={v.id}
                                className="vendor-option"
                                onClick={() => selectVendor(v)}
                              >
                                <div
                                  style={{
                                    fontWeight: "600",
                                    fontSize: "13px",
                                  }}
                                >
                                  {v.name}
                                </div>
                                <div
                                  style={{ fontSize: "11px", color: "#64748b" }}
                                >
                                  {v.address?.substring(0, 40)}...
                                </div>
                              </div>
                            ))
                          ) : (
                            <div
                              style={{
                                padding: "8px 12px",
                                color: "#94a3b8",
                                fontSize: "13px",
                              }}
                            >
                              No vendors found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="po-vendor-name">
                      {vendorDetails.name || ""}
                    </div>
                    <div className="po-vendor-addr">
                      {vendorDetails.address || ""}
                    </div>
                  </div>

                  <div>
                    <div className="po-section-title">ORDER DETAILS</div>
                    <div className="po-detail-row">
                      <span className="po-label">PO NUMBER</span>
                      <input
                        className="po-input bold mono"
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                      />
                    </div>
                    <div className="po-detail-row">
                      <span className="po-label">DATE</span>
                      <input
                        type="date"
                        className="po-input"
                        value={poDate}
                        onChange={(e) => setPoDate(e.target.value)}
                      />
                    </div>
                    <div className="po-detail-row">
                      <span className="po-label">CONTACT</span>
                      <input
                        className="po-input"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </thead>

          {/* --- MULTI-PAGE BODY --- */}
          <tbody>
            <tr>
              <td style={{ padding: 0, border: "none" }}>
                <div className="po-table-container">
                  <table className="po-table">
                    <thead>
                      <tr>
                        <th style={{ width: "4%", textAlign: "center" }}>#</th>
                        <th style={{ width: "10%" }}>DRG. NO</th>
                        <th style={{ width: "24%" }}>DESCRIPTION</th>
                        <th style={{ width: "8%" }}>DELIVERY</th>
                        <th style={{ width: "8%", textAlign: "center" }}>
                          QUOTE
                        </th>
                        <th style={{ width: "5%", textAlign: "center" }}>
                          QTY
                        </th>
                        <th style={{ width: "8%", textAlign: "right" }}>
                          PRICE
                        </th>
                        <th style={{ width: "5%", textAlign: "center" }}>
                          DIS%
                        </th>
                        <th style={{ width: "8%", textAlign: "right" }}>NET</th>
                        <th style={{ width: "8%" }}>CUSTOMER</th>
                        <th style={{ width: "12%", textAlign: "right" }}>
                          TOTAL
                        </th>
                        <th
                          className="no-print"
                          data-html2canvas-ignore="true"
                          style={{ width: "0%" }}
                        ></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={item.id} className="po-item-row">
                          <td style={{ textAlign: "center" }}>{idx + 1}</td>
                          <td>
                            <input
                              className="po-input"
                              value={item.drgNo}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "drgNo",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                          <td>
                            <textarea
                              rows={1}
                              className="po-input bold auto-expand"
                              value={item.description}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "description",
                                  e.target.value,
                                )
                              }
                              style={{ height: "auto", overflow: "hidden" }}
                              onInput={(e) => {
                                e.target.style.height = "auto";
                                e.target.style.height =
                                  e.target.scrollHeight + "px";
                              }}
                            />
                          </td>
                          <td>
                            <input
                              className="po-input italic"
                              value={item.delivery}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "delivery",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              className="po-input center"
                              value={item.quotationNo}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "quotationNo",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="po-input center"
                              value={item.qty}
                              onChange={(e) =>
                                handleItemChange(item.id, "qty", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="po-input right"
                              value={item.price}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "price",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="po-input center"
                              value={item.disPercent}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "disPercent",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                          <td className="right">
                            {calculateNetPrice(item) !== 0
                              ? formatCurrency(calculateNetPrice(item))
                              : ""}
                          </td>
                          <td>
                            <input
                              className="po-input"
                              value={item.customer}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "customer",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                          <td className="right bold">
                            {calculateRowTotal(item) !== 0
                              ? formatCurrency(calculateRowTotal(item))
                              : ""}
                          </td>
                          <td
                            className="no-print"
                            data-html2canvas-ignore="true"
                          >
                            <button
                              onClick={() => removeItem(item.id)}
                              className="po-del-btn"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    onClick={addItem}
                    className="po-add-row-btn no-print"
                    data-html2canvas-ignore="true"
                  >
                    + Add Item
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* --- NON-REPEATING FOOTER (Only prints on the final page) --- */}
        <div className="po-footer">
          <div className="po-sign-section">
            <div className="po-sign-box">
              <p>Authorized Signatory</p>
              <div className="po-sign-name">R NITHYA</div>
            </div>
          </div>
          <div className="po-totals-box">
            <div>
              <div className="po-total-row">
                <span className="po-total-label">Total Qty</span>
                <span className="po-total-value">{totalQty.toFixed(2)}</span>
              </div>
              <div className="po-total-row po-grand-total">
                <span className="po-total-label">Total Amount</span>
                <span className="po-total-value">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
