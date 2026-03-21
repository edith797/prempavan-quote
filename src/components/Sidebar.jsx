import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  LayoutDashboard,
  Building2,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  Users,
  Menu,
  X,
  ShoppingCart,
} from "lucide-react";
import "./Sidebar.css";

export default function Sidebar({ isOpen, toggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    navigate("/admin/login");
  }

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
        style={{ width: isOpen ? "260px" : "80px" }} // Slightly wider for modern feel
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

            {isOpen && (
              <div className="brand-text">
                <h2 className="brand-title">PremPavan</h2>
                <span className="brand-subtitle">Admin Panel</span>
              </div>
            )}
          </div>

          {/* Toggle Button */}
          <button onClick={toggle} className="desktop-toggle">
            {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {/* --- NAVIGATION --- */}
        <nav className="sidebar-nav">
          <SidebarLink
            to="/admin/dashboard"
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
            isOpen={isOpen}
            active={location.pathname === "/admin/dashboard"}
            onClick={() => setIsMobileOpen(false)}
          />
          <SidebarLink
            to="/admin/companies"
            icon={<Building2 size={20} />}
            label="Company Master"
            isOpen={isOpen}
            active={location.pathname === "/admin/companies"}
            onClick={() => setIsMobileOpen(false)}
          />
          <SidebarLink
            to="/admin/purchase-orders"
            icon={<ShoppingCart size={20} />}
            label="Purchase Orders"
            isOpen={isOpen}
            active={location.pathname.includes("purchase-order")}
            onClick={() => setIsMobileOpen(false)}
          />
          <SidebarLink
            to="/admin/quotations"
            icon={<FileText size={20} />}
            label="All Quotations"
            isOpen={isOpen}
            active={location.pathname.includes("/admin/quotations")}
            onClick={() => setIsMobileOpen(false)}
          />
          <SidebarLink
            to="/admin/users"
            icon={<Users size={20} />}
            label="User Management"
            isOpen={isOpen}
            active={location.pathname === "/admin/users"}
            onClick={() => setIsMobileOpen(false)}
          />
    
        </nav>

        {/* --- LOGOUT --- */}
        <div className="sidebar-footer">
          <button onClick={logout} className="logout-btn">
            <LogOut size={20} />
            {isOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

// Reusable Link Component
function SidebarLink({ to, icon, label, isOpen, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`sidebar-link ${active ? "active" : ""}`}
      title={!isOpen ? label : ""}
    >
      <div className="link-icon">{icon}</div>
      <span
        className="link-text"
        style={{
          opacity: isOpen ? 1 : 0,
          display: isOpen ? "block" : "none",
        }}
      >
        {label}
      </span>
    </Link>
  );
}
