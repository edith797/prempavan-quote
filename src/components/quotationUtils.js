// src/components/quotationUtils.js

export async function getNextQuotationNumber(supabase) {
  const today = new Date();
  const month = today.getMonth(); // 0 = Jan, 3 = Apr, etc.
  const year = today.getFullYear();

  // 1. Calculate Indian Financial Year (April 1st to March 31st)
  let startYear, endYear;
  if (month >= 3) {
    startYear = year;
    endYear = year + 1;
  } else {
    startYear = year - 1;
    endYear = year;
  }

  // Format to "2526" (for 2025-2026)
  const fyString = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;

  // The dynamic prefix: e.g., "PP-QTN-2526-"
  const prefix = `PP-QTN-${fyString}-`;

  try {
    // ✅ THE MAGIC FIX: Order by the quotation_number itself, NOT the date!
    // This guarantees we always find the mathematically highest number (008),
    // even if 007 was saved later in the day.
    const { data, error } = await supabase
      .from("quotations")
      .select("quotation_number")
      .ilike("quotation_number", `${prefix}%`)
      .order("quotation_number", { ascending: false }) // <--- FIXED HERE
      .limit(1);

    // If no quotes exist for THIS year, start fresh at 001
    if (error || !data || data.length === 0 || !data[0].quotation_number) {
      console.log(`No quotes found for FY ${fyString}. Starting at 001.`);
      return `${prefix}001`;
    }

    const lastNumberStr = data[0].quotation_number;
    console.log("Found mathematically highest number:", lastNumberStr);

    // Extract the sequence number and increment it
    // Example: "PP-QTN-2526-008" -> splits into ["PP", "QTN", "2526", "008"]
    const parts = lastNumberStr.split("-");
    const currentNumStr = parts[parts.length - 1];

    const nextNum = parseInt(currentNumStr, 10) + 1;

    // Format back to 3 digits (e.g., 9 -> "009")
    return `${prefix}${String(nextNum).padStart(3, "0")}`;
  } catch (err) {
    console.error("Error generating number:", err);
    // Safety fallback ensures it never crashes the app
    return `${prefix}001`;
  }
}
