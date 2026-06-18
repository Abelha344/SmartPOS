import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage";
import AuditTrailPage from "./pages/AuditTrailPage";
import ChapaMockCheckoutPage from "./pages/ChapaMockCheckoutPage";
import CheckoutPage from "./pages/CheckoutPage";
import LoginPage from "./pages/LoginPage";
import ManagerReportsPage from "./pages/ManagerReportsPage";
import PaymentReturnPage from "./pages/PaymentReturnPage";
import ProductManagementPage from "./pages/ProductManagementPage";
import RegisterPage from "./pages/RegisterPage";
import SalesHistoryPage from "./pages/SalesHistoryPage";

const App = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/checkout/chapa-payment"
        element={
          <ProtectedRoute>
            <ChapaMockCheckoutPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkout/payment-return"
        element={
          <ProtectedRoute>
            <Layout>
              <PaymentReturnPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkout"
        element={
          <ProtectedRoute>
            <Layout>
              <CheckoutPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <Layout>
              <AdminAnalyticsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/manage/products"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <Layout>
              <ProductManagementPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/reports"
        element={
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <Layout>
              <ManagerReportsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/sales-history"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "AUDITOR", "MANAGER"]}>
            <Layout>
              <SalesHistoryPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit-trail"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "AUDITOR"]}>
            <Layout>
              <AuditTrailPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/checkout" : "/login"} replace />} />
    </Routes>
  );
};

export default App;

