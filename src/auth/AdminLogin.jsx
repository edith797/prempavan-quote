import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import styles from "./AdminLogin.module.css";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Authenticate
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) throw signInError;

      const userId = data.user.id;

      // 2. Check Role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      // 3. Redirect
      if (profile?.role === "ADMIN") {
        navigate("/admin/dashboard");
      } else {
        navigate("/user/dashboard");
      }
    } catch (err) {
      await supabase.auth.signOut();
      setError(err.message || "Invalid login credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      {/* Optional: Background Grid Effect */}
      <div className={styles.gridBackground}></div>

      <div className={styles.card}>
        {/* Logo Section with Animation */}
        <div className={styles.header}>
          <div className={styles.logoWrapper}>
            {/* Ensure your file is named exactly 'company-logo.png' (or .svg/.jpg) in the public folder */}
            <img
              src="/company-logo.png"
              alt="Company Logo"
              className={styles.logo}
              onError={(e) => {
                e.target.style.display = "none";
              }} // Fallback if image missing
            />
            {/* Fallback Text if image fails loading */}
            <span className={styles.logoFallback}>PremPavan</span>
          </div>
          <h2 className={styles.title}>PremPavan</h2>
          <p className={styles.subtitle}></p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Work Email</label>
            <div className={styles.inputWrapper}>
              <Mail size={18} className={styles.icon} />
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Password</label>
            <div className={styles.inputWrapper}>
              <Lock size={18} className={styles.icon} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={styles.input}
              />
            </div>
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className={styles.spinner} />
                Authenticating...
              </>
            ) : (
              "Access Dashboard"
            )}
          </button>
        </form>

        {/* Error Notification */}
        {error && (
          <div className={styles.error}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
