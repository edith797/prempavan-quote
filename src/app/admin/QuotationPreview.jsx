import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import html2pdf from "html2pdf.js";
import "./QuotationPreview.css";

// ✅ SAFE ITEM COUNT
const ITEMS_PER_PAGE = 15;

export default function QuotationPreview({
  draftData,
  onConfirmSave,
  onCancelPreview,
}) {
  const { id } = useParams();
  const navigate = useNavigate();

  const isPreviewMode = Boolean(draftData);

  const [quotation, setQuotation] = useState(null);
  const [items, setItems] = useState([]);
  const [company, setCompany] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const { data: s } = await supabase
          .from("system_settings")
          .select("*")
          .maybeSingle();

        setSettings(
          s || {
            company_name: "PREMPAVAN ENGINEERS INDIA PVT LTD",
            address: "Address",
            phone: "",
            email: "",
          },
        );

        if (isPreviewMode) {
          setQuotation(draftData.quotation);
          setItems(draftData.items);

          const { data: c } = await supabase
            .from("companies")
            .select("*")
            .eq("id", draftData.quotation.company_id)
            .single();
          setCompany(c);

          if (draftData.quotation.authorised_signatory_id) {
            await supabase
              .from("employees")
              .select("*")
              .eq("id", draftData.quotation.authorised_signatory_id)
              .single();
          }
        } else if (id) {
          const { data: q, error: qErr } = await supabase
            .from("quotations")
            .select("*")
            .eq("id", id)
            .single();

          if (qErr) throw qErr;
          setQuotation(q);

          const { data: c } = await supabase
            .from("companies")
            .select("*")
            .eq("id", q.company_id)
            .single();
          setCompany(c);

          if (q.authorised_signatory_id) {
            await supabase
              .from("employees")
              .select("*")
              .eq("id", q.authorised_signatory_id)
              .single();
          }

          // Force ascending to keep items in order
          const { data: qi } = await supabase
            .from("quotation_items")
            .select("*")
            .eq("quotation_id", id)
            .order("id", { ascending: true });
          setItems(qi || []);
        }
      } catch (err) {
        console.error(err);
        alert("Error loading data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, draftData, isPreviewMode]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const pages = useMemo(() => {
    if (!items || items.length === 0) return [];
    const chunks = [];
    for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
      chunks.push(items.slice(i, i + ITEMS_PER_PAGE));
    }
    return chunks;
  }, [items]);

  function downloadPDF() {
    const element = document.getElementById("quotation-container-full");
    const pagesList = element.querySelectorAll(".a4-page");

    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap";
    element.prepend(fontLink);

    pagesList.forEach((p) => {
      p.style.marginBottom = "0px";
      p.style.boxShadow = "none";
      p.style.border = "none";
      p.style.minHeight = "296.5mm";
      p.style.height = "296.5mm";
      p.style.overflow = "hidden";
    });

    const options = {
      margin: 0,
      filename: `${quotation?.quotation_number || "Quote"}.pdf`,
      image: { type: "jpeg", quality: 1 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        scrollY: 0,
        onclone: (clonedDoc) => {
          const clonedLink = clonedDoc.createElement("link");
          clonedLink.rel = "stylesheet";
          clonedLink.href =
            "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap";
          clonedDoc.head.appendChild(clonedLink);

          clonedDoc.querySelectorAll(".a4-page").forEach((p) => {
            p.style.borderTop = "5px solid #b49448";
          });

          clonedDoc.querySelectorAll(".data-table th").forEach((th) => {
            th.style.backgroundColor = "#0f1a2e";
            th.style.color = "#e8d99a";
          });

          clonedDoc
            .querySelectorAll(".data-table tbody tr")
            .forEach((tr, i) => {
              tr.style.backgroundColor = i % 2 === 0 ? "#fffef9" : "#faf8f2";
            });

          clonedDoc.querySelectorAll(".t-row.total").forEach((row) => {
            row.style.backgroundColor = "#0f1a2e";
            row.querySelectorAll("span").forEach((s) => {
              s.style.color = "#e8d99a";
            });
          });

          clonedDoc.querySelectorAll(".terms-left").forEach((el) => {
            el.style.backgroundColor = "#faf8f2";
          });

          clonedDoc.querySelectorAll(".q-lbl").forEach((el) => {
            el.style.backgroundColor = "#f5f1e8";
          });

          return new Promise((resolve) => setTimeout(resolve, 1500));
        },
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    html2pdf()
      .set(options)
      .from(element)
      .save()
      .then(() => {
        pagesList.forEach((p) => {
          p.style.marginBottom = "";
          p.style.boxShadow = "";
          p.style.border = "";
          p.style.minHeight = "";
          p.style.height = "";
          p.style.overflow = "";
        });
        fontLink.remove();
      });
  }

  function handleGoBack() {
    if (window.location.pathname.includes("/user/")) {
      navigate("/user/quotations");
    } else {
      navigate("/admin/quotations");
    }
  }

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!quotation) return <div className="loading-screen">No Data Found</div>;

  return (
    <div className={`quotation-body ${isPreviewMode ? "preview-mode" : ""}`}>
      <div className="action-bar">
        {isPreviewMode ? (
          <>
            <button
              className="btn btn-back"
              onClick={(e) => {
                e.preventDefault();
                onCancelPreview();
              }}
            >
              ✎ Go Back & Edit
            </button>
            <div style={{ fontWeight: "bold", color: "#B45309" }}>
              👀 PREVIEW MODE
            </div>
            <button
              className="btn"
              onClick={onConfirmSave}
              style={{ backgroundColor: "#10B981" }}
            >
              ✓ Confirm & Save
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-back" onClick={handleGoBack}>
              ← Back
            </button>
            <button className="btn" onClick={downloadPDF}>
              Download PDF
            </button>
          </>
        )}
      </div>

      <div id="quotation-container-full">
        {pages.map((pageItems, pageIndex) => {
          const isLastPage = pageIndex === pages.length - 1;
          const isFirstPage = pageIndex === 0;

          return (
            <div className="a4-page" key={pageIndex}>
              {/* ✅ Watermark logo — centered, very low opacity */}
              <div className="a4-watermark">
                <img src="/company-logo.png" alt="" />
              </div>

              {/* --- HEADER --- */}
              <header className="page-header">
                <h2 className="doc-title">QUOTATION</h2>
                <div className="header-content">
                  <div className="logo-box">
                    {settings.company_logo_url ? (
                      <img src={settings.company_logo_url} alt="Logo" />
                    ) : (
                      <span className="no-logo">LOGO</span>
                    )}
                  </div>
                  <div className="company-info-box">
                    <h1 className="company-title">
                      {settings.company_name ||
                        "PREMPAVAN ENGINEERS INDIA PVT LTD"}
                    </h1>
                    <p className="company-address">
                      {settings.company_address || settings.address}
                    </p>
                    <p className="company-contact">
                      Phone: {settings.phone} | Email: {settings.email}
                    </p>
                  </div>
                </div>

                <div className="header-divider"></div>

                {/* Bill To - ONLY ON PAGE 1 */}
                {isFirstPage && (
                  <div className="meta-grid">
                    <div className="bill-to-col">
                      <strong>BILL TO</strong>
                      <span className="client-name">
                        {company?.company_name}
                      </span>
                      <span className="client-addr">{company?.address}</span>
                      {quotation.attn_person_name && (
                        <div>Attn: {quotation.attn_person_name}</div>
                      )}
                    </div>

                    <div className="quote-data-col">
                      <div className="q-row">
                        <span className="q-lbl">Quotation No:</span>
                        <span
                          className="q-val bold"
                          style={{ display: "flex", alignItems: "center" }}
                        >
                          {quotation.quotation_number}
                          {quotation.revision_no > 0 && (
                            <span
                              style={{
                                marginLeft: "8px",
                                border: "1px solid #000",
                                padding: "1px 4px",
                                fontSize: "9px",
                                fontWeight: "900",
                                borderRadius: "2px",
                                display: "inline-block",
                                lineHeight: "1",
                                color: "#000",
                              }}
                            >
                              REV
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="q-row">
                        <span className="q-lbl">Date:</span>
                        <span className="q-val">
                          {new Date(
                            quotation.quotation_date,
                          ).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                      <div className="q-row">
                        <span className="q-lbl">Valid For:</span>
                        <span className="q-val">{quotation.valid_for}</span>
                      </div>
                      <div className="q-row">
                        <span className="q-lbl">Mode of Enquiry:</span>
                        <span className="q-val">
                          {quotation.mode_of_enquiry || "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </header>

              {/* --- TABLE --- */}
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "6%" }}>S.NO</th>
                      <th style={{ width: "12%" }}>CODE</th>
                      <th style={{ width: "38%" }}>DESCRIPTION</th>
                      <th style={{ width: "12%" }}>RATE</th>
                      <th style={{ width: "8%" }}>QTY</th>
                      <th style={{ width: "10%" }}>DISC%</th>
                      <th style={{ width: "14%" }}>AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: "center" }}>
                          {pageIndex * ITEMS_PER_PAGE + idx + 1}
                        </td>
                        <td>{item.item_code || "-"}</td>
                        <td className="desc-cell">{item.description}</td>
                        <td className="right">{formatCurrency(item.rate)}</td>
                        <td className="center">{item.quantity}</td>
                        <td className="center">
                          {item.discount > 0 ? item.discount : "-"}
                        </td>
                        <td className="right bold">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* --- FOOTER --- */}
              {isLastPage ? (
                <div className="footer-wrapper">
                  <div className="summary-split">
                    <div className="terms-left">
                      <h4>PAYMENT INSTRUCTION</h4>
                      <ul>
                        <li>
                          <strong>DELIVERY:</strong> {quotation.delivery_time}
                        </li>
                        <li>
                          <strong>PAYMENT:</strong> {quotation.payment_terms}
                        </li>
                        <li>
                          <strong>VALIDITY:</strong> {quotation.valid_for}
                        </li>
                      </ul>
                    </div>

                    <div className="totals-right">
                      <div className="t-row">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(quotation.subtotal)}</span>
                      </div>
                      {quotation.igst_amount > 0 ? (
                        <div className="t-row">
                          <span>IGST (18%):</span>
                          <span>{formatCurrency(quotation.igst_amount)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="t-row">
                            <span>CGST (9%):</span>
                            <span>{formatCurrency(quotation.cgst_amount)}</span>
                          </div>
                          <div className="t-row">
                            <span>SGST (9%):</span>
                            <span>{formatCurrency(quotation.sgst_amount)}</span>
                          </div>
                        </>
                      )}
                      <div className="t-row total">
                        <span>Total:</span>
                        <span>{formatCurrency(quotation.total_amount)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="notes-sig-split">
                    <div className="notes-col">
                      <strong>Notes:</strong>
                      <br />
                      {quotation.notes ||
                        "THANK YOU FOR BEING OUR PRIVILEGED CUSTOMER"}
                    </div>
                    <div className="sig-col">
                      <div className="for-text">
                        For {settings.company_name}
                      </div>
                      <div className="sig-gap"></div>
                      <div className="auth-name">Authorised Signatory</div>
                    </div>
                  </div>

                  <div className="dealers-footer">
                    <h4>AUTHORIZED DEALERS FOR:</h4>
                    <div className="logos-line">
                      <img
                        src="/logos/brand3.png"
                        alt="Brand1"
                        onError={(e) => (e.target.style.display = "none")}
                      />
                      <img
                        src="/logos/brand2.png"
                        alt="Brand2"
                        onError={(e) => (e.target.style.display = "none")}
                      />
                      <img
                        src="/logos/brand6.png"
                        alt="Brand3"
                        onError={(e) => (e.target.style.display = "none")}
                      />
                      <img
                        src="/logos/brand4.png"
                        alt="Brand4"
                        onError={(e) => (e.target.style.display = "none")}
                      />
                      <img
                        src="/logos/brand5.png"
                        alt="Brand5"
                        onError={(e) => (e.target.style.display = "none")}
                      />
                      <img
                        src="/logos/brand1.png"
                        alt="Brand6"
                        onError={(e) => (e.target.style.display = "none")}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="page-spacer">
                  <p
                    style={{
                      fontSize: "10px",
                      textAlign: "right",
                      marginTop: "10px",
                      fontStyle: "italic",
                    }}
                  >
                    ... Continued on next page
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
