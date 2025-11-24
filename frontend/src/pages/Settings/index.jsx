import SettingsPageTemplate from "../../components/templates/SettingsPagelTemplate";
import ProtectedRoute from "../../routes/ProtectedRoute";

export default function Settings() {
  return <ProtectedRoute>
    <SettingsPageTemplate />
  </ProtectedRoute>;
}
