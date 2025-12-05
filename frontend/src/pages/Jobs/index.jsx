import DashboardLayout from "../../components/templates/DashboardLayout";
import JobsPageTemplate from "../../components/templates/JobsPageTemplate";
import ProtectedRoute from "../../routes/ProtectedRoute";

export default function Jobs() {
  return <ProtectedRoute>
    <DashboardLayout activeKey="jobs">
      <JobsPageTemplate />
    </DashboardLayout>
  </ProtectedRoute>;
}
