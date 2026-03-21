import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./auth/AdminLogin";
import useAuthInit from "./hooks/useAuthInit";
import AuthRedirect from "./components/AuthRedirect";

// ================= ADMIN =================
import AdminLayout from "./app/admin/AdminLayout";
import AdminDashboard from "./app/admin/AdminDashboard";
import CompanyMaster from "./app/admin/CompanyMaster";
import AllQuotations from "./app/admin/AllQuotations";
import CreateQuotation from "./app/admin/CreateQuotation";
import QuotationPreview from "./app/admin/QuotationPreview";

import UserManagement from "./app/admin/UserManagement";

// ✅ IMPORT PURCHASE ORDER COMPONENTS
import PurchaseOrderList from "./app/admin/PurchaseOrderList";
import CreatePurchaseOrder from "./app/admin/CreatePurchaseOrder";

// ================= USER =================
import UserLayout from "./app/users/UserLayout";
import UserDashboard from "./app/users/UserDashboard";
import MyQuotations from "./app/users/MyQuotations";
import CreateQuotationUser from "./app/users/CreateQuotationUser";

export default function App() {
  useAuthInit();

  return (
    <BrowserRouter>
      <AuthRedirect />

      <Routes>
        {/* ================= ROOT ================= */}
        <Route path="/" element={<Navigate to="/admin/login" replace />} />

        {/* ================= AUTH ================= */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* ================= ADMIN AREA ================= */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="companies" element={<CompanyMaster />} />
          {/* ✅ QUOTATIONS ROUTES */}
          <Route path="quotations" element={<AllQuotations />} />
          <Route path="quotations/new" element={<CreateQuotation />} />
          <Route path="quotations/edit/:id" element={<CreateQuotation />} />
          <Route
            path="quotations/revise/:id"
            element={<CreateQuotation />}
          />{" "}
          {/* ADDED REVISE ROUTE */}
          <Route path="quotations/:id" element={<QuotationPreview />} />
          {/* ✅ PURCHASE ORDERS ROUTES */}
          <Route path="purchase-orders" element={<PurchaseOrderList />} />
          <Route
            path="purchase-orders/new"
            element={<CreatePurchaseOrder />}
          />{" "}
          {/* STANDARDIZED */}
          <Route
            path="purchase-orders/edit/:id"
            element={<CreatePurchaseOrder />}
          />{" "}
          {/* ADDED EDIT ROUTE */}
          <Route
            path="purchase-orders/revise/:id"
            element={<CreatePurchaseOrder />}
          />{" "}
          {/* ADDED REVISE ROUTE */}
          <Route path="purchase-orders/:id" element={<CreatePurchaseOrder />} />
          {/* Kept for backward compatibility just in case you have old links */}
          <Route
            path="purchase-order/create"
            element={<CreatePurchaseOrder />}
          />
          <Route path="purchase-order/:id" element={<CreatePurchaseOrder />} />
        
          <Route path="users" element={<UserManagement />} />
        </Route>

        {/* ================= USER AREA ================= */}
        <Route path="/user" element={<UserLayout />}>
          <Route path="dashboard" element={<UserDashboard />} />
          {/* ✅ USER QUOTATIONS ROUTES */}
          <Route path="quotations" element={<MyQuotations />} />
          <Route path="quotations/new" element={<CreateQuotationUser />} />
          <Route path="quotations/edit/:id" element={<CreateQuotationUser />} />
          <Route
            path="quotations/revise/:id"
            element={<CreateQuotationUser />}
          />{" "}
          {/* ADDED REVISE ROUTE */}
          <Route path="quotations/:id" element={<QuotationPreview />} />
        </Route>

        {/* ================= 404 ================= */}
        <Route path="*" element={<h2>Page Not Found</h2>} />
      </Routes>
    </BrowserRouter>
  );
}
