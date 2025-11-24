import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { handleGoogleCallback } from '../../services/modules/auth.api';
import { saveAuth } from '../../lib/authStorage';
import { useToast } from '../../components/organisms/ToastProvider';

export default function GoogleCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    try {
        const token = params.get("token");
    const name = params.get("name");
    const email = params.get("email");
    const id = params.get("id");

    if (!token || !email) {
      showToast("Google authentication failed.", "error");
      navigate("/sign-in", { replace: true });
      return;
    }

    // save token & user to storage
    saveAuth({
      token,
      user: {
        id,
        name,
        email,
      },
    });

    showToast(`Welcome, ${name}!`, "success");

    navigate("/dashboard", { replace: true });
    }
    catch (error) {
        showToast("Google authentication failed.", "error");
        navigate("/sign-in", { replace: true });
    }
  }, []);

  return <div>Authenticating...</div>;
}
