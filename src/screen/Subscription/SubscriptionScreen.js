import { StyleSheet, View, Pressable, Linking, SafeAreaView, Animated, Easing, ScrollView } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { AppHeader, Button, Label, LeftComponent } from '../../components';
import { COLOR, hp, TEXT_STYLE, wp } from '../../enums/StyleGuide';
import { SCREEN } from '../../enums/AppEnums';
import { SVG } from '../../assets/svgs';
import { subscriptionPlans } from '../../assets/data/DummyData';
import { useSubscriptions } from '../../contexts/subscriptionContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import useRating from '../../utils/useRating';
import LinearGradient from 'react-native-linear-gradient';

const options = {
  enableVibrateFallback: true,
};

const SubscriptionScreen = (props) => {
  const { navigation, route } = props;
  const { SUB_IDS, handlePurchase, getAvailablePurchase, subsciptionList, isProductListLoading } = useSubscriptions();
  const { params } = route || {};
  const from = params?.from;
  const [selectedIndex, setSelectedIndex] = useState(2); // Default to lifetime option
  const [expandedIndex, setExpandedIndex] = useState(2);
  const [loading, setLoading] = useState(false);
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const { showRating } = useRating();

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
    "Smart AI Travel Chatbot Assistant",
    "Fun Facts & City Secrets",
  ];

  // Check if the current date is before May 30, 2025
  const currentDate = new Date('2025-04-21'); // System date
  const offerEndDate = new Date('2025-05-30');
  const isOfferActive = currentDate <= offerEndDate;

  // Updated subscription plans with Lifetime option
  const updatedPlans = [
    ...subscriptionPlans,
    {
      text: "Lifetime",
      price: isOfferActive ? "FREE" : "$199.99",
      time: isOfferActive ? "Until May 30" : "One-Time",
    },
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
        rightComp={<Pressable
          onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight', options);
            getAvailablePurchase();
          }}
          style={styles.restoreButton}
        >
          <Label style={styles.note}>Restore Purchases</Label>
        </Pressable>}
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
                      <Label style={styles.badgeText}>Save 87%</Label>
                    </View>
                  ) : item.text === "Monthly" ? (
                    <View style={styles.saveBadge2}>
                      <Label style={styles.badgeText}>Most Popular</Label>
                    </View>
                  ) : (
                    <View style={styles.lifetimeBadge}>
                      <Label style={styles.badgeText}>Limited Offer!</Label>
                    </View>
                  )}
                </View>
                <Label style={[styles.planPrice, isLifetime && styles.lifetimePlanPrice]}>
                  {isLifetime && isOfferActive
                    ? "FREE Until May 30"
                    : subscription
                      ? subscription.localizedPrice
                      : item.price}
                  /{item.time}
                </Label>
              </Pressable>
            );
          })}

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
                    ? "Get Lifetime Free Now!"
                    : selectedIndex === 0
                      ? 'Try Premium Now!'
                      : "TRY FREE NOW!"
                }
                textStyle={styles.subscribeButtonText}
                style={{ backgroundColor: 'transparent' }}
                onPress={handleSubscription}
              />
            </LinearGradient>
          </Animated.View>

          {selectedIndex === 2 && isOfferActive && (
            <Label style={styles.noPaymentText}>No Payment Until May 30!</Label>
          )}

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
    paddingBottom: hp(6),
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
    padding: wp(4),
    borderRadius: hp(2),
  },
  benefitsTitle: {
    ...TEXT_STYLE.textBold,
    color: COLOR.primary,
    marginBottom: hp(1),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.2),
  },
  featureText: {
    marginLeft: wp(2),
    ...TEXT_STYLE.text,
    color: COLOR.primary,
  },
  planView: {
    backgroundColor: COLOR.white,
    borderRadius: hp(2),
    padding: wp(4),
    marginVertical: hp(1),
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
    borderWidth: 2,
  },
  expandedPlanView: {
    borderBottomLeftRadius: hp(2),
    borderBottomRightRadius: hp(2),
  },
  lifetimePlanView: {
    backgroundColor: '#FFF7E6',
    borderColor: COLOR.accent,
    borderWidth: 2,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTitle: {
    ...TEXT_STYLE.smallTitleBold,
    color: COLOR.primary,
  },
  lifetimePlanTitle: {
    color: COLOR.primary,
  },
  saveBadge: {
    backgroundColor: COLOR.success,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    borderRadius: hp(1),
  },
  saveBadge2: {
    backgroundColor: COLOR.accent,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    borderRadius: hp(1),
  },
  lifetimeBadge: {
    backgroundColor: COLOR.accent,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    borderRadius: hp(1),
  },
  badgeText: {
    ...TEXT_STYLE.smallTextSemiBold,
    color: COLOR.white,
  },
  planPrice: {
    ...TEXT_STYLE.bigText,
    color: COLOR.gray,
    marginTop: hp(1),
  },
  lifetimePlanPrice: {
    color: COLOR.accent,
    fontWeight: '600',
  },
  subscribeButton: {
    marginTop: hp(3),
    borderRadius: hp(1.5),
  },
  subscribeButtonText: {
    ...TEXT_STYLE.bigTextSemiBold,
    color: COLOR.white,
    textAlign: 'center',
  },
  noPaymentText: {
    textAlign: 'center',
    color: COLOR.accent,
    ...TEXT_STYLE.textSemiBold,
    marginTop: hp(1),
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp(2),
  },
  legalText: {
    ...TEXT_STYLE.smallTextMedium,
    color: COLOR.gray,
  },
  legalSeparator: {
    marginHorizontal: wp(2),
    color: COLOR.gray,
  },
});
