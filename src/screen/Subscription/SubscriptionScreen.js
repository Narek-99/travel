import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import React, { useMemo, useState } from 'react';
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { AppHeader, Button, Label } from '../../components';
import { COLOR, TEXT_STYLE, hp, wp } from '../../enums/StyleGuide';
import { SCREEN } from '../../enums/AppEnums';
import { SVG } from '../../assets/svgs';
import { useSubscriptions } from '../../contexts/subscriptionContext';

const hapticOptions = {
  enableVibrateFallback: true,
};

const benefits = [
  'Unlimited Trips to Any City Worldwide',
  'Best Flight & Hotel Deals',
  'Personalized Weather-Based Recommendations',
  'Smart Triposo Travel Chat Assistant',
  'Fun Facts & City Secrets',
  'No Ads',
];

const fallbackPlans = [
  {
    title: 'Monthly',
    productId: 'com.travel.ai.monthly.4',
    fallbackPrice: 'Loading...',
    caption: 'Flexible access. Cancel anytime.',
    badge: 'Flexible',
  },
  {
    title: 'Yearly',
    productId: 'com.travel.ai.yearly.4',
    fallbackPrice: 'Loading...',
    caption: 'Best value for frequent travel planning.',
    badge: 'Save more',
  },
];

const SubscriptionScreen = ({ navigation, route }) => {
  const from = route?.params?.from;
  const {
    handlePurchase,
    getAvailablePurchase,
    subscriptionList,
    isProductListLoading,
    isSubscribed,
  } = useSubscriptions();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const plans = useMemo(
    () =>
      fallbackPlans.map(plan => {
        const product = subscriptionList.find(item => item.productId === plan.productId);
        return {
          ...plan,
          price: product?.localizedPrice || plan.fallbackPrice,
        };
      }),
    [subscriptionList],
  );

  const goBack = () => {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate(from === 'settings' ? SCREEN.SETTINGS : SCREEN.TRIPS);
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://docs.google.com/document/d/1xcSSKsrhrdHGS9gcfYEqIboULPlLyzpASzGJG7VAM8I/edit?usp=sharing');
  };

  const openTermsOfUse = () => {
    Linking.openURL('https://docs.google.com/document/d/1VWEJDIbVF-zyO6a0BfqVauAcyT2pvAaUMbkwQ9m4WJY/edit?usp=sharing');
  };

  const restorePurchases = async () => {
    try {
      setRestoreLoading(true);
      ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
      await getAvailablePurchase();
      Alert.alert('Restore Purchases', 'Your subscription status has been refreshed.');
    } catch (error) {
      Alert.alert('Restore Purchases', 'Unable to restore purchases right now.');
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleSubscription = async () => {
    if (loading || isProductListLoading) {
      return;
    }

    try {
      setLoading(true);
      ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);

      const productId = plans[selectedIndex]?.productId;
      if (!productId) {
        throw new Error('Missing selected subscription product');
      }
      const purchaseStarted = await handlePurchase(productId);

      if (!purchaseStarted) {
        Alert.alert('Subscription', 'The purchase was cancelled or could not be completed.');
      }
    } catch (error) {
      Alert.alert('Subscription', 'Something went wrong while starting the purchase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#002953', '#063D78', '#001B39']}
        locations={[0, 0.5, 1]}
        style={styles.background}
      />
      <View style={styles.glowTop} />
      <SafeAreaView />
      <AppHeader
        style={styles.header}
        leftComp={
          <Pressable onPress={goBack} style={styles.headerIconButton}>
            <SVG.BackIcon fill={COLOR.white} />
          </Pressable>
        }
        title="Premium Access"
        titleStyle={styles.headerTitle}
        rightComp={
          <Pressable onPress={restorePurchases} style={styles.restoreButton}>
            {restoreLoading ? (
              <ActivityIndicator size="small" color={COLOR.white} />
            ) : (
              <Label style={styles.restoreText}>Restore</Label>
            )}
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroIntro}>
          <View style={styles.heroBadge}>
            <SVG.Flash fill={COLOR.accent} width={18} height={18} />
            <Label style={styles.heroBadgeText}>Triposo Premium</Label>
          </View>
          <Text style={styles.heroTitle}>Unlock every travel tool.</Text>
          <Text style={styles.heroText}>
            Plan unlimited trips, unlock travel tools, and remove ads with Premium.
          </Text>
        </View>

        <View style={styles.benefitsCard}>
          <Label style={styles.sectionTitle}>Included Benefits</Label>
          {benefits.map(item => (
            <View key={item} style={styles.featureItem}>
              <View style={styles.checkIcon}>
                <SVG.Done />
              </View>
              <Label style={styles.featureText}>{item}</Label>
            </View>
          ))}
        </View>

        <View style={styles.plansContainer}>
          {plans.map((item, index) => {
            const selected = selectedIndex === index;
            return (
              <Pressable
                key={item.productId}
                style={[styles.planCard, selected && styles.selectedPlanCard]}
                onPress={() => {
                  ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
                  setSelectedIndex(index);
                }}
              >
                <View style={styles.planHeader}>
                  <View>
                    <Label style={styles.planTitle}>{item.title}</Label>
                    <Label style={styles.planCaption}>{item.caption}</Label>
                  </View>
                  <View style={[styles.planBadge, selected && styles.selectedPlanBadge]}>
                    <Label style={[styles.planBadgeText, selected && styles.selectedPlanBadgeText]}>
                      {item.badge}
                    </Label>
                  </View>
                </View>
                <Label style={styles.planPrice}>{item.price}</Label>
              </Pressable>
            );
          })}
        </View>

        <LinearGradient
          colors={['#FEA300', '#FFBE45']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.subscribeGradient}
        >
          <Button
            isLoading={loading || isProductListLoading}
            disabled={loading || isProductListLoading || isSubscribed}
            text={isSubscribed ? 'Premium Active' : selectedIndex === 0 ? 'Start Monthly' : 'Start Yearly'}
            textStyle={styles.subscribeText}
            style={styles.subscribeButton}
            onPress={handleSubscription}
          />
        </LinearGradient>

        <View style={styles.legalLinks}>
          <Pressable
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
              openTermsOfUse();
            }}
          >
            <Label style={styles.legalText}>Terms of Service</Label>
          </Pressable>
          <Label style={styles.legalSeparator}>-</Label>
          <Pressable
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
              openPrivacyPolicy();
            }}
          >
            <Label style={styles.legalText}>Privacy Policy</Label>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

