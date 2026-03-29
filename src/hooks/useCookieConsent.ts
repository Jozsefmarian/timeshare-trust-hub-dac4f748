import { useState, useCallback, useEffect } from "react";

export type CookieCategory = "necessary" | "analytics" | "marketing" | "preferences";

export interface CookieConsent {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

export interface CookieConsentState {
  hasDecided: boolean;
  consent: CookieConsent;
  consentDate: string | null;
  consentVersion: string;
}

const STORAGE_KEY = "tsr_cookie_consent";
const CURRENT_VERSION = "1.0";
const EXPIRY_MONTHS = 12;

const defaultConsent: CookieConsent = {
  necessary: true,
  analytics: false,
  marketing: false,
  preferences: false,
};

const defaultState: CookieConsentState = {
  hasDecided: false,
  consent: defaultConsent,
  consentDate: null,
  consentVersion: CURRENT_VERSION,
};

function isExpired(consentDate: string | null): boolean {
  if (!consentDate) return true;
  const date = new Date(consentDate);
  const expiry = new Date(date);
  expiry.setMonth(expiry.getMonth() + EXPIRY_MONTHS);
  return new Date() > expiry;
}

function loadState(): CookieConsentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const stored = JSON.parse(raw) as CookieConsentState;
    if (stored.consentVersion !== CURRENT_VERSION || isExpired(stored.consentDate)) {
      localStorage.removeItem(STORAGE_KEY);
      return defaultState;
    }
    return stored;
  } catch {
    return defaultState;
  }
}

function saveState(state: CookieConsentState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useCookieConsent() {
  const [state, setState] = useState<CookieConsentState>(loadState);

  useEffect(() => {
    if (state.hasDecided) {
      saveState(state);
    }
  }, [state]);

  const acceptAll = useCallback(() => {
    setState({
      hasDecided: true,
      consent: { necessary: true, analytics: true, marketing: true, preferences: true },
      consentDate: new Date().toISOString(),
      consentVersion: CURRENT_VERSION,
    });
  }, []);

  const rejectAll = useCallback(() => {
    setState({
      hasDecided: true,
      consent: { necessary: true, analytics: false, marketing: false, preferences: false },
      consentDate: new Date().toISOString(),
      consentVersion: CURRENT_VERSION,
    });
  }, []);

  const saveCustom = useCallback((consent: CookieConsent) => {
    setState({
      hasDecided: true,
      consent: { ...consent, necessary: true },
      consentDate: new Date().toISOString(),
      consentVersion: CURRENT_VERSION,
    });
  }, []);

  const resetConsent = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(defaultState);
  }, []);

  return {
    ...state,
    acceptAll,
    rejectAll,
    saveCustom,
    resetConsent,
  };
}
