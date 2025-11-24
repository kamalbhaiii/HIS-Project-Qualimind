import DatasetsPageTemplate from "../../components/templates/DatasetsPageTemplate";
import ProtectedRoute from "../../routes/ProtectedRoute";

export default function Datasets() {
  return <ProtectedRoute><DatasetsPageTemplate /></ProtectedRoute>;
}
