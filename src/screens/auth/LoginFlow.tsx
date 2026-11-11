/**
 * Parcours de connexion / restauration — GERETOU
 * 1. LoginScreen : connexion Google + sauvegarde trouvée
 * 2. PinSetupScreen : PIN propre à ce téléphone (+ biométrie)
 * 3. Restauration de la base en une transaction, puis ouverture de la session.
 */

import React, { useState } from 'react';
import { LoginScreen } from './LoginScreen';
import { PinSetupScreen } from './PinSetupScreen';
import { BackupFile } from '../../services/backup/backupFormat';
import { restoreBackup } from '../../services/backup/syncService';
import { AuthService } from '../../services/auth/authService';
import { markOnboardingDone } from '../../services/storage/prefs';
import { useAuthStore } from '../../store/useAuthStore';

interface LoginFlowProps {
  onBack: () => void;
  onCreateAccount: (email?: string) => void;
}

export const LoginFlow: React.FC<LoginFlowProps> = ({ onBack, onCreateAccount }) => {
  const { biometricAvailable, biometryType, completeRestore } = useAuthStore();
  const [backup, setBackup] = useState<BackupFile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!backup) {
    return <LoginScreen onBack={onBack} onRestore={setBackup} onCreateAccount={onCreateAccount} />;
  }

  return (
    <PinSetupScreen
      biometricAvailable={biometricAvailable}
      biometryType={biometryType}
      submitting={submitting}
      submitError={submitError}
      onBack={() => setBackup(null)}
      onComplete={async (pin, enableBiometrics) => {
        setSubmitting(true);
        setSubmitError(null);
        try {
          const pinHash = await AuthService.hashNewPin(pin);
          await restoreBackup(backup, pinHash);
          await markOnboardingDone();
          // App bascule sur le tableau de bord dès que la session est ouverte.
          await completeRestore(enableBiometrics);
        } catch (e) {
          setSubmitError(`Restauration impossible : ${e instanceof Error ? e.message : String(e)}`);
          setSubmitting(false);
        }
      }}
    />
  );
};
