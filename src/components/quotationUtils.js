// src/components/quotationUtils.js

export async function getNextQuotationNumber(supabase) {
  try {
    // 1. Get the very last quotation created (ordered by ID)
    const { data, error } = await supabase
      .from("quotations")
      .select("quotation_number")
      .order("created_at", { ascending: false }) // Get the latest one
      .limit(1)
      .single();

    // 2. If no quotations exist yet, start fresh
    if (error || !data || !data.quotation_number) {
      console.log("No previous quotes found. Starting at 001.");
      return "PP-QTN-001";
    }

    const lastNumber = data.quotation_number;
    console.log("Found last number:", lastNumber);

    // 3. Logic: Check if it matches our new format "PP-QTN-XXX"
    if (lastNumber.startsWith("PP-QTN-")) {
      // Remove prefix and parse the number (e.g., "001" -> 1)
      const currentNumStr = lastNumber.replace("PP-QTN-", "");
      const nextNum = parseInt(currentNumStr, 10) + 1;
      
      // Format back to 3 digits (e.g., 2 -> "002")
      return `PP-QTN-${String(nextNum).padStart(3, "0")}`;
    }

    // 4. Safety Fallback: If the last quote was the OLD format (e.g., "quote1"), force switch to new format
    return "PP-QTN-001";

  } catch (err) {
    console.error("Error generating number:", err);
    return "PP-QTN-001";
  }
} 