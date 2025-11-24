import SignInPageTemplate from "../../components/templates/SigninPageTemplate";
import { useNavigate } from "react-router-dom";
import UnprotectedRoute from "../../routes/UnprotectedRoute";
import { useGoogleAuthRedirect } from "../../hooks/useGoogleAuth";

export default function Signin() {
    const navigate = useNavigate();
    const { startGoogleAuth } = useGoogleAuthRedirect();
  return <UnprotectedRoute>
    <SignInPageTemplate onSignUp={()=>{navigate("/sign-up")}} onGoogleSignIn={startGoogleAuth} />
  </UnprotectedRoute>
}
