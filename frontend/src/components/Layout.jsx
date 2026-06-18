import Sidebar from "./Sidebar";

const Layout = ({ children }) => (
  <div className="app-shell">
    <Sidebar />
    <main className="content workspace-content">{children}</main>
  </div>
);

export default Layout;
