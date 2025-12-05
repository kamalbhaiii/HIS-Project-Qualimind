import DashboardLayout from "../../components/templates/DashboardLayout";
import DatasetsPageTemplate from "../../components/templates/DatasetsPageTemplate";
import ProtectedRoute from "../../routes/ProtectedRoute";

export default function Datasets() {
  return <ProtectedRoute>
    <DashboardLayout activeKey="datasets">
      <DatasetsPageTemplate />
    </DashboardLayout>
  </ProtectedRoute>;
}
