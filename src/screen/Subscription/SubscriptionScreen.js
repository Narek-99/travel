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
    // Pulse animation effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.03,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnimation]);

  const handleSelect = (index, item) => {
    setSelectedIndex(index);
    setExpandedIndex(expandedIndex === index ? null : index);
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
    setLoading(true);  // Set loading to true while processing
    try {
      const id = SUB_IDS[selectedIndex];
      const purchaseSuccess = await handlePurchase(id);

      if (purchaseSuccess) {
        // Navigate to ChatScreen upon successful subscription
        navigation.navigate(SCREEN.TRIPS);
        setTimeout(() => showRating(), 500);
      } else {
        console.log("Purchase was canceled or failed.");
      }
    } catch (error) {
      console.error('handlePurchaseError ----->', error);
    } finally {
      setLoading(false);  // Reset loading state
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView></SafeAreaView>
      <AppHeader
        leftComp={
          <Pressable onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight', options);
            if (from === 'settings') { navigation.navigate(SCREEN.SETTINGS) } else {
              navigation.navigate(SCREEN.TRIPS)
            }
          }}>
            <SVG.BackIcon fill="black" />
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
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingHorizontal: '2%',
            marginBottom: '4%',
          }}
        >
          <Label style={styles.note}>Restore</Label>
        </Pressable>
        <Label style={styles.screenText}>Get Full Access</Label>
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
                <Label style={{ color: COLOR.white }}>{item.text}</Label>
                {item.text === "Yearly" ? (
                  <View style={[styles.saveBadge]}>
                    <Label style={{ ...TEXT_STYLE.textSemiBold }}>Save 87%</Label>
                  </View>
                ) : (
                  <View style={[styles.saveBadge2]}>
                    <Label style={{ ...TEXT_STYLE.textSemiBold }}>Most Popular</Label>
                  </View>
                )}
                <Label style={{ color: COLOR.white }}>
                  {subscription ? subscription.localizedPrice : item.price}/
                  {item.time}
                </Label>
                {/* {selectedIndex === index ? item.iconActive : item.icon} */}
              </Pressable>
              {expandedIndex === index && (
                <View style={styles.dropdownContent}>
                  <View style={[commonStyles.horizontalView, { marginBottom: hp(1) }]}>
                    {item.earlyIcon}
                    <Label style={{ marginLeft: hp(1), color: COLOR.white }}>{item.earlyaccess && item.earlyaccess}</Label>
                  </View>
                  <View style={[commonStyles.horizontalView, { marginBottom: hp(1) }]}>
                    {item.noLimitIcon}
                    <Label style={{ marginLeft: hp(1), color: COLOR.white }}>{item.nolimit && item.nolimit}</Label>
                  </View>
                  <View style={[commonStyles.horizontalView, { marginBottom: hp(1) }]}>
                    {item.noAdsIcon}
                    <Label style={{ marginLeft: hp(1), color: COLOR.white }}>{item.noAds && item.noAds}</Label>
                  </View>
                  {item?.trial && (
                    <View style={[commonStyles.horizontalView, { marginBottom: hp(1) }]}>
                      {item.freeIcon}
                      <Label style={{ marginLeft: hp(1), color: COLOR.white }}>{item.trial}</Label>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        <Animated.View style={{ transform: [{ scale: pulseAnimation }] }}>
          <Button
            isLoading={loading}
            text={selectedIndex === 0 ? 'Access Premium!' : "Access Premium!"}
            style={{ marginTop: hp(6), backgroundColor: '#7548E3' }}
            textStyle={[{ color: 'white' }]}
            onPress={(handleSubscription)}
          />
        </Animated.View>

        {selectedIndex === 1 && (
          <View style={{ flexDirection: 'column', ...commonStyles.center, marginTop: hp(1) }}>
            <Label style={styles.noPaymentText}>No Payment Now!</Label>
          </View>
        )}

        <View style={{ flexDirection: 'row', ...commonStyles.center, marginTop: hp(3) }}>
          <Pressable onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight', options);
            openTermsOfUse()
          }}>
            <Label style={styles.policyTermsText}>Terms of Service</Label>
          </Pressable>
          <Label style={{ marginHorizontal: wp(2), opacity: 0.7 }}>&</Label>
          <Pressable onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight', options);
            openPrivacyPolicy();
          }}>
            <Label style={styles.policyTermsText}>Privacy Policy</Label>
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
    backgroundColor: COLOR.white,
  },
  saveBadge: {
    backgroundColor: COLOR.black,
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.6),
    borderRadius: hp(1),
    height: wp(8),
    alignItems: 'center',
    backgroundColor: '#7548E3',
  },
  saveBadge2: {
    backgroundColor: COLOR.black,
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.8),
    borderRadius: hp(1),
    height: wp(8),
    // width: wp(),
    alignItems: 'center',
    backgroundColor: '#000',
  },
  innerContainer: {
    flex: 1,
    marginTop: hp(2),
    paddingHorizontal: '4%',
  },
  planView: {
    padding: '5%',
    marginTop: hp(2),
    borderRadius: hp(2),
    backgroundColor: COLOR.black,
    ...commonStyles.justifyView,
  },
  selectedPlanView: {
    backgroundColor: '#002953'
  },
  expandedPlanView: {
    borderTopLeftRadius: hp(2),
    borderTopRightRadius: hp(2),
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dropdownContent: {
    padding: '5%',
    backgroundColor: COLOR.black,
    borderBottomLeftRadius: hp(2),
    borderBottomRightRadius: hp(2),
  },
  screenText: {
    marginVertical: hp(1),
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: COLOR.black
  },
  note: {
    ...TEXT_STYLE.smallText,
    color: COLOR.black,
  },
  policyTermsText: {
    ...TEXT_STYLE.smallText,
    opacity: 0.7,
    color: COLOR.black
  },
  noPaymentText: {
    ...TEXT_STYLE.text,
    color: COLOR.black
  },
});