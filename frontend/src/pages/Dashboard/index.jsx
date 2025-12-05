import DashboardLayout from "../../components/templates/DashboardLayout";
import DashboardPageTemplate from "../../components/templates/DashboardPageTemplate";
import ProtectedRoute from "../../routes/ProtectedRoute";

export default function Dashboard () {
  return <ProtectedRoute>
    <DashboardLayout activeKey="dashboard">
      <DashboardPageTemplate />
    </DashboardLayout>
  </ProtectedRoute>
}