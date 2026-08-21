import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./routes/_app";
import Login from "./routes/login";
import SelectStore from "./routes/select-store";
import Dashboard from "./routes/_app/index";
import Waitlist from "./routes/_app/waitlist";
import Queue from "./routes/_app/queue";
import Calendar from "./routes/_app/calendar";
import Pos from "./routes/_app/pos";
import Appointments from "./routes/_app/appointments";
import Customers from "./routes/_app/customers/index";
import CustomerDetails from "./routes/_app/customers/$id";
import PurchaseOrders from "./routes/_app/inventory/purchase-orders";
import Products from "./routes/_app/inventory/products";
import Vendors from "./routes/_app/inventory/vendors";
import Expenses from "./routes/_app/finance/expenses";
import GiftCards from "./routes/_app/finance/gift-cards";
import Memberships from "./routes/_app/marketing/memberships";
import MembershipPlans from "./routes/_app/marketing/membership-plans";
import PackagePlans from "./routes/_app/marketing/package-plans";
import Campaigns from "./routes/_app/marketing/campaigns";
import Coupons from "./routes/_app/marketing/coupons";
import Staff from "./routes/_app/staff/index";
import Professionals from "./routes/_app/staff/professionals";
import Resources from "./routes/_app/staff/resources";
import CommissionRules from "./routes/_app/staff/commission-rules";
import Commissions from "./routes/_app/staff/commissions";
import Leaderboard from "./routes/_app/staff/leaderboard";
import NewBooking from "./routes/_app/bookings/new";
import Attendance from "./routes/_app/staff/attendance";
import Payroll from "./routes/_app/staff/payroll";
import Leaves from "./routes/_app/staff/leaves";
import StaffTargets from "./routes/_app/staff/targets";
import Billing from "./routes/_app/billing/index";
import InvoiceDetails from "./routes/_app/billing/$invoiceId";
import FinancialReports from "./routes/_app/reports/financial";
import Profile from "./routes/_app/profile";
import Feed from "./routes/_app/feed";
import Conversations from "./routes/_app/conversations";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/select-store" element={<SelectStore />} />
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="waitlist" element={<Waitlist />} />
          <Route path="queue" element={<Queue />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="pos" element={<Pos />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="bookings/new" element={<NewBooking />} />
          
          <Route path="customers">
            <Route index element={<Customers />} />
            <Route path=":id" element={<CustomerDetails />} />
          </Route>
          
          <Route path="inventory">
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="products" element={<Products />} />
            <Route path="vendors" element={<Vendors />} />
          </Route>

          <Route path="finance">
            <Route path="expenses" element={<Expenses />} />
            <Route path="gift-cards" element={<GiftCards />} />
          </Route>

          <Route path="marketing">
            <Route path="memberships" element={<Memberships />} />
            <Route path="membership-plans" element={<MembershipPlans />} />
            <Route path="package-plans" element={<PackagePlans />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="coupons" element={<Coupons />} />
          </Route>
          
          <Route path="staff">
            <Route index element={<Staff />} />
            <Route path="professionals" element={<Professionals />} />
            <Route path="resources" element={<Resources />} />
            <Route path="commission-rules" element={<CommissionRules />} />
            <Route path="commissions" element={<Commissions />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="leaves" element={<Leaves />} />
            <Route path="targets" element={<StaffTargets />} />
          </Route>
          
          <Route path="billing">
            <Route index element={<Billing />} />
            <Route path=":invoiceId" element={<InvoiceDetails />} />
          </Route>
          
          <Route path="reports">
            <Route path="financial" element={<FinancialReports />} />
          </Route>

          <Route path="profile" element={<Profile />} />
          <Route path="feed" element={<Feed />} />
          <Route path="conversations" element={<Conversations />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
