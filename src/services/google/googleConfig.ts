/**
 * Configuration OAuth Google — GERETOU
 * Les identifiants client viennent de .env.local (variables EXPO_PUBLIC_*), jamais du code.
 * Aucun client_secret n'est utilisé : une application mobile ou web ne doit pas en contenir.
 */

import { Platform } from 'react-native';
import { DRIVE_SCOPE } from '../backup/driveClient';

export const GOOGLE_CLIENT_IDS = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
};

export const GOOGLE_SCOPES = ['openid', 'email', 'profile', DRIVE_SCOPE];

/** Vrai si un identifiant client existe pour la plateforme courante. */
export function isGoogleConfigured(): boolean {
  if (Platform.OS === 'web') return !!GOOGLE_CLIENT_IDS.web;
  if (Platform.OS === 'android') return !!GOOGLE_CLIENT_IDS.android;
  if (Platform.OS === 'ios') return !!GOOGLE_CLIENT_IDS.ios;
  return false;
}
