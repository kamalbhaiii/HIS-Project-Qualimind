import SignInPageTemplate from "../../components/templates/SigninPageTemplate";
import { useNavigate } from "react-router-dom";
import UnprotectedRoute from "../../routes/UnprotectedRoute";

export default function Signin() {
    const navigate = useNavigate();
  return <UnprotectedRoute>
    <SignInPageTemplate onSignUp={()=>{navigate("/sign-up")}} />
  </UnprotectedRoute>
}