export default SubscriptionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.primary,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  glowTop: {
    position: 'absolute',
    top: hp(8),
    right: -wp(20),
    width: wp(58),
    height: wp(58),
    borderRadius: wp(29),
    backgroundColor: 'rgba(254, 163, 0, 0.16)',
  },
  header: {
    paddingHorizontal: wp(5),
  },
  headerIconButton: {
    width: hp(4.8),
    height: hp(4.8),
    borderRadius: hp(2.4),
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...TEXT_STYLE.textBold,
    color: COLOR.white,
  },
  restoreButton: {
    minWidth: wp(18),
    alignItems: 'flex-end',
  },
  restoreText: {
    ...TEXT_STYLE.smallTextSemiBold,
    color: '#DDEBFF',
  },
  scrollContent: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(4),
  },
  heroIntro: {
    paddingTop: hp(1),
    paddingBottom: hp(2),
    paddingHorizontal: wp(1),
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    backgroundColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: hp(3),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.7),
    marginBottom: hp(1.1),
  },
  heroBadgeText: {
    ...TEXT_STYLE.smallTextSemiBold,
    color: COLOR.white,
  },
  heroTitle: {
    color: COLOR.white,
    fontFamily: 'Poppins-Bold',
    fontSize: 25,
    fontWeight: '800',
    lineHeight: 31,
    marginBottom: hp(0.7),
  },
  heroText: {
    color: '#DDEBFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    lineHeight: 21,
  },
  benefitsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderRadius: hp(1.6),
    padding: wp(4),
    marginBottom: hp(1.5),
  },
  sectionTitle: {
    ...TEXT_STYLE.textBold,
    color: COLOR.white,
    marginBottom: hp(1),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.9),
  },
  checkIcon: {
    width: wp(6),
    height: wp(6),
    borderRadius: wp(3),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(2.5),
  },
  featureText: {
    ...TEXT_STYLE.text,
    color: '#EEF5FF',
    flex: 1,
  },
  plansContainer: {
    gap: hp(1),
    marginBottom: hp(2),
  },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.11)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderRadius: hp(1.6),
    padding: wp(4),
  },
  selectedPlanCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderColor: COLOR.accent,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(3),
  },
  planTitle: {
    ...TEXT_STYLE.smallTitleBold,
    color: COLOR.white,
  },
  planCaption: {
    ...TEXT_STYLE.smallText,
    color: '#DDEBFF',
    marginTop: hp(0.4),
  },
  planBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: hp(2),
    paddingHorizontal: wp(2.3),
    paddingVertical: hp(0.45),
  },
  selectedPlanBadge: {
    backgroundColor: COLOR.accent,
  },
  planBadgeText: {
    ...TEXT_STYLE.smallTextSemiBold,
    color: '#DDEBFF',
  },
  selectedPlanBadgeText: {
    color: COLOR.primary,
  },
  planPrice: {
    ...TEXT_STYLE.bigTextBold,
    color: COLOR.white,
    marginTop: hp(1.2),
  },
  subscribeGradient: {
    borderRadius: hp(3),
    marginTop: hp(0.5),
  },
  subscribeButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    marginVertical: 0,
  },
  subscribeText: {
    color: COLOR.primary,
    fontWeight: '800',
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp(2),
  },
  legalText: {
    ...TEXT_STYLE.smallText,
    color: '#DDEBFF',
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    color: COLOR.gray,
    marginHorizontal: wp(2),
  },
});
