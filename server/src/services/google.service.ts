import { OAuth2Client } from 'google-auth-library';
import { prisma } from '@loaders/prisma';
import cfg from '@config/index';
import type { GoogleUserProfile, SignupResponseDTO } from '../types/auth.types';

const { clientId, clientSecret, redirectUri } = cfg.googleAuth;

const oauthClient = new OAuth2Client({
  clientId,
  clientSecret,
  redirectUri,
});

const GOOGLE_OAUTH_BASE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export function getGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
      'openid',
      'email',
      'profile',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });

  return `${GOOGLE_OAUTH_BASE_URL}?${params.toString()}`;
}

async function fetchGoogleUserProfile(accessToken: string): Promise<GoogleUserProfile> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch Google user info');
  }

  const data = (await res.json()) as any;

  return {
    googleId: data.id,
    email: data.email,
    name: data.name,
  };
}

export async function handleGoogleCallback(code: string): Promise<SignupResponseDTO> {
  const { tokens } = await oauthClient.getToken(code);
  if (!tokens.access_token) {
    throw new Error('No access token returned from Google');
  }

  const profile = await fetchGoogleUserProfile(tokens.access_token);

  const user = await prisma.user.upsert({
    where: {
      email: profile.email,
    },
    create: {
      email: profile.email,
      name: profile.name,
      googleId: profile.googleId,
    },
    update: {
      name: profile.name ?? undefined,
      googleId: profile.googleId,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}
