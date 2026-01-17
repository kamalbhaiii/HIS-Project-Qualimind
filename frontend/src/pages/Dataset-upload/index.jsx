import UploadDatasetPageTemplate from "../../components/templates/UploadDatasetPageTemplate";
import DashboardLayout from "../../layouts/DashboardLayout";
import ProtectedRoute from "../../routes/ProtectedRoute";

export default function UploadDataset() {
  return <ProtectedRoute>
      <DashboardLayout activeKey="dataset-upload">
        <UploadDatasetPageTemplate />
      </DashboardLayout>
    </ProtectedRoute>
}
