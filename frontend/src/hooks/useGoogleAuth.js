import { getGoogleAuthUrl } from '../services/modules/auth.api';

export const useGoogleAuthRedirect = () => {
  const startGoogleAuth = async () => {
    try {
      const res = await getGoogleAuthUrl();
      const { url } = res;

      if (!url) {
        throw new Error('Google OAuth URL missing');
      }

      window.location.href = url;
    } catch (err) {
      console.error('Google OAuth failed:', err);
      throw err;
    }
  };

  return { startGoogleAuth };
};
