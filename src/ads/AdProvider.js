import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import mobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  InterstitialAd,
} from 'react-native-google-mobile-ads';
import {
  INTERSTITIAL_ACTION_INTERVAL,
  INTERSTITIAL_AD_UNIT_ID,
  INTERSTITIAL_TIME_INTERVAL_MS,
} from './AdConfig';

const ACTION_COUNT_KEY = '@triposo_ad_action_count';
const LAST_INTERSTITIAL_KEY = '@triposo_last_interstitial';

const AdContext = createContext({
  canRequestAds: false,
  privacyOptionsRequired: false,
  runAfterInterstitial: async action => action(),
  showPrivacyOptions: async () => {},
});

export const AdProvider = ({ children }) => {
  const [canRequestAds, setCanRequestAds] = useState(false);
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);
  const interstitialRef = useRef(null);
  const interstitialLoadedRef = useRef(false);
  const interstitialUnsubscribersRef = useRef([]);
  const pendingActionRef = useRef(null);
  const adsInitializedRef = useRef(false);
  const actionInProgressRef = useRef(false);
  const mountedRef = useRef(true);

  const clearInterstitialListeners = useCallback(() => {
    interstitialUnsubscribersRef.current.forEach(unsubscribe => unsubscribe());
    interstitialUnsubscribersRef.current = [];
  }, []);

  const loadInterstitial = useCallback(() => {
    clearInterstitialListeners();

    const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });

    interstitialRef.current = interstitial;
    interstitialLoadedRef.current = false;
    interstitialUnsubscribersRef.current = [
      interstitial.addAdEventListener(AdEventType.LOADED, () => {
        interstitialLoadedRef.current = true;
      }),
      interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        interstitialLoadedRef.current = false;
        const pendingAction = pendingActionRef.current;
        pendingActionRef.current = null;
        pendingAction?.();
        loadInterstitial();
      }),
      interstitial.addAdEventListener(AdEventType.ERROR, () => {
        interstitialLoadedRef.current = false;
        const pendingAction = pendingActionRef.current;
        pendingActionRef.current = null;
        pendingAction?.();
      }),
    ];
    interstitial.load();
  }, [clearInterstitialListeners]);

  const startAds = useCallback(async () => {
    if (!adsInitializedRef.current) {
      await mobileAds().initialize();
      adsInitializedRef.current = true;
    }
    loadInterstitial();
  }, [loadInterstitial]);

  useEffect(() => {
    mountedRef.current = true;

    const initializeAds = async () => {
      try {
        if (__DEV__) {
          setCanRequestAds(true);
          await startAds();
          return;
        }

        const consentInfo = await AdsConsent.gatherConsent();

        if (!mountedRef.current) {
          return;
        }

        setPrivacyOptionsRequired(
          consentInfo.privacyOptionsRequirementStatus ===
            AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
        );
        setCanRequestAds(consentInfo.canRequestAds);

        if (consentInfo.canRequestAds) {
          await startAds();
        }
      } catch (error) {
        console.warn('AdMob initialization failed:', error);
      }
    };

    initializeAds();

    return () => {
      mountedRef.current = false;
      clearInterstitialListeners();
    };
  }, [clearInterstitialListeners, startAds]);

  const runAfterInterstitial = useCallback(
    async action => {
      if (actionInProgressRef.current) {
        return;
      }

      actionInProgressRef.current = true;
      const continueAction = typeof action === 'function' ? action : () => {};
      let hasContinued = false;
      const continueOnce = () => {
        if (hasContinued) {
          return;
        }
        hasContinued = true;
        actionInProgressRef.current = false;
        continueAction();
      };

      if (!canRequestAds) {
        continueOnce();
        return;
      }

      try {
        const [storedCount, storedLastShown] = await Promise.all([
          AsyncStorage.getItem(ACTION_COUNT_KEY),
          AsyncStorage.getItem(LAST_INTERSTITIAL_KEY),
        ]);
        const nextCount = Number(storedCount || 0) + 1;
        const lastShownAt = Number(storedLastShown || 0);
        const enoughActions = nextCount % INTERSTITIAL_ACTION_INTERVAL === 0;
        const enoughTimePassed = Date.now() - lastShownAt >= INTERSTITIAL_TIME_INTERVAL_MS;

        await AsyncStorage.setItem(ACTION_COUNT_KEY, String(nextCount));

        if (!enoughActions || !enoughTimePassed || !interstitialLoadedRef.current) {
          continueOnce();
          return;
        }

        interstitialLoadedRef.current = false;
        await AsyncStorage.setItem(LAST_INTERSTITIAL_KEY, String(Date.now()));
        pendingActionRef.current = continueOnce;
        await interstitialRef.current.show();
      } catch (error) {
        const pendingAction = pendingActionRef.current || continueOnce;
        pendingActionRef.current = null;
        pendingAction();
        loadInterstitial();
      }
    },
    [canRequestAds, loadInterstitial],
  );

  const showPrivacyOptions = useCallback(async () => {
    try {
      const consentInfo = await AdsConsent.showPrivacyOptionsForm();
      setPrivacyOptionsRequired(
        consentInfo.privacyOptionsRequirementStatus ===
          AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
      );
      setCanRequestAds(consentInfo.canRequestAds);
      if (consentInfo.canRequestAds) {
        await startAds();
      }
    } catch (error) {
      console.warn('Unable to show ad privacy options:', error);
    }
  }, [startAds]);

  return (
    <AdContext.Provider
      value={{
        canRequestAds,
        privacyOptionsRequired,
        runAfterInterstitial,
        showPrivacyOptions,
      }}>
      {children}
    </AdContext.Provider>
  );
};

export const useAds = () => useContext(AdContext);
