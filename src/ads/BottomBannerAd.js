import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { BANNER_AD_UNIT_ID } from './AdConfig';
import { useAds } from './AdProvider';

const BottomBannerAd = () => {
  const insets = useSafeAreaInsets();
  const { canRequestAds } = useAds();
  const [failed, setFailed] = useState(false);

  if (!canRequestAds || failed) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 4) }]}>
      <Text style={styles.label}>Advertisement</Text>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdLoaded={() => setFailed(false)}
        onAdFailedToLoad={error => {
          console.warn('Banner ad failed to load:', error);
          setFailed(true);
        }}
      />
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
    paddingTop: 2,
  },
  label: {
    color: '#6B7280',
    fontSize: 9,
    lineHeight: 11,
  },
});

export default BottomBannerAd;
