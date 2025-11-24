import JobDetailPage from "../../components/templates/JobDetailPageTemplate";
import ProtectedRoute from "../../routes/ProtectedRoute";

export default function JobDetail() {
  return <ProtectedRoute>
    <JobDetailPage />
  </ProtectedRoute>;
}
