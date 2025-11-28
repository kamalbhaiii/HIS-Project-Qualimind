import SignInPageTemplate from "../../components/templates/SigninPageTemplate";
import { useNavigate, useLocation } from "react-router-dom";
import UnprotectedRoute from "../../routes/UnprotectedRoute";
import { useGoogleAuthRedirect } from "../../hooks/useGoogleAuth";
import {useToast} from '../../components/organisms/ToastProvider';
import { useEffect } from "react";

export default function Signin() {
    const navigate = useNavigate();
      const location = useLocation();
    const { showToast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reason = params.get('reason');
    if (reason === 'session-expired') {
      showToast('Your session has expired. Please sign in again.', 'warning');
    }
  }, [location.search, showToast]);

    const { startGoogleAuth } = useGoogleAuthRedirect();
  return <UnprotectedRoute>
    <SignInPageTemplate onSignUp={()=>{navigate("/sign-up")}} onGoogleSignIn={startGoogleAuth} />
  </UnprotectedRoute>
}
