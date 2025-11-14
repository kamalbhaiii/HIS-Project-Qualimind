import SignUpPageTemplate from "../../components/templates/SignupPageTemplate";
import { useNavigate } from "react-router-dom";

export default function Signup() {
    const navigate = useNavigate();
  return <SignUpPageTemplate onSignInRedirect={() => { navigate("/sign-in"); }} />;
}
