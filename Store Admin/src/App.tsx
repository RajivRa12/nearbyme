import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./routes/_app";
import Login from "./routes/login";
import Dashboard from "./routes/_app/index";
import Waitlist from "./routes/_app/waitlist";
import Calendar from "./routes/_app/calendar";
import Pos from "./routes/_app/pos";
import Appointments from "./routes/_app/appointments";
import Customers from "./routes/_app/customers/index";
import CustomerDetails from "./routes/_app/customers/$id";
import Vendors from "./routes/_app/inventory/vendors";
import PurchaseOrders from "./routes/_app/inventory/purchase-orders";
import Products from "./routes/_app/inventory/products";
import Memberships from "./routes/_app/marketing/memberships";
import Campaigns from "./routes/_app/marketing/campaigns";
import Coupons from "./routes/_app/marketing/coupons";
import Staff from "./routes/_app/staff/index";
import Leaderboard from "./routes/_app/staff/leaderboard";
import Attendance from "./routes/_app/staff/attendance";
import Payroll from "./routes/_app/staff/payroll";
import Commissions from "./routes/_app/staff/commissions";
import Leaves from "./routes/_app/staff/leaves";
import Billing from "./routes/_app/billing/index";
import InvoiceDetails from "./routes/_app/billing/$invoiceId";
import FinancialReports from "./routes/_app/reports/financial";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="waitlist" element={<Waitlist />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="pos" element={<Pos />} />
          <Route path="appointments" element={<Appointments />} />
          
          <Route path="customers">
            <Route index element={<Customers />} />
            <Route path=":id" element={<CustomerDetails />} />
          </Route>
          
          <Route path="inventory">
            <Route path="vendors" element={<Vendors />} />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="products" element={<Products />} />
          </Route>
          
          <Route path="marketing">
            <Route path="memberships" element={<Memberships />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="coupons" element={<Coupons />} />
          </Route>
          
          <Route path="staff">
            <Route index element={<Staff />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="commissions" element={<Commissions />} />
            <Route path="leaves" element={<Leaves />} />
          </Route>
          
          <Route path="billing">
            <Route index element={<Billing />} />
            <Route path=":invoiceId" element={<InvoiceDetails />} />
          </Route>
          
          <Route path="reports">
            <Route path="financial" element={<FinancialReports />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
