import { useState } from "react";
import Sidebar from "./Sidebar";

const Layout = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);
  const openMenu = () => setMenuOpen(true);

  const toggleMenu = () => {
    setMenuOpen((open) => {
      document.body.classList.toggle("sidebar-open", !open);
      return !open;
    });
  };

  const closeMenuAndBody = () => {
    document.body.classList.remove("sidebar-open");
    setMenuOpen(false);
  };

  return (
    <div className={`app-shell ${menuOpen ? "sidebar-open" : ""}`}>
      <header className="mobile-topbar">
        <button
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="mobile-menu-btn"
          onClick={toggleMenu}
          type="button"
        >
          <span className="mobile-menu-icon" />
        </button>
        <div className="mobile-topbar-brand">
          <span className="sidebar-badge">Smart POS</span>
          <strong>Retail Terminal</strong>
        </div>
      </header>

      <button
        aria-label="Close menu"
        className="sidebar-backdrop"
        onClick={closeMenuAndBody}
        tabIndex={menuOpen ? 0 : -1}
        type="button"
      />

      <Sidebar menuOpen={menuOpen} onNavigate={closeMenuAndBody} onClose={closeMenuAndBody} />

      <main className="content workspace-content">{children}</main>
    </div>
  );
};

export default Layout;
