import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { BANNER_AD_UNIT_ID } from './AdConfig';
import { useAds } from './AdProvider';

const RETRY_DELAY_MS = 2 * 60 * 1000;

const BottomBannerAd = () => {
  const insets = useSafeAreaInsets();
  const { canRequestAds } = useAds();
  const [adFailed, setAdFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!canRequestAds || !adFailed) {
      return undefined;
    }

    const retryTimer = setTimeout(() => {
      setAdFailed(false);
      setRetryKey(key => key + 1);
    }, RETRY_DELAY_MS);

    return () => clearTimeout(retryTimer);
  }, [adFailed, canRequestAds]);

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 4) }]}>
      <Text style={styles.label}>Advertisement</Text>
      {canRequestAds && !adFailed ? (
        <BannerAd
          key={retryKey}
          unitId={BANNER_AD_UNIT_ID}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          onAdLoaded={() => setAdFailed(false)}
          onAdFailedToLoad={error => {
            console.warn('Banner ad failed to load:', error);
            setAdFailed(true);
          }}
        />
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F9FC',
    borderTopColor: '#D9E1EA',
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 58,
    paddingTop: 2,
  },
  label: {
    color: '#6B7280',
    fontSize: 9,
    lineHeight: 11,
  },
  placeholder: {
    height: 50,
    width: '100%',
  },
});

export default BottomBannerAd;
