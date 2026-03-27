// src/components/quotationUtils.js

export async function getNextQuotationNumber(supabase) {
  const today = new Date();
  const month = today.getMonth(); // 0 = Jan, 3 = Apr
  const year = today.getFullYear();

  // 1. Calculate Indian Financial Year (April 1st to March 31st)
  let startYear, endYear;
  if (month >= 3) {
    // April to December
    startYear = year;
    endYear = year + 1;
  } else {
    // January to March
    startYear = year - 1;
    endYear = year;
  }

  // Format to "2526" (for 2025-2026)
  const fyString = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;
  const prefix = `PP-QTN-${fyString}-`;

  try {
    // 2. Fetch the absolute latest quotation created in the entire database
    const { data, error } = await supabase
      .from("quotations")
      .select("quotation_number, created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    // If the database is completely empty
    if (error || !data || data.length === 0 || !data[0].quotation_number) {
      return `${prefix}001`;
    }

    const lastNumberStr = data[0].quotation_number;
    const lastQuoteDate = new Date(data[0].created_at);

    // 3. STRICT APRIL 1st RESET RULE
    // We only reset to 001 if the last quotation was created BEFORE April 1st of the CURRENT financial year.
    const resetDate = new Date(startYear, 3, 1); // April 1st of the calculated start year

    if (lastQuoteDate < resetDate) {
      console.log("New Financial Year detected! Resetting count to 001.");
      return `${prefix}001`;
    }

    // 4. CONTINUE THE SEQUENCE (It is not April yet, do NOT reset)
    // This splits the string by "-" and grabs the very last part (works for both old and new formats)
    const parts = lastNumberStr.split("-");
    const lastNum = parseInt(parts[parts.length - 1], 10);

    if (isNaN(lastNum)) {
      return `${prefix}001`; // Safety fallback if the text is corrupted
    }

    const nextNum = lastNum + 1;
    return `${prefix}${String(nextNum).padStart(3, "0")}`;
  } catch (err) {
    console.error("Error generating number:", err);
    return `${prefix}001`;
  }
}
