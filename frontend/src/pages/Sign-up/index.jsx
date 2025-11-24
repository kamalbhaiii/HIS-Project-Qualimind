import SignUpPageTemplate from "../../components/templates/SignupPageTemplate";
import { useNavigate } from "react-router-dom";
import UnprotectedRoute from "../../routes/UnprotectedRoute";

export default function Signup() {
    const navigate = useNavigate();
  return <UnprotectedRoute>
    <SignUpPageTemplate onSignInRedirect={() => { navigate("/sign-in"); }} />
  </UnprotectedRoute>
}
