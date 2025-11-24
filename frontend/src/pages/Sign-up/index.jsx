import SignUpPageTemplate from "../../components/templates/SignupPageTemplate";
import { useNavigate } from "react-router-dom";
import UnprotectedRoute from "../../routes/UnprotectedRoute";
import { useGoogleAuthRedirect } from "../../hooks/useGoogleAuth";

export default function Signup() {
    const navigate = useNavigate();
    const { startGoogleAuth } = useGoogleAuthRedirect();
  return <UnprotectedRoute>
    <SignUpPageTemplate onSignInRedirect={() => { navigate("/sign-in"); }} onGoogleSignUp={startGoogleAuth} />
  </UnprotectedRoute>
}
