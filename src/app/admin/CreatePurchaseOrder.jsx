import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { getNextPONumber } from "../../components/quotationUtils";
import html2pdf from "html2pdf.js";
import {
  Trash2,
  Save,
  ArrowLeft,
  Layout,
  Loader2,
  Search,
  FileDown,
} from "lucide-react";
import "./PurchaseOrder.css";

export default function CreatePurchaseOrder() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [pdfLoading, setPdfLoading] = useState(false);

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

  const safeNum = (val) =>
    val === "" || val === null || val === undefined ? 0 : Number(val);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);

  const calculateNetPrice = (item) => {
    const p = safeNum(item.price);
    const d = safeNum(item.disPercent);
    return p - p * (d / 100);
  };
  const calculateRowTotal = (item) =>
    calculateNetPrice(item) * safeNum(item.qty);
  const totalAmount = items.reduce(
    (acc, item) => acc + calculateRowTotal(item),
    0,
  );
  const totalQty = items.reduce((acc, item) => acc + safeNum(item.qty), 0);

  useEffect(() => {
    const h = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowVendorList(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [sr, vr] = await Promise.all([
          supabase.from("system_settings").select("*").maybeSingle(),
          supabase.from("pocompany").select("*").order("name"),
        ]);
        if (!alive) return;
        setSettings(
          sr.data || {
            company_name: "PREMPAVAN ENGINEERS INDIA PVT LTD",
            address: "Coimbatore",
            phone: "",
            email: "",
            gstin: "",
          },
        );
        if (vr.data) setVendors(vr.data);
        setInitialLoading(false);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    if (!id) {
      (async () => {
        const n = await getNextPONumber(supabase);
        if (alive) setPoNumber(n);
      })();
      return () => {
        alive = false;
      };
    }
    (async () => {
      setLoading(true);
      const { data: po } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("id", id)
        .single();
      if (po && alive) {
        setPoNumber(po.po_number);
        setPoDate(po.po_date);
        setContactPerson(po.contact_person || "");
        setSelectedVendorId(po.vendor_id || "");
        setVendorDetails({ name: po.vendor_name, address: po.vendor_address });
        setVendorSearch(po.vendor_name);
        const { data: pi } = await supabase
          .from("purchase_order_items")
          .select("*")
          .eq("po_id", id)
          .order("id");
        if (pi)
          setItems(
            pi.map((i) => ({
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
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
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
  const handleItemChange = (itemId, field, value) =>
    setItems(
      items.map((i) => (i.id === itemId ? { ...i, [field]: value } : i)),
    );
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
  const removeItem = (itemId) => {
    if (items.length > 1) setItems(items.filter((i) => i.id !== itemId));
  };
  const autoExpand = (e) => {
    const el = e.target;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
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
        await supabase
          .from("purchase_orders")
          .update({ ...poPayload, po_number: poNumber })
          .eq("id", id);
        await supabase.from("purchase_order_items").delete().eq("po_id", id);
      } else {
        let activePoNo = poNumber,
          dbInsertError = null;
        for (let i = 0; i < 10; i++) {
          const { data, error } = await supabase
            .from("purchase_orders")
            .insert([{ ...poPayload, po_number: activePoNo }])
            .select()
            .single();
          if (error) {
            if (error.code === "23505") {
              const parts = activePoNo.split("-");
              const last = parts[parts.length - 1];
              parts[parts.length - 1] = String(parseInt(last, 10) + 1).padStart(
                last.length,
                "0",
              );
              activePoNo = parts.join("-");
              dbInsertError = error;
              continue;
            }
            throw error;
          }
          finalSavedId = data.id;
          dbInsertError = null;
          break;
        }
        if (dbInsertError)
          throw new Error(
            "Failed to generate a unique PO number. Please try again.",
          );
      }
      await supabase.from("purchase_order_items").insert(
        items.map((i) => ({
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
        })),
      );
      alert("Saved Successfully!");
      navigate("/admin/purchase-orders");
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsPdf = async () => {
    if (!id) {
      alert("Please save the PO first before downloading as PDF.");
      return;
    }
    const element = document.getElementById("po-content");
    if (!element) return;
    setPdfLoading(true);

    try {
      const options = {
        margin: [5, 6, 5, 6],
        filename: `PO-${poNumber}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc) => {
            const paper = clonedDoc.getElementById("po-content");
            if (!paper) return;

            Object.assign(paper.style, {
              boxShadow: "none",
              minWidth: "unset",
              width: "100%",
              maxWidth: "none",
              padding: "6mm 8mm 6mm",
              background: "#fffef9",
              borderTop: "4px solid #b49448",
              boxSizing: "border-box",
              margin: "0",
              // ✅ FLEXBOX + MIN-HEIGHT forces footer to the bottom!
              display: "flex",
              flexDirection: "column",
              minHeight: "180mm",
              position: "relative",
            });

            [
              ".po-action-bar",
              ".no-print",
              ".po-add-row-btn",
              ".po-del-btn",
              ".vendor-search-container",
              ".search-icon",
            ].forEach((sel) =>
              clonedDoc.querySelectorAll(sel).forEach((el) => {
                el.style.display = "none";
              }),
            );

            clonedDoc
              .querySelectorAll(".po-table td input, .po-table td textarea")
              .forEach((el) => {
                el.style.display = "none";
              });

            clonedDoc.querySelectorAll(".print-val").forEach((el) => {
              Object.assign(el.style, {
                display: "block",
                fontFamily: '"DM Sans", sans-serif',
                fontSize: "7.5pt",
                lineHeight: "1.4",
                color: "#000",
                padding: "1px 3px",
                height: "auto",
                maxHeight: "none",
                minHeight: "0",
                overflow: "visible",
                background: "transparent",
                border: "none",
                whiteSpace: "normal",
                wordBreak: "normal",
              });
            });

            // ✅ TEXT WRAPPING FIX FOR PDF (Applies to DRG No & QUOTE No)
            clonedDoc
              .querySelectorAll(".print-val.break-text")
              .forEach((el) => {
                el.style.whiteSpace = "normal";
                el.style.wordBreak = "break-all";
                el.style.overflowWrap = "break-word";
              });

            clonedDoc.querySelectorAll(".print-val.desc").forEach((el) => {
              el.style.whiteSpace = "pre-wrap";
              el.style.wordBreak = "break-word";
              el.style.fontWeight = "700";
            });
            clonedDoc.querySelectorAll(".print-val.nowrap").forEach((el) => {
              el.style.whiteSpace = "nowrap";
              el.style.wordBreak = "normal";
              el.style.overflowWrap = "normal";
            });
            clonedDoc.querySelectorAll(".print-val.bold").forEach((el) => {
              el.style.fontWeight = "700";
            });
            clonedDoc.querySelectorAll(".print-val.right").forEach((el) => {
              el.style.textAlign = "right";
            });
            clonedDoc.querySelectorAll(".print-val.center").forEach((el) => {
              el.style.textAlign = "center";
            });
            clonedDoc.querySelectorAll(".print-val.italic").forEach((el) => {
              el.style.fontStyle = "italic";
            });

            clonedDoc.querySelectorAll(".po-input").forEach((el) => {
              Object.assign(el.style, {
                border: "none",
                background: "transparent",
                boxShadow: "none",
                outline: "none",
                color: "#000",
                padding: "0 2px",
                fontSize: "7.5pt",
              });
            });

            clonedDoc.querySelectorAll(".po-table th").forEach((th) => {
              Object.assign(th.style, {
                backgroundColor: "#0f1a2e",
                color: "#e8d99a",
                whiteSpace: "normal",
                overflow: "visible",
                fontSize: "6.5pt",
                padding: "4px 3px",
                lineHeight: "1.2",
              });
            });

            clonedDoc
              .querySelectorAll(".po-table tbody tr")
              .forEach((tr, i) => {
                const bg = i % 2 === 0 ? "#fffef9" : "#faf8f2";
                tr.querySelectorAll("td").forEach((td) => {
                  Object.assign(td.style, {
                    backgroundColor: bg,
                    padding: "1px 3px",
                    fontSize: "7.5pt",
                    height: "auto",
                    overflow: "visible",
                  });
                });
              });

            clonedDoc.querySelectorAll(".po-section-title").forEach((el) => {
              el.style.color = "#b49448";
              el.style.borderBottom = "none";
              el.style.fontSize = "7px";
              el.style.marginBottom = "4px";
              el.style.paddingBottom = "2px";
            });

            clonedDoc.querySelectorAll(".po-grand-total").forEach((el) => {
              el.style.borderTopColor = "#b49448";
            });

            clonedDoc.querySelectorAll(".po-header").forEach((el) => {
              el.style.borderBottom = "2px solid #0f1a2e";
              el.style.paddingBottom = "8px";
              el.style.marginBottom = "3px";
              const goldLine = clonedDoc.createElement("div");
              goldLine.style.cssText =
                "height:1px;background:#b49448;margin-bottom:8px;width:100%;";
              el.after(goldLine);
            });

            clonedDoc.querySelectorAll(".po-company-info h1").forEach((el) => {
              el.style.fontSize = "11px";
              el.style.marginBottom = "2px";
            });
            clonedDoc.querySelectorAll(".po-title-section h2").forEach((el) => {
              el.style.fontSize = "16px";
            });
            clonedDoc.querySelectorAll(".po-company-info p").forEach((el) => {
              el.style.fontSize = "8.5px";
              el.style.margin = "1px 0";
            });
            clonedDoc.querySelectorAll(".po-logo-box img").forEach((el) => {
              el.style.maxHeight = "48px";
            });
            clonedDoc.querySelectorAll(".po-vendor-name").forEach((el) => {
              el.style.fontSize = "11px";
              el.style.marginBottom = "2px";
            });
            clonedDoc.querySelectorAll(".po-vendor-addr").forEach((el) => {
              el.style.fontSize = "8.5px";
              el.style.lineHeight = "1.3";
            });
            clonedDoc.querySelectorAll(".po-label").forEach((el) => {
              el.style.fontSize = "7px";
            });
            clonedDoc.querySelectorAll(".po-detail-row").forEach((el) => {
              el.style.marginBottom = "1px";
            });

            const infoGrid = paper.querySelector(".po-info-grid");
            if (infoGrid) {
              infoGrid.style.gap = "12px";
              infoGrid.style.marginBottom = "6px";
            }

            const tableContainer = paper.querySelector(".po-table-container");
            if (tableContainer) {
              tableContainer.style.marginTop = "6px";
              tableContainer.style.marginBottom = "6px";
              tableContainer.style.overflow = "visible";
              // ✅ Allow the table to grow, helping push footer down
              tableContainer.style.flexGrow = "1";
            }

            const footer = paper.querySelector(".po-footer");
            if (footer) {
              // ✅ MARGIN-TOP AUTO forces the footer to stick to the absolute bottom!
              footer.style.marginTop = "auto";
              footer.style.paddingTop = "6px";
              footer.style.pageBreakInside = "avoid";
              footer.style.breakInside = "avoid";
            }
            clonedDoc.querySelectorAll(".po-sign-box p").forEach((el) => {
              el.style.fontSize = "7px";
            });
            clonedDoc.querySelectorAll(".po-sign-name").forEach((el) => {
              el.style.fontSize = "10px";
            });
            clonedDoc.querySelectorAll(".po-total-label").forEach((el) => {
              el.style.fontSize = "7.5px";
            });
            clonedDoc.querySelectorAll(".po-total-value").forEach((el) => {
              el.style.fontSize = "10px";
            });
            clonedDoc.querySelectorAll(".po-total-row").forEach((el) => {
              el.style.padding = "3px 0";
              el.style.width = "220px";
            });
            clonedDoc
              .querySelectorAll(".po-grand-total .po-total-value")
              .forEach((el) => {
                el.style.fontSize = "16px";
              });

            return new Promise((resolve) => setTimeout(resolve, 800));
          },
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "landscape",
          compress: true,
        },
        pagebreak: {
          mode: ["avoid-all", "css", "legacy"],
          avoid: [".po-item-row", ".po-footer"],
        },
      };

      await html2pdf().set(options).from(element).save();
    } catch (e) {
      alert("PDF generation failed: " + e.message);
    } finally {
      setPdfLoading(false);
    }
  };

  if (initialLoading)
    return (
      <div className="p-10 flex gap-2 justify-center">
        <Loader2 className="animate-spin" /> Loading...
      </div>
    );

  return (
    <div className="po-screen-container">
      {/* ACTION BAR (PRINT BUTTON REMOVED) */}
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
          <button
            onClick={handleSaveAsPdf}
            disabled={pdfLoading}
            className="po-btn po-btn-pdf"
          >
            <FileDown size={16} />{" "}
            {pdfLoading ? "Generating..." : "Save as PDF"}
          </button>
        )}
      </div>

      {/* PAPER */}
      <div id="po-content" className="po-paper">
        <table
          className="master-print-table"
          style={{ width: "100%", borderCollapse: "collapse", border: "none" }}
        >
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

          <tbody>
            <tr>
              <td style={{ padding: 0, border: "none" }}>
                <div className="po-table-container">
                  <table className="po-table">
                    <thead>
                      <tr>
                        <th style={{ width: "3%", textAlign: "center" }}>#</th>
                        <th style={{ width: "9%" }}>DRG. NO</th>
                        <th style={{ width: "26%" }}>DESCRIPTION</th>
                        <th style={{ width: "10%" }}>DELIVERY</th>
                        <th style={{ width: "7%", textAlign: "center" }}>
                          QUOTE
                        </th>
                        <th style={{ width: "4%", textAlign: "center" }}>
                          QTY
                        </th>
                        <th style={{ width: "8%", textAlign: "right" }}>
                          PRICE
                        </th>
                        <th style={{ width: "5%", textAlign: "center" }}>
                          DIS%
                        </th>
                        <th style={{ width: "9%", textAlign: "right" }}>NET</th>
                        <th style={{ width: "9%" }}>CUSTOMER</th>
                        <th style={{ width: "10%", textAlign: "right" }}>
                          TOTAL
                        </th>
                        <th className="no-print" style={{ width: "0%" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={item.id} className="po-item-row">
                          <td style={{ textAlign: "center" }}>{idx + 1}</td>
                          <td>
                            <div className="cell-wrap">
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
                              <div className="print-val break-text">
                                {item.drgNo}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="cell-wrap">
                              <textarea
                                rows={1}
                                className="po-input bold"
                                value={item.description}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.id,
                                    "description",
                                    e.target.value,
                                  )
                                }
                                onInput={autoExpand}
                                style={{
                                  height: "auto",
                                  overflow: "hidden",
                                  resize: "none",
                                  scrollbarWidth: "none",
                                  msOverflowStyle: "none",
                                  display: "block",
                                }}
                              />
                              <div className="print-val desc">
                                {item.description}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="cell-wrap">
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
                              <div className="print-val italic nowrap">
                                {item.delivery}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="cell-wrap">
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
                              {/* ✅ QUOTE NUMBER FIX: Added break-text so it wraps perfectly! */}
                              <div className="print-val center break-text">
                                {item.quotationNo}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="cell-wrap">
                              <input
                                type="number"
                                className="po-input center"
                                value={item.qty}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.id,
                                    "qty",
                                    e.target.value,
                                  )
                                }
                              />
                              <div className="print-val center nowrap">
                                {item.qty}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="cell-wrap">
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
                              <div className="print-val right nowrap">
                                {item.price}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="cell-wrap">
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
                              <div className="print-val center nowrap">
                                {item.disPercent}
                              </div>
                            </div>
                          </td>
                          <td className="right">
                            {calculateNetPrice(item) !== 0
                              ? formatCurrency(calculateNetPrice(item))
                              : ""}
                          </td>
                          <td>
                            <div className="cell-wrap">
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
                              <div className="print-val nowrap">
                                {item.customer}
                              </div>
                            </div>
                          </td>
                          <td className="right bold">
                            {calculateRowTotal(item) !== 0
                              ? formatCurrency(calculateRowTotal(item))
                              : ""}
                          </td>
                          <td className="no-print">
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
                  <button onClick={addItem} className="po-add-row-btn no-print">
                    + Add Item
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* FOOTER */}
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
