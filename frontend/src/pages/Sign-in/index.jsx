import SignInPageTemplate from "../../components/templates/SigninPageTemplate";
import { useNavigate } from "react-router-dom";

export default function Signin() {
    const navigate = useNavigate();
  return <SignInPageTemplate onSignUp={()=>{navigate("/sign-up")}} />;
}
