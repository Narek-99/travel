import { StyleSheet, View, Pressable, Linking, SafeAreaView, Animated, Easing } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { AppHeader, Button, Label, LeftComponent } from '../../components';
import { COLOR, commonStyles, hp, TEXT_STYLE, wp } from '../../enums/StyleGuide';
import { SCREEN } from '../../enums/AppEnums';
import { SVG } from '../../assets/svgs';
import { subscriptionPlans } from '../../assets/data/DummyData';
import { useSubscriptions } from '../../contexts/subscriptionContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import useRating from '../../utils/useRating';

const options = {
  enableVibrateFallback: true
};

const SubscriptionScreen = (props) => {
  const { navigation, route } = props;
  const { SUB_IDS, handlePurchase, getAvailablePurchase, subsciptionList } = useSubscriptions();
  const { params } = route || {};
  const from = params?.from;
  const [selectedIndex, setSelectedIndex] = useState(1);
  const [expandedIndex, setExpandedIndex] = useState(1);
  const [packge, setPackge] = useState(subscriptionPlans[0]);
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
    setExpandedIndex(index); // Always keep the selected plan expanded
    setPackge(item);
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
        setTimeout(() => showRating(), 500);
      } else {
        console.log("Purchase was canceled or failed.");
      }
    } catch (error) {
      console.error('handlePurchaseError ----->', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract common benefits from the first plan (they are the same for both)
  const commonBenefits = subscriptionPlans[0];

  return (
    <View style={styles.container}>
      <SafeAreaView />
      <AppHeader
        leftComp={
          <Pressable onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight', options);
            if (from === 'settings') { navigation.navigate(SCREEN.SETTINGS) } else {
              navigation.navigate(SCREEN.TRIPS)
            }
          }}>
            <SVG.BackIcon fill={COLOR.primary} />
          </Pressable>
        }
        centerComp={<LeftComponent />}
      />

      <View style={styles.innerContainer}>
        <Pressable
          onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight', options);
            getAvailablePurchase();
          }}
          style={styles.restoreButton}
        >
          <Label style={styles.note}>Restore Purchases</Label>
        </Pressable>
        <Label style={styles.screenText}>Unlock Premium Access</Label>

        {/* Display common benefits once, below the plan selection */}
        <View style={styles.benefitsContainer}>
          <Label style={styles.benefitsTitle}>What You Get:</Label>
          <View style={styles.featureItem}>
            {commonBenefits.earlyIcon}
            <Label style={styles.featureText}>{commonBenefits.earlyaccess}</Label>
          </View>
          <View style={styles.featureItem}>
            {commonBenefits.noAdsIcon}
            <Label style={styles.featureText}>{commonBenefits.noAds}</Label>
          </View>
          <View style={styles.featureItem}>
            {commonBenefits.freeIcon}
            <Label style={styles.featureText}>{commonBenefits.trial}</Label>
          </View>
          <View style={styles.featureItem}>
            {commonBenefits.freeIcon}
            <Label style={styles.featureText}>{commonBenefits.recommendations}</Label>
          </View>
        </View>
        {subscriptionPlans.map((item, index) => {
          const subscription = subsciptionList.find(sub => sub.productId === SUB_IDS[index]);
          return (
            <View key={index}>
              <Pressable
                style={[
                  styles.planView,
                  selectedIndex === index && styles.selectedPlanView,
                  expandedIndex === index && styles.expandedPlanView,
                ]}
                onPress={() => {
                  ReactNativeHapticFeedback.trigger('impactLight', options);
                  handleSelect(index, item);
                }}
              >
                <View style={styles.planHeader}>
                  <Label style={styles.planTitle}>{item.text}</Label>
                  {item.text === "Yearly" ? (
                    <View style={styles.saveBadge}>
                      <Label style={styles.badgeText}>Save 87%</Label>
                    </View>
                  ) : (
                    <View style={styles.saveBadge2}>
                      <Label style={styles.badgeText}>Most Popular</Label>
                    </View>
                  )}
                </View>
                <Label style={styles.planPrice}>
                  {subscription ? subscription.localizedPrice : item.price}/{item.time}
                </Label>
              </Pressable>
            </View>
          );
        })}



        <Animated.View style={{ transform: [{ scale: pulseAnimation }] }}>
          <Button
            isLoading={loading}
            text={selectedIndex === 0 ? 'Start Premium' : "Try Premium Now!"}
            style={styles.subscribeButton}
            textStyle={styles.subscribeButtonText}
            onPress={handleSubscription}
          />
        </Animated.View>

        {selectedIndex === 1 && (
          <Label style={styles.noPaymentText}>No Payment Required Today!</Label>
        )}

        <View style={styles.legalLinks}>
          <Pressable onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight', options);
            openTermsOfUse();
          }}>
            <Label style={styles.legalText}>Terms of Service</Label>
          </Pressable>
          <Label style={styles.legalSeparator}>•</Label>
          <Pressable onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight', options);
            openPrivacyPolicy();
          }}>
            <Label style={styles.legalText}>Privacy Policy</Label>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default SubscriptionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: '5%',
  },
  restoreButton: {
    alignSelf: 'flex-end',
    marginright: wp(2),
  },
  note: {
    fontSize: 8,
    color: '#4B5563',
    fontWeight: '200',
  },
  screenText: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1F2937',
    marginVertical: hp(2),
  },
  planView: {
    backgroundColor: '#FFFFFF',
    borderRadius: hp(2),
    padding: wp(4),
    marginVertical: hp(1),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedPlanView: {
    backgroundColor: '#E8F0FE',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  expandedPlanView: {
    borderBottomLeftRadius: hp(2), // Reset since we removed the dropdown
    borderBottomRightRadius: hp(2),
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  saveBadge: {
    backgroundColor: '#22C55E',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    borderRadius: hp(1),
  },
  saveBadge2: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    borderRadius: hp(1),
  },
  badgeText: {
    ...TEXT_STYLE.textSemiBold,
    color: '#FFFFFF',
    fontSize: 12,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4B5563',
    marginTop: hp(1),
  },
  benefitsContainer: {
    backgroundColor: '#F1F5F9',
    padding: wp(4),
    borderRadius: hp(2),
    marginVertical: hp(2),
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: hp(1.5),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  featureText: {
    marginLeft: wp(2),
    fontSize: 14,
    color: '#1F2937',
  },
  subscribeButton: {
    marginTop: hp(4),
    backgroundColor: '#3B82F6',
    borderRadius: hp(1.5),
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noPaymentText: {
    textAlign: 'center',
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
    marginTop: hp(1),
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp(1),
  },
  legalText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  legalSeparator: {
    marginHorizontal: wp(2),
    color: '#6B7280',
  },
});