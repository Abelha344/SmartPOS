import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Sidebar = ({ menuOpen = false, onNavigate, onClose }) => {
  const { user, logout } = useAuth();
  const role = user?.role;

  const linkClass = ({ isActive }) => (isActive ? "nav-link active" : "nav-link");

  const handleNavigate = () => {
    onNavigate?.();
  };

  const handleLogout = () => {
    onNavigate?.();
    logout();
  };

  return (
    <aside className={`sidebar ${menuOpen ? "is-open" : ""}`}>
      <div className="sidebar-mobile-header">
        <div className="sidebar-brand">
          <span className="sidebar-badge">Smart POS</span>
          <h2>Retail Terminal</h2>
        </div>
        <button aria-label="Close menu" className="sidebar-close-btn" onClick={onClose} type="button">
          ×
        </button>
      </div>

      <div className="sidebar-user">
        <strong>{user?.username}</strong>
        <span>{role}</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink className={linkClass} onClick={handleNavigate} to="/checkout">
          Point of Sale
        </NavLink>
        {role === "ADMIN" && (
          <NavLink className={linkClass} onClick={handleNavigate} to="/admin/analytics">
            Analytics
          </NavLink>
        )}
        {(role === "ADMIN" || role === "MANAGER") && (
          <NavLink className={linkClass} onClick={handleNavigate} to="/manage/products">
            Products
          </NavLink>
        )}
        {role === "MANAGER" && (
          <NavLink className={linkClass} onClick={handleNavigate} to="/manager/reports">
            Manager Reports
          </NavLink>
        )}
        {(role === "ADMIN" || role === "AUDITOR" || role === "MANAGER") && (
          <NavLink className={linkClass} onClick={handleNavigate} to="/admin/sales-history">
            Sales History
          </NavLink>
        )}
        {(role === "ADMIN" || role === "AUDITOR") && (
          <NavLink className={linkClass} onClick={handleNavigate} to="/admin/audit-trail">
            Audit Trail
          </NavLink>
        )}
      </nav>

      <button className="sidebar-logout" onClick={handleLogout} type="button">
        Sign out
      </button>
    </aside>
  );
};

export default Sidebar;
