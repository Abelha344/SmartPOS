import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const role = user?.role;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-badge">Smart POS</span>
        <h2>Retail Terminal</h2>
      </div>
      <div className="sidebar-user">
        <strong>{user?.username}</strong>
        <span>{role}</span>
      </div>
      <nav className="sidebar-nav">
        <NavLink className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")} to="/checkout">
          Point of Sale
        </NavLink>
        {role === "ADMIN" && (
          <NavLink className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")} to="/admin/analytics">
            Analytics
          </NavLink>
        )}
        {(role === "ADMIN" || role === "MANAGER") && (
          <NavLink className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")} to="/manage/products">
            Products
          </NavLink>
        )}
        {role === "MANAGER" && (
          <NavLink className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")} to="/manager/reports">
            Manager Reports
          </NavLink>
        )}
        {(role === "ADMIN" || role === "AUDITOR" || role === "MANAGER") && (
          <NavLink className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")} to="/admin/sales-history">
            Sales History
          </NavLink>
        )}
        {(role === "ADMIN" || role === "AUDITOR") && (
          <NavLink className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")} to="/admin/audit-trail">
            Audit Trail
          </NavLink>
        )}
      </nav>
      <button className="sidebar-logout" onClick={logout} type="button">
        Sign out
      </button>
    </aside>
  );
};

export default Sidebar;
