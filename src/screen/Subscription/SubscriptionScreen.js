import { StyleSheet, View, Pressable, Linking, SafeAreaView, Animated, Easing, ScrollView } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { AppHeader, Button, Label } from '../../components';
import { COLOR, hp, TEXT_STYLE, wp } from '../../enums/StyleGuide';
import { SCREEN } from '../../enums/AppEnums';
import { SVG } from '../../assets/svgs';
import { useSubscriptions } from '../../contexts/subscriptionContext';
import useRating from '../../utils/useRating';
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const options = {
  enableVibrateFallback: true,
};

const SubscriptionScreen = (props) => {
  const { navigation, route } = props;
  const { SUB_IDS, handlePurchase, getAvailablePurchase, subsciptionList, isProductListLoading } = useSubscriptions();
  // Configurable offer end date
  const OFFER_END_DATE = new Date('2025-06-02');
  const lifetimeProduct = subsciptionList.find((sub) => sub.productId === SUB_IDS[2]);
  const LIFETIME_REGULAR_PRICE = lifetimeProduct?.localizedPrice || "$99.99";
  const isOfferActive = new Date() <= OFFER_END_DATE;
  const { params } = route || {};
  const from = params?.from;

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0 });
  const updatedPlans = [
    {
      text: "Yearly",
      price: subsciptionList[0]?.localizedPrice,
      time: "Year",
    },
    {
      text: "Monthly",
      price: subsciptionList[1]?.localizedPrice || "$12.99",
      time: "Month",
    },
  ];

  if (isOfferActive) {
    updatedPlans.push({
      text: "Lifetime",
      price: "100% Free",
      time: `⏳ Ends in ${timeLeft.days} Day${timeLeft.days !== 1 ? 's' : ''} & ${timeLeft.hours} Hour${timeLeft.hours !== 1 ? 's' : ''}`,
      badge: "Limited Offer",
      realPrice: LIFETIME_REGULAR_PRICE,
    });
  }

  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const countdownAnimation = useRef(new Animated.Value(1)).current;
  const { showRating } = useRating();

  const defaultSelectedIndex = isOfferActive ? 2 : 0;

  const [selectedIndex, setSelectedIndex] = useState(defaultSelectedIndex);
  const [expandedIndex, setExpandedIndex] = useState(defaultSelectedIndex);
  const [loading, setLoading] = useState(false);

  // Animation for the main button
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.05,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnimation]);

  // Animation for the countdown text
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(countdownAnimation, {
          toValue: 0.9,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(countdownAnimation, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [countdownAnimation]);

  // Calculate time left for the offer
  useEffect(() => {
    const endDate = OFFER_END_DATE;
    const now = new Date();
    const timeDiff = endDate - now;
    if (timeDiff > 0) {
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      setTimeLeft({ days, hours });
    } else {
      setTimeLeft({ days: 0, hours: 0 });
    }
  }, []);

  const handleSelect = (index, item) => {
    setSelectedIndex(index);
    setExpandedIndex(index);
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://docs.google.com/document/d/1CXrrY2vo-D6eus-KniGzYcZf5du8oKUA/edit?usp=sharing&ouid=117901746878207900634&rtpof=true&sd=true');
  };

  const openTermsOfUse = () => {
    Linking.openURL('https://docs.google.com/document/d/1kzhXaDFljB0H5AgYIpEO9v-9PGFZxqnI/edit?usp=sharing&ouid=117901746878207900634&rtpof=true&sd=true');
  };

  const handleSubscription = async () => {
    ReactNativeHapticFeedback.trigger('impactLight', options);
    setLoading(true);
    try {
      const id = SUB_IDS[selectedIndex];
      const purchaseSuccess = await handlePurchase(id);

      if (purchaseSuccess) {
        navigation.navigate(SCREEN.TRIPS);
        setTimeout(() => showRating(true), 500);
      } else {
        console.log("Purchase was canceled or failed.");
      }
    } catch (error) {
      console.error('handlePurchaseError ----->', error);
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    "Unlimited Trips to Any City Worldwide",
    "Best Flight & Hotel Deals",
    "Personalized Weather-Based Recommendations & Attractions",
    "Smart AI Triposo Chatbot Assistant",
    "Fun Facts & City Secrets",
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView />
      <AppHeader
        leftComp={
          <Pressable
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight', options);
              if (from === 'settings') {
                navigation.navigate(SCREEN.SETTINGS);
              } else {
                navigation.navigate(SCREEN.TRIPS);
              }
            }}
          >
            <SVG.BackIcon fill={COLOR.primary} />
          </Pressable>
        }
        rightComp={
          <Pressable
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight', options);
              getAvailablePurchase();
            }}
            style={styles.restoreButton}
          >
            <Label style={styles.note}>Restore Purchases</Label>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.innerContainer}>
          <Label style={styles.screenText}>Unlock Premium Access</Label>

          <View style={styles.benefitsContainer}>
            <Label style={styles.benefitsTitle}>What You Get:</Label>
            {benefits.map((it, index) => (
              <View key={index} style={styles.featureItem}>
                <SVG.Done />
                <Label style={styles.featureText}>{it}</Label>
              </View>
            ))}
          </View>

          {updatedPlans.map((item, index) => {
            const subscription = subsciptionList.find((sub) => sub.productId === SUB_IDS[index]);
            const isLifetime = item.text === "Lifetime";
            return (
              <Pressable
                key={index}
                style={[
                  styles.planView,
                  selectedIndex === index && styles.selectedPlanView,
                  expandedIndex === index && styles.expandedPlanView,
                  isLifetime && styles.lifetimePlanView,
                ]}
                onPress={() => {
                  ReactNativeHapticFeedback.trigger('impactLight', options);
                  handleSelect(index, item);
                }}
              >
                <View style={styles.planHeader}>
                  <Label style={[styles.planTitle, isLifetime && styles.lifetimePlanTitle]}>
                    {item.text}
                  </Label>
                  {item.text === "Yearly" ? (
                    <View style={styles.saveBadge}>
                      <Label style={styles.badgeText}>Save 49%</Label>
                    </View>
                  ) : item.text === "Monthly" ? (
                    <View style={styles.trialBadge}>
                      <Label style={styles.badgeText}>3-DAY FREE TRIAL</Label>
                    </View>
                  ) : (
                    <View style={styles.lifetimeBadge}>
                      <Label style={styles.badgeText}>
                        {isOfferActive ? "Limited Offer" : "One-Time Buy"}
                      </Label>
                    </View>
                  )}
                </View>
                <View>
                  {isLifetime && isOfferActive ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Label style={[styles.planPrice, { textDecorationLine: 'line-through', color: COLOR.gray }]}>
                        {LIFETIME_REGULAR_PRICE}
                      </Label>
                      <Label style={[styles.planPrice, styles.lifetimePlanPrice]}>
                        $0.00
                      </Label>
                    </View>
                  ) : (
                    <Label style={[styles.planPrice, isLifetime && styles.lifetimePlanPrice]}>
                      {item.price}{!isLifetime && `/${item.time}`}
                    </Label>
                  )}

                  {isLifetime && isOfferActive && (
                    <Animated.View style={{ transform: [{ scale: countdownAnimation }] }}>
                      <Label style={styles.countdownText}>
                        {item.time}
                      </Label>
                    </Animated.View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.footerContainer}>
          {selectedIndex === 2 && isOfferActive ? (
            <Label style={styles.noPaymentText}>
              No Fees. No Limits. Premium for Life
            </Label>
          ) : selectedIndex === 1 ? (
            <Label style={styles.noPaymentText}>
              No Payment Now
            </Label>
          ) : <Label style={styles.noPaymentText}>
            Cancel Anytime
          </Label>}

          <Animated.View style={{ transform: [{ scale: pulseAnimation }] }}>
            <LinearGradient
              colors={['#002953', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.subscribeButton}
            >
              <Button
                isLoading={loading || isProductListLoading}
                disabled={isProductListLoading}
                text={
                  selectedIndex === 2 && isOfferActive
                    ? "Get Free Forever!"
                    : selectedIndex === 0
                      ? "Start Yearly!"
                      : "Try For Free!"
                }
                textStyle={styles.subscribeButtonText}
                style={{ backgroundColor: 'transparent' }}
                onPress={handleSubscription}
              />
            </LinearGradient>
          </Animated.View>
          <View style={styles.legalLinks}>
            <Pressable
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight', options);
                openTermsOfUse();
              }}
            >
              <Label style={styles.legalText}>Terms of Service</Label>
            </Pressable>
            <Label style={styles.legalSeparator}>•</Label>
            <Pressable
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight', options);
                openPrivacyPolicy();
              }}
            >
              <Label style={styles.legalText}>Privacy Policy</Label>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default SubscriptionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.background,
  },
  scrollContent: {
    paddingBottom: hp(2),
  },
  innerContainer: {
    paddingHorizontal: wp(5),
  },
  note: {
    ...TEXT_STYLE.smallText,
    color: COLOR.gray,
    fontWeight: '400',
  },
  screenText: {
    ...TEXT_STYLE.title,
    fontWeight: '700',
    textAlign: 'center',
    color: COLOR.primary,
    marginVertical: hp(2),
  },
  benefitsContainer: {
    backgroundColor: '#F1F5F9',
    padding: wp(3),
    borderRadius: hp(2),
    marginBottom: hp(1),
  },
  benefitsTitle: {
    ...TEXT_STYLE.textBold,
    color: COLOR.primary,
    marginBottom: hp(0.5),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.8),
  },
  featureText: {
    marginLeft: wp(2),
    ...TEXT_STYLE.text,
    color: COLOR.primary,
    fontSize: 13,
  },
  planView: {
    backgroundColor: COLOR.white,
    borderRadius: hp(1.5),
    padding: wp(3),
    marginVertical: hp(0.5),
    ...Platform.select({
      android: { elevation: 3 },
      ios: {
        shadowColor: COLOR.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  selectedPlanView: {
    backgroundColor: '#E8F0FE',
    borderColor: '#3B82F6',
    borderWidth: 1.5,
  },
  expandedPlanView: {
    borderBottomLeftRadius: hp(1.5),
    borderBottomRightRadius: hp(1.5),
  },
  lifetimePlanView: {
    backgroundColor: '#FFF7E6',
    borderColor: COLOR.accent,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTitle: {
    ...TEXT_STYLE.smallTitleBold,
    color: COLOR.primary,
    fontSize: 16,
  },
  lifetimePlanTitle: {
    color: COLOR.primary,
  },
  saveBadge: {
    backgroundColor: COLOR.success,
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    borderRadius: hp(0.8),
  },
  trialBadge: {
    backgroundColor: COLOR.accent,
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    borderRadius: hp(0.8),
  },
  lifetimeBadge: {
    backgroundColor: COLOR.accent,
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    borderRadius: hp(0.8),
  },
  badgeText: {
    ...TEXT_STYLE.smallTextSemiBold,
    color: COLOR.white,
    fontSize: 10,
  },
  planPrice: {
    ...TEXT_STYLE.bigText,
    color: COLOR.gray,
    marginTop: hp(0.5),
    fontSize: 14,
  },
  lifetimePlanPrice: {
    color: COLOR.accent,
    fontWeight: '600',
  },
  countdownText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: hp(0.3),
  },
  freeClarification: {
    color: COLOR.gray,
    fontSize: 10,
    fontWeight: '400',
    marginTop: hp(0.3),
  },
  footerContainer: {
    paddingHorizontal: wp(5),
    paddingVertical: hp(3),
    backgroundColor: COLOR.background,
  },
  subscribeButton: {
    borderRadius: hp(1.5),
    marginVertical: hp(1),
  },
  subscribeButtonText: {
    ...TEXT_STYLE.bigTextSemiBold,
    color: COLOR.white,
    textAlign: 'center',
    fontSize: 15,
  },
  noPaymentText: {
    textAlign: 'center',
    color: COLOR.accent,
    ...TEXT_STYLE.textSemiBold,
    marginBottom: hp(1),
    fontSize: 13,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp(1),
  },
  legalText: {
    ...TEXT_STYLE.smallTextMedium,
    color: COLOR.gray,
    fontSize: 10,
  },
  legalSeparator: {
    marginHorizontal: wp(2),
    color: COLOR.gray,
  },
});