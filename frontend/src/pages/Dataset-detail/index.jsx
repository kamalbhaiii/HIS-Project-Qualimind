import DatasetDetailPage from "../../components/templates/DatasetDetailTemplate";
import ProtectedRoute from "../../routes/ProtectedRoute";

export default function DatasetDetail() {
  return <ProtectedRoute>
    <DatasetDetailPage />
  </ProtectedRoute>;
}
