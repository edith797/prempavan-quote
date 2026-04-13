import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { getNextQuotationNumber } from "../../components/quotationUtils";
import {
  Save,
  Loader2,
  Hash,
  Calendar,
  Building2,
  User,
  Plus,
  Trash2,
  FileText,
  FilePlus,
  Eye,
} from "lucide-react";
import styles from "./CreateQuotation.module.css";

// ✅ Import Preview Modal
import QuotationPreview from "./QuotationPreview";

const CGST_PERCENT = 9;
const SGST_PERCENT = 9;
const IGST_PERCENT = 18;

let globalItemsCache = null;

export default function CreateQuotation() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEditMode = Boolean(id);

  const [isReviseMode, setIsReviseMode] = useState(
    location.state?.isRevise || false,
  );

  const [userRole, setUserRole] = useState(null);
  const [quoteNo, setQuoteNo] = useState("");
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [attn, setAttn] = useState("");
  const [modeOfEnquiry, setModeOfEnquiry] = useState("");
  const [saving, setSaving] = useState(false);
  const isSavingRef = useRef(false);

  const [itemsMaster, setItemsMaster] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);

  const [signatoryId, setSignatoryId] = useState("");
  const [validFor, setValidFor] = useState("ONE MONTH");
  const [deliveryTime, setDeliveryTime] = useState("1-2 WEEKS");
  const [paymentTerms, setPaymentTerms] = useState("15 DAYS");
  const [quotationDate, setQuotationDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState(
    "THANK YOU FOR BEING OUR PRIVILEGED CUSTOMER",
  );

  const [originalCreatorId, setOriginalCreatorId] = useState(null);
  const [currentRevisionNo, setCurrentRevisionNo] = useState(0);

  // Preview State
  const [previewDraftData, setPreviewDraftData] = useState(null);

  const [items, setItems] = useState([
    {
      description: "",
      item_code: "",
      quantity: null,
      rate: null,
      discount: null,
      amount: 0,
    },
  ]);

  const loadQuotationForEdit = useCallback(
    async (quoteId) => {
      try {
        const { data: quote, error: qError } = await supabase
          .from("quotations")
          .select("*")
          .eq("id", quoteId)
          .single();
        if (qError) throw qError;

        if (!quote.is_latest && !isReviseMode) {
          alert("This is an old revision and cannot be edited.");
          navigate("/admin/quotations");
          return;
        }

        setQuoteNo(quote.quotation_number);
        setCompanyId(quote.company_id);
        setAttn(quote.attn_person_name || "");
        setSignatoryId(quote.authorised_signatory_id || "");
        setValidFor(quote.valid_for || "");
        setDeliveryTime(quote.delivery_time || "");
        setPaymentTerms(quote.payment_terms || "");
        setModeOfEnquiry(quote.mode_of_enquiry || "");
        setQuotationDate(
          quote.quotation_date || new Date().toISOString().split("T")[0],
        );
        if (quote.notes) setNotes(quote.notes);

        setOriginalCreatorId(quote.created_by);
        setCurrentRevisionNo(quote.revision_no || 0);

        const { data: qItems, error: iError } = await supabase
          .from("quotation_items")
          .select("*")
          .eq("quotation_id", quoteId)
          .order("id", { ascending: true });
        if (iError) throw iError;
        if (qItems) setItems(qItems.map((i) => ({ ...i })));
      } catch (err) {
        console.error(err);
        navigate("/admin/quotations");
      }
    },
    [navigate, isReviseMode],
  );

  useEffect(() => {
    let isMounted = true;
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && isMounted) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        setUserRole(profile?.role);
      }

      const { data: compData } = await supabase
        .from("companies")
        .select("id, company_name")
        .order("company_name");
      if (isMounted) setCompanies(compData || []);

      const { data: empData } = await supabase
        .from("employees")
        .select("id, full_name, user_id")
        .eq("is_active", true)
        .order("full_name");
      if (isMounted) setEmployees(empData || []);

      if (!isEditMode && user && empData && isMounted) {
        const myEmployeeRecord = empData.find((e) => e.user_id === user.id);
        if (myEmployeeRecord) setSignatoryId(myEmployeeRecord.id);
      }

      if (isEditMode && isMounted) {
        await loadQuotationForEdit(id);
      } else if (isMounted) {
        const quotationNo = await getNextQuotationNumber(supabase);
        setQuoteNo(quotationNo);
      }
    }

    async function loadMassiveItemDatabase() {
      if (!isMounted) return;
      setIsLoadingItems(true);
      if (globalItemsCache) {
        setItemsMaster(globalItemsCache);
        setIsLoadingItems(false);
        return;
      }
      try {
        const { count } = await supabase
          .from("items")
          .select("*", { count: "exact", head: true });
        if (!count) {
          if (isMounted) setIsLoadingItems(false);
          return;
        }

        let allItems = [];
        const stepSize = 10000;
        const fetchPromises = [];

        for (let fromRow = 0; fromRow < count; fromRow += stepSize) {
          fetchPromises.push(
            supabase
              .from("items")
              .select("id, item_name, rate, item_code")
              .range(fromRow, fromRow + stepSize - 1),
          );
        }
        const results = await Promise.all(fetchPromises);
        results.forEach((res) => {
          if (res.data) allItems.push(...res.data);
        });

        const cleanedItems = allItems.map((item) => ({
          ...item,
          item_code: item.item_code
            ? String(item.item_code)
                .replace(/[\r\n\t]+/g, "")
                .trim()
            : "",
          item_name: item.item_name
            ? String(item.item_name)
                .replace(/[\r\n\t]+/g, "")
                .trim()
            : "",
          rate: Number(item.rate) || 0,
        }));
        globalItemsCache = cleanedItems;
        if (isMounted) {
          setItemsMaster(cleanedItems);
          setIsLoadingItems(false);
        }
      } catch (err) {
        console.error("Background fetch failed", err);
        if (isMounted) setIsLoadingItems(false);
      }
    }

    init();
    const deferTimer = setTimeout(() => loadMassiveItemDatabase(), 300);
    return () => {
      isMounted = false;
      clearTimeout(deferTimer);
    };
  }, [id, isEditMode, loadQuotationForEdit]);

  const subTotal = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [items],
  );
  const taxAmount = useMemo(() => subTotal * 0.18, [subTotal]);
  const grandTotal = useMemo(() => subTotal + taxAmount, [subTotal, taxAmount]);

  function updateItem(index, field, value) {
    const updated = [...items];
    updated[index][field] = value;

    if (field === "item_code") {
      const matched = itemsMaster.find(
        (m) => m.item_code?.toLowerCase() === value.toLowerCase(),
      );
      if (matched) {
        updated[index].description = matched.item_name;
        updated[index].rate = matched.rate;
      } else {
        const isOldDesc = itemsMaster.some(
          (m) => m.item_name === updated[index].description,
        );
        if (isOldDesc) {
          updated[index].description = "";
          updated[index].rate = "";
        }
      }
    }

    if (field === "description") {
      const matched = itemsMaster.find(
        (m) => m.item_name.toLowerCase() === value.toLowerCase(),
      );
      if (matched) {
        updated[index].rate = matched.rate;
        if (!updated[index].item_code)
          updated[index].item_code = matched.item_code;
      }
    }

    const qty = Number(updated[index].quantity) || 0;
    const rate = Number(updated[index].rate) || 0;
    const disc = Number(updated[index].discount) || 0;
    updated[index].amount = qty * rate - (qty * rate * disc) / 100;
    setItems(updated);
  }

  function handleTriggerPreview() {
    if (!companyId) return alert("Select a company");
    if (!signatoryId) return alert("Please select an Authorised Signatory.");

    const selectedComp = companies.find((c) => c.id === companyId);
    let cgst = 0,
      sgst = 0,
      igst = 0;
    if (selectedComp?.gst_type === "INTER") {
      igst = subTotal * 0.18;
    } else {
      cgst = subTotal * 0.09;
      sgst = subTotal * 0.09;
    }

    const draft = {
      quotation: {
        quotation_number: quoteNo,
        quotation_date: quotationDate,
        company_id: companyId,
        attn_person_name: attn,
        authorised_signatory_id: signatoryId,
        valid_for: validFor,
        delivery_time: deliveryTime,
        payment_terms: paymentTerms,
        mode_of_enquiry: modeOfEnquiry,
        subtotal: subTotal,
        cgst_amount: cgst,
        sgst_amount: sgst,
        igst_amount: igst,
        total_amount: subTotal + cgst + sgst + igst,
        notes: notes,
        revision_no: isReviseMode ? currentRevisionNo + 1 : currentRevisionNo,
      },
      items: items.filter(
        (item) => item.description && item.description.trim() !== "",
      ),
    };
    setPreviewDraftData(draft);
  }

  async function executeRealSave() {
    if (!companyId) return alert("Select a company");
    if (!signatoryId) return alert("Please select an Authorised Signatory.");
    if (isReviseMode && userRole !== "ADMIN")
      return alert("Permission Denied: Only Admins can create revisions.");

    if (isSavingRef.current) return;
    isSavingRef.current = true;

    setPreviewDraftData(null);
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: comp } = await supabase
        .from("companies")
        .select("gst_type")
        .eq("id", companyId)
        .single();

      let cgst = 0,
        sgst = 0,
        igst = 0;
      if (comp?.gst_type === "INTER") {
        igst = subTotal * 0.18;
      } else {
        cgst = subTotal * 0.09;
        sgst = subTotal * 0.09;
      }

      const newItemsToSave = [];
      items.forEach((row) => {
        if (!row.description.trim()) return;
        const exists = itemsMaster.some((m) => {
          if (row.item_code && row.item_code.trim() !== "")
            return m.item_code === row.item_code;
          return m.item_name.toLowerCase() === row.description.toLowerCase();
        });
        if (!exists)
          newItemsToSave.push({
            item_name: row.description,
            rate: row.rate,
            item_code: row.item_code || null,
          });
      });
      if (newItemsToSave.length > 0)
        await supabase.from("items").insert(newItemsToSave);

      const creatorToSave = isEditMode ? originalCreatorId || user.id : user.id;

      const quoteData = {
        quotation_date: quotationDate,
        company_id: companyId,
        attn_person_name: attn,
        authorised_signatory_id: signatoryId,
        created_by: creatorToSave,
        valid_for: validFor,
        delivery_time: deliveryTime,
        payment_terms: paymentTerms,
        mode_of_enquiry: modeOfEnquiry,
        subtotal: subTotal,
        cgst_amount: cgst,
        sgst_amount: sgst,
        igst_amount: igst,
        total_amount: subTotal + cgst + sgst + igst,
        notes: notes,
        is_latest: true,
      };

      let finalId = null;

      if (isReviseMode) {
        const { data: oldQuote } = await supabase
          .from("quotations")
          .select("revision_no, parent_quotation_id, id, created_by")
          .eq("id", id)
          .single();
        await supabase
          .from("quotations")
          .update({ is_latest: false })
          .eq("id", id);
        const { data: newQuote, error } = await supabase
          .from("quotations")
          .insert([
            {
              ...quoteData,
              quotation_number: quoteNo,
              revision_no: (oldQuote.revision_no || 0) + 1,
              parent_quotation_id: oldQuote.parent_quotation_id || oldQuote.id,
              created_by: oldQuote.created_by,
            },
          ])
          .select()
          .single();
        if (error) throw error;
        finalId = newQuote.id;
      } else if (isEditMode) {
        const { error } = await supabase
          .from("quotations")
          .update(quoteData)
          .eq("id", id);
        if (error) throw error;
        finalId = id;

        // 🚨 SAFETY ALARM ADDED HERE (This fixes the duplicate item bug!)
        const { error: deleteError } = await supabase
          .from("quotation_items")
          .delete()
          .eq("quotation_id", id);
        if (deleteError) {
          throw new Error(
            "Security Block: Supabase refused to delete the old items. Please run the SQL permission fix! Details: " +
              deleteError.message,
          );
        }
      } else {
        // ✅ AUTO-RETRY LOOP ADDED HERE (Prevents 409 Duplicate Key Bug!)
        let activeQuoteNo = quoteNo;
        let dbInsertError = null;
        let createdRecord = null;

        for (let i = 0; i < 10; i++) {
          const { data, error } = await supabase
            .from("quotations")
            .insert([
              { ...quoteData, quotation_number: activeQuoteNo, revision_no: 0 },
            ])
            .select()
            .single();

          if (error) {
            if (error.code === "23505") {
              const parts = activeQuoteNo.split("-");
              if (parts.length > 0) {
                const lastPart = parts[parts.length - 1];
                let num = parseInt(lastPart, 10);
                parts[parts.length - 1] = String(num + 1).padStart(
                  lastPart.length,
                  "0",
                );
                activeQuoteNo = parts.join("-");
                dbInsertError = error;
                continue;
              }
            }
            throw error;
          }
          createdRecord = data;
          dbInsertError = null;
          break;
        }

        if (dbInsertError)
          throw new Error(
            "Failed to secure a unique Quote number. Please refresh.",
          );
        finalId = createdRecord.id;
      }

      const itemRows = items
        .filter((i) => i.description.trim() !== "")
        .map((item) => ({
          quotation_id: finalId,
          item_code: item.item_code || null,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          discount: item.discount,
          amount: item.amount,
        }));

      if (itemRows.length > 0) {
        const { error: insertError } = await supabase
          .from("quotation_items")
          .insert(itemRows);
        if (insertError)
          throw new Error("Failed to save items: " + insertError.message);
      }
      navigate(`/admin/quotations/${finalId}`);
    } catch (err) {
      alert("Error saving: " + err.message);
    } finally {
      setSaving(false);
      isSavingRef.current = false;
    }
  }

  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return companies;
    return companies.filter((c) =>
      c.company_name.toLowerCase().includes(companySearch.toLowerCase()),
    );
  }, [companies, companySearch]);

  function selectCompany(comp) {
    setCompanyId(comp.id);
    setCompanySearch(comp.company_name);
    setShowCompanyDropdown(false);
  }
  function addItemRow() {
    setItems([
      ...items,
      {
        description: "",
        item_code: "",
        quantity: null,
        rate: null,
        discount: null,
        amount: 0,
      },
    ]);
  }
  function removeItemRow(index) {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {isReviseMode
              ? "Create Revision"
              : isEditMode
                ? "Edit Quotation"
                : "New Quotation"}
          </h1>
          <span
            style={{
              color: isLoadingItems ? "#d97706" : "#16a34a",
              fontWeight: "bold",
              fontSize: "13px",
              marginTop: "4px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {isLoadingItems ? (
              <>
                <Loader2 className="spin-anim" size={14} /> Fetching DB...
              </>
            ) : (
              `✅ Ready: ${itemsMaster.length} items loaded`
            )}
          </span>
        </div>

        <div
          className={styles.actions}
          style={{ display: "flex", gap: "10px", alignItems: "center" }}
        >
          <button
            onClick={() => navigate("/admin/quotations")}
            className={styles.backBtn}
          >
            Cancel
          </button>

          {isEditMode && currentRevisionNo < 1 && !isReviseMode && (
            <button
              onClick={() => setIsReviseMode(true)}
              className={styles.saveBtn}
              style={{
                backgroundColor: "#8b5cf6",
                color: "white",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FilePlus size={16} /> Create Revision
            </button>
          )}

          <button
            onClick={handleTriggerPreview}
            disabled={
              saving || (isEditMode && userRole !== "ADMIN" && !isReviseMode)
            }
            className={styles.backBtn}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Eye size={18} /> Preview
          </button>

          <button
            onClick={executeRealSave}
            disabled={
              saving || (isEditMode && userRole !== "ADMIN" && !isReviseMode)
            }
            className={styles.saveBtn}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            {saving ? (
              <Loader2 className="spin-anim" size={18} />
            ) : (
              <Save size={18} />
            )}
            {isReviseMode
              ? "Save Revision"
              : isEditMode
                ? "Update Changes"
                : "Save Quotation"}
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            <Hash size={14} /> Quote No
          </label>
          <input value={quoteNo} readOnly className={styles.input} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            <Building2 size={14} /> Company
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search company..."
              value={companySearch}
              onChange={(e) => {
                setCompanySearch(e.target.value);
                setShowCompanyDropdown(true);
              }}
              onFocus={() => setShowCompanyDropdown(true)}
              className={styles.input}
            />
            {showCompanyDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  backgroundColor: "#fff",
                  border: "1px solid #d1d5db",
                  borderTop: "none",
                  borderRadius: "0 0 8px 8px",
                  maxHeight: "200px",
                  overflowY: "auto",
                  zIndex: 10,
                }}
              >
                {filteredCompanies.map((comp) => (
                  <div
                    key={comp.id}
                    onClick={() => selectCompany(comp)}
                    style={{
                      padding: "10px 12px",
                      cursor: "pointer",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f9fafb")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "#fff")
                    }
                  >
                    {comp.company_name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            <User size={14} /> Attn
          </label>
          <input
            value={attn}
            onChange={(e) => setAttn(e.target.value)}
            className={styles.input}
            placeholder="e.g. Mr. John Doe"
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            Signatory <span style={{ color: "red" }}>*</span>
          </label>
          <select
            value={signatoryId}
            onChange={(e) => setSignatoryId(e.target.value)}
            className={styles.select}
            style={{ borderColor: !signatoryId ? "#fca5a5" : "" }}
          >
            <option value="">-- Select Signatory --</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Valid For</label>
          <input
            value={validFor}
            onChange={(e) => setValidFor(e.target.value)}
            className={styles.input}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Delivery Time</label>
          <input
            value={deliveryTime}
            onChange={(e) => setDeliveryTime(e.target.value)}
            className={styles.input}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Payment Terms</label>
          <input
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            className={styles.input}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            <Calendar size={14} /> Date
          </label>
          <input
            type="date"
            value={quotationDate}
            onChange={(e) => setQuotationDate(e.target.value)}
            className={styles.input}
          />
        </div>
      </div>

      <div className={styles.fieldGroup} style={{ marginBottom: "24px" }}>
        <label className={styles.label}>Mode of Enquiry</label>
        <input
          type="text"
          placeholder="e.g., Email, Phone, Walk-in..."
          value={modeOfEnquiry}
          onChange={(e) => setModeOfEnquiry(e.target.value)}
          className={styles.input}
        />
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Code</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Disc%</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td>
                <input
                  value={item.item_code}
                  onChange={(e) => updateItem(idx, "item_code", e.target.value)}
                  className={styles.tableInput}
                />
              </td>
              <td>
                <input
                  list={`items-list-${idx}`}
                  value={item.description}
                  onChange={(e) =>
                    updateItem(idx, "description", e.target.value)
                  }
                  className={styles.tableInput}
                />
                <datalist id={`items-list-${idx}`}>
                  {itemsMaster.map((m) => (
                    <option key={m.id} value={m.item_name} />
                  ))}
                </datalist>
              </td>
              <td>
                <input
                  type="number"
                  value={item.quantity ?? ""}
                  onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                  className={styles.tableInput}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={item.rate ?? ""}
                  onChange={(e) => updateItem(idx, "rate", e.target.value)}
                  className={styles.tableInput}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={item.discount ?? ""}
                  onChange={(e) => updateItem(idx, "discount", e.target.value)}
                  className={styles.tableInput}
                />
              </td>
              <td>₹{item.amount.toFixed(2)}</td>
              <td>
                <button
                  onClick={() => removeItemRow(idx)}
                  className={styles.deleteBtn}
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={addItemRow} className={styles.addItemBtn}>
        <Plus size={18} /> Add Row
      </button>

      <div style={{ marginTop: "20px" }}>
        <label className={styles.label}>
          <FileText size={14} /> Notes / Declaration
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={styles.input}
          style={{ width: "100%", marginTop: "5px" }}
        />
      </div>

      <div className={styles.footer}>
        <div className={styles.totals}>
          <div className={styles.totalRow}>
            <span>Subtotal</span>
            <span>
              ₹{" "}
              {subTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className={styles.totalRow}>
            <span>Tax (Approx 18%)</span>
            <span>
              ₹{" "}
              {taxAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className={styles.grandTotal}>
            <span>Grand Total</span>
            <span>
              ₹{" "}
              {grandTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>

      {previewDraftData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.98)",
            zIndex: 99999,
            overflowY: "auto",
            paddingTop: "20px",
            paddingBottom: "40px",
          }}
        >
          <QuotationPreview
            draftData={previewDraftData}
            onCancelPreview={() => setPreviewDraftData(null)}
            onConfirmSave={executeRealSave}
          />
        </div>
      )}
    </div>
  );
}
