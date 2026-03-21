import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import "./UserSidebar.css";

export default function UserSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    navigate("/admin/login");
  }

  const isActive = (path) => location.pathname === path;
  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);

  return (
    <>
      {/* 📱 Mobile Toggle */}
      <button onClick={toggleMobile} className="mobile-toggle-btn">
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* 🌑 Overlay */}
      {isMobileOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* 🧊 SIDEBAR CONTAINER */}
      <aside
        className={`sidebar-container ${isMobileOpen ? "mobile-open" : ""}`}
      >
        {/* --- HEADER WITH LOGO --- */}
        <div className="sidebar-header">
          <div className="logo-section">
            <img
              src="/company-logo.png"
              alt="Logo"
              className="sidebar-logo"
              onError={(e) => (e.target.style.display = "none")}
            />
            <div className="brand-text">
              <h2 className="brand-title">PremPavan</h2>
              <span className="brand-subtitle">User Panel</span>
            </div>
          </div>
        </div>

        {/* --- NAVIGATION --- */}
        <nav className="sidebar-nav">
          <SidebarLink
            to="/user/dashboard"
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
            active={isActive("/user/dashboard")}
            onClick={() => setIsMobileOpen(false)}
          />

          <SidebarLink
            to="/user/quotations"
            icon={<FileText size={20} />}
            label="My Quotations"
            active={isActive("/user/quotations")}
            onClick={() => setIsMobileOpen(false)}
          />

          <SidebarLink
            to="/user/quotations/new"
            icon={<PlusCircle size={20} />}
            label="Create Quotation"
            active={isActive("/user/quotations/new")}
            onClick={() => setIsMobileOpen(false)}
          />
        </nav>

        {/* --- LOGOUT --- */}
        <div className="sidebar-footer">
          <button onClick={logout} className="logout-btn">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function SidebarLink({ to, icon, label, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`sidebar-link ${active ? "active" : ""}`}
    >
      <div className="link-icon">{icon}</div>
      <span className="link-text">{label}</span>
    </Link>
  );
}
