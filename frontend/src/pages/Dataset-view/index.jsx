import DatasetViewPageTemplate from "../../components/templates/DatasetViewPageTemplate";
import ProtectedRoute from "../../routes/ProtectedRoute";

export default function DatasetView() {
  return 
  <ProtectedRoute>
    <DatasetViewPageTemplate />
  </ProtectedRoute>
}
