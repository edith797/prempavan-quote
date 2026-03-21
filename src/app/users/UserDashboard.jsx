import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { TrendingUp, FileText, CheckCircle, Clock } from "lucide-react";
import styles from "./UserDashboard.module.css";

export default function UserDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalQuotes: 0,
    approved: 0,
    pending: 0,
  });
  const [recentQuotes, setRecentQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ 1. State for User Name
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    async function loadStats() {
      try {
        // 1. Get Logged In User ID
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // ✅ 2. Fetch User's Name from Employees Table
        const { data: employee } = await supabase
          .from("employees")
          .select("full_name")
          .eq("user_id", user.id)
          .single();

        if (employee) {
          setUserName(employee.full_name);
        }

        // 3. Fetch User's Quotations
        const { data, error } = await supabase
          .from("quotations")
          .select(
            "id, total_amount, status, quotation_number, companies(company_name), created_at"
          )
          .eq("created_by", user.id) // 🔒 Filter by User
          .order("created_at", { ascending: false });

        if (error) throw error;

        // 4. Calculate Personal Stats
        const totalRevenue = data.reduce(
          (sum, q) =>
            sum + (q.status === "APPROVED" ? Number(q.total_amount) : 0),
          0
        );
        const totalQuotes = data.length;
        const approved = data.filter((q) => q.status === "APPROVED").length;
        const pending = data.filter(
          (q) => q.status === "DRAFT" || !q.status
        ).length;

        setStats({ totalRevenue, totalQuotes, approved, pending });
        setRecentQuotes(data.slice(0, 5)); // Top 5
      } catch (error) {
        console.error("Error loading user dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading)
    return <div style={{ padding: "40px" }}>Loading Dashboard...</div>;

  return (
    <div className={styles.container}>
      {/* ✅ 3. Display Welcome Message */}
      <h1 className={styles.title}>
        Welcome, <span style={{ color: "#2563eb" }}>{userName}</span> 👋
      </h1>

      {/* STAT CARDS */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>My Revenue (Approved)</span>
            <TrendingUp color="#10B981" size={20} />
          </div>
          <div className={styles.bigNumber}>
            ₹ {stats.totalRevenue.toLocaleString("en-IN")}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>My Quotations</span>
            <FileText color="#3B82F6" size={20} />
          </div>
          <div className={styles.bigNumber}>{stats.totalQuotes}</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>Approved</span>
            <CheckCircle color="#10B981" size={20} />
          </div>
          <div className={styles.bigNumber}>{stats.approved}</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>Pending / Draft</span>
            <Clock color="#F59E0B" size={20} />
          </div>
          <div className={styles.bigNumber}>{stats.pending}</div>
        </div>
      </div>

      {/* RECENT ACTIVITY TABLE */}
      <div className={styles.recentSection}>
        <h3>Recent Activity</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Quote No</th>
              <th>Company</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentQuotes.map((q) => (
              <tr key={q.id}>
                <td style={{ fontWeight: 500 }}>{q.quotation_number}</td>
                <td>{q.companies?.company_name || "Unknown"}</td>
                <td>₹ {Number(q.total_amount).toLocaleString("en-IN")}</td>
                <td>
                  <span className={styles[q.status || "DRAFT"]}>
                    {q.status || "DRAFT"}
                  </span>
                </td>
              </tr>
            ))}
            {recentQuotes.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", color: "#999" }}>
                  You haven't created any quotations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
