/**
 * Parcours d'inscription — GERETOU
 * Étape 1 : informations du compte (RegisterScreen)
 * Étape 2 : code PIN + biométrie (PinSetupScreen), puis création du compte en base.
 */

import React, { useState } from 'react';
import { RegisterScreen, RegistrationDetails } from './RegisterScreen';
import { PinSetupScreen } from './PinSetupScreen';
import { useAuthStore } from '../../store/useAuthStore';

interface RegistrationFlowProps {
  /** Retour à l'écran de découverte. */
  onBackToOnboarding: () => void;
  prefillEmail?: string;
  onLogin: () => void;
}

export const RegistrationFlow: React.FC<RegistrationFlowProps> = ({ onBackToOnboarding, prefillEmail, onLogin }) => {
  const { register, biometricAvailable, biometryType, isLoading } = useAuthStore();
  const [details, setDetails] = useState<RegistrationDetails | null>(null);
  const [step, setStep] = useState<'details' | 'pin'>('details');
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (step === 'details' || !details) {
    return (
      <RegisterScreen
        initial={details}
        prefillEmail={prefillEmail}
        onLogin={onLogin}
        onBack={onBackToOnboarding}
        onContinue={(d) => {
          setDetails(d);
          setSubmitError(null);
          setStep('pin');
        }}
      />
    );
  }

  return (
    <PinSetupScreen
      biometricAvailable={biometricAvailable}
      biometryType={biometryType}
      submitting={isLoading}
      submitError={submitError}
      onBack={() => setStep('details')}
      onComplete={async (pin, enableBiometrics) => {
        setSubmitError(null);
        const ok = await register(
          details.email,
          pin,
          enableBiometrics,
          details.initialWave,
          details.initialCash,
          details.displayName
        );
        // En cas de succès, App bascule automatiquement sur le tableau de bord (hasUser = true).
        if (!ok) setSubmitError("Impossible de créer votre coffre. Réessayez dans un instant.");
      }}
    />
  );
};
