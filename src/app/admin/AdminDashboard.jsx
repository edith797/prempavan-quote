import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { TrendingUp, FileText, CheckCircle } from "lucide-react";
import styles from "./AdminDashboard.module.css";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalQuotes: 0,
    approved: 0,
    pending: 0,
  });
  const [recentQuotes, setRecentQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        // ✅ FETCH DATA WITH JOINS
        // We fetch quotations and ask Supabase to join 'companies' and 'employees' automatically.
        const { data: quotes, error } = await supabase.from("quotations")
          .select(`
            id, 
            total_amount, 
            status, 
            created_at, 
            company_id,
            companies ( company_name ), 
            employees ( full_name )
          `);

        if (error) throw error;

        if (quotes) {
          // 1. Compute Basic Stats
          const totalRevenue = quotes.reduce(
            (sum, q) =>
              sum + (q.status === "APPROVED" ? Number(q.total_amount) : 0),
            0
          );
          const totalQuotes = quotes.length;
          const approved = quotes.filter((q) => q.status === "APPROVED").length;
          const pending = quotes.filter(
            (q) => q.status === "DRAFT" || !q.status
          ).length;

          setStats({ totalRevenue, totalQuotes, approved, pending });

          // 2. Format Recent Quotations (Top 5 Recent)
          const recent = quotes
            .map((q) => ({
              id: q.id,
              // ✅ Access nested data safely (using ?. to prevent crashes)
              companyName: q.companies?.company_name || "Unknown Company",
              createdBy: q.employees?.full_name || "Admin/System",
              amount: Number(q.total_amount) || 0,
              status: q.status || "DRAFT",
              createdAt: q.created_at,
            }))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Sort Newest First
            .slice(0, 5); // Take only top 5

          setRecentQuotes(recent);
        }
      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) return <div style={{ padding: "20px" }}>Loading stats...</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Admin Dashboard</h1>

      {/* Stats Cards */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>Total Revenue (Approved)</span> <TrendingUp color="#10B981" />
          </div>
          <div className={styles.bigNumber}>
            ₹ {stats.totalRevenue.toLocaleString("en-IN")}
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>Total Quotations</span> <FileText color="#3B82F6" />
          </div>
          <div className={styles.bigNumber}>{stats.totalQuotes}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>Approved</span> <CheckCircle color="#10B981" />
          </div>
          <div className={styles.bigNumber}>{stats.approved}</div>
        </div>
      </div>

      {/* Recent Quotations Table */}
      <div className={styles.recentSection}>
        <h3>Recent Quotations</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Created By</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {recentQuotes.length > 0 ? (
              recentQuotes.map((q) => (
                <tr key={q.id}>
                  <td>
                    <b>{q.companyName}</b>
                  </td>
                  <td>{q.createdBy}</td>
                  <td style={{ fontWeight: 600, color: "#10B981" }}>
                    ₹ {q.amount.toLocaleString("en-IN")}
                  </td>
                  <td>
                    <span
                      style={{
                        background:
                          q.status === "APPROVED" ? "#D1FAE5" : "#FEF3C7",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}
                    >
                      {q.status}
                    </span>
                  </td>
                  <td style={{ fontSize: "12px", color: "#6B7280" }}>
                    {/* Formats date as DD/MM/YYYY */}
                    {new Date(q.createdAt).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="5"
                  style={{ textAlign: "center", padding: "20px" }}
                >
                  No quotations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
