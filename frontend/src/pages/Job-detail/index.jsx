import JobDetailPage from "../../components/templates/JobDetailPageTemplate";
import DashboardLayout from "../../layouts/DashboardLayout";
import ProtectedRoute from "../../routes/ProtectedRoute";

export default function JobDetail() {
  return <ProtectedRoute>
    <DashboardLayout activeKey="jobs">
    <JobDetailPage />
    </DashboardLayout>
  </ProtectedRoute>;
}
