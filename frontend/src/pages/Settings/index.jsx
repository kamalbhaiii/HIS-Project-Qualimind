import DashboardLayout from "../../components/templates/DashboardLayout";
import SettingsPageTemplate from "../../components/templates/SettingsPagelTemplate";
import ProtectedRoute from "../../routes/ProtectedRoute";

export default function Settings() {
  return <ProtectedRoute>
    <DashboardLayout activeKey="settings">
      <SettingsPageTemplate />
    </DashboardLayout>
  </ProtectedRoute>;
}
