import UploadDatasetPageTemplate from "../../components/templates/UploadDatasetPageTemplate";
import ProtectedRoute from "../../routes/ProtectedRoute";

export default function UploadDataset() {
  return <ProtectedRoute>
    <UploadDatasetPageTemplate />
  </ProtectedRoute>;
}
