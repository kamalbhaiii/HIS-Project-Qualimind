import JobsPageTemplate from "../../components/templates/JobsPageTemplate";
import ProtectedRoute from "../../routes/ProtectedRoute";

export default function Jobs() {
  return <ProtectedRoute>
    <JobsPageTemplate />
  </ProtectedRoute>;
}
