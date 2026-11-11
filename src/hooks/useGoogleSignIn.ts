/**
 * Connexion Google (OAuth) — GERETOU
 * Web : flux « jeton » dans une fenêtre Google.
 * Android / iOS : flux « code + PKCE » (nécessite une version de développement, pas Expo Go).
 */

import { useCallback } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import { exchangeCodeAsync } from 'expo-auth-session';
import { GOOGLE_CLIENT_IDS, GOOGLE_SCOPES, isGoogleConfigured } from '../services/google/googleConfig';
import { GoogleSession, fetchGoogleProfile, saveSession } from '../services/google/googleSession';

export class GoogleSignInError extends Error {}

/** Valeur factice : évite que le fournisseur plante quand l'identifiant de la plateforme manque. */
const UNCONFIGURED = 'non-configure.apps.googleusercontent.com';

export function useGoogleSignIn() {
  const configured = isGoogleConfigured();
  const [request, , promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_IDS.web ?? UNCONFIGURED,
    androidClientId: GOOGLE_CLIENT_IDS.android ?? UNCONFIGURED,
    iosClientId: GOOGLE_CLIENT_IDS.ios ?? UNCONFIGURED,
    scopes: GOOGLE_SCOPES,
    selectAccount: true,
    shouldAutoExchangeCode: false,
  });

  /**
   * Ouvre la connexion Google. Renvoie la session, ou null si l'utilisateur a annulé.
   * Lève GoogleSignInError en cas de problème de configuration ou de refus.
   */
  const signIn = useCallback(async (): Promise<GoogleSession | null> => {
    if (!configured) {
      throw new GoogleSignInError("La connexion Google n'est pas encore configurée sur cet appareil.");
    }
    if (!request) throw new GoogleSignInError('Connexion Google en cours de préparation, réessayez dans un instant.');

    const result = await promptAsync();
    if (result.type === 'cancel' || result.type === 'dismiss' || result.type === 'locked') return null;
    if (result.type === 'error') {
      throw new GoogleSignInError(result.error?.description || result.params?.error_description || 'Connexion Google refusée.');
    }
    if (result.type !== 'success') return null;

    let accessToken = result.authentication?.accessToken ?? result.params.access_token;
    let expiresIn = result.authentication?.expiresIn ?? Number(result.params.expires_in || 0);

    // Applications installées : échange du code contre un jeton (PKCE, sans secret).
    if (!accessToken && result.params.code) {
      const tokens = await exchangeCodeAsync(
        {
          clientId: request.clientId,
          code: result.params.code,
          redirectUri: request.redirectUri,
          extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
        },
        Google.discovery
      );
      accessToken = tokens.accessToken;
      expiresIn = tokens.expiresIn ?? 3600;
    }
    if (!accessToken) throw new GoogleSignInError("Google n'a pas renvoyé de jeton d'accès.");

    const grantedScopes = String(result.params.scope ?? '');
    if (grantedScopes && !grantedScopes.includes('drive.appdata')) {
      throw new GoogleSignInError("L'accès à Google Drive n'a pas été autorisé : la sauvegarde est impossible sans lui.");
    }

    const profile = await fetchGoogleProfile(accessToken);
    const session: GoogleSession = {
      ...profile,
      accessToken,
      expiresAt: Date.now() + (expiresIn || 3600) * 1000,
    };
    await saveSession(session);
    return session;
  }, [configured, request, promptAsync]);

  return { configured, ready: !!request, signIn };
}
