import { StyleSheet, View, Pressable, Linking, SafeAreaView, ScrollView } from 'react-native';
import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { AppHeader, Button, Label } from '../../components';
import { COLOR, hp, TEXT_STYLE, wp } from '../../enums/StyleGuide';
import { SCREEN } from '../../enums/AppEnums';
import { SVG } from '../../assets/svgs';

const options = {
  enableVibrateFallback: true,
};

const benefits = [
  {
    icon: SVG.Itinerary,
    title: 'Unlimited Trip Planning',
    text: 'Create as many city trips as you want, with dates, companions, budgets, activities, and preferences.',
  },
  {
    icon: SVG.Ai,
    title: 'Triposo AI Assistant',
    text: 'Ask smart travel questions, refine your plan, and get fast help while planning.',
  },
  {
    icon: SVG.TakeOff,
    title: 'Flights & Hotels',
    text: 'Search useful flight and hotel options directly from your itinerary flow.',
  },
  {
    icon: SVG.Light,
    title: 'Local Ideas',
    text: 'Discover attractions, fun facts, day-by-day plans, and recommendations for your destination.',
  },
  {
    icon: SVG.Car,
    title: 'Full Travel Toolkit',
    text: 'Keep all core travel features available without trials, upgrades, restores, or subscription checks.',
  },
];

const AdvantageScreen = ({ navigation, route }) => {
  const from = route?.params?.from;

  const goBack = () => {
    ReactNativeHapticFeedback.trigger('impactLight', options);
    navigation.navigate(from === 'settings' ? SCREEN.SETTINGS : SCREEN.TRIPS);
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://docs.google.com/document/d/1CXrrY2vo-D6eus-KniGzYcZf5du8oKUA/edit?usp=sharing&ouid=117901746878207900634&rtpof=true&sd=true');
  };

  const openTermsOfUse = () => {
    Linking.openURL('https://docs.google.com/document/d/1kzhXaDFljB0H5AgYIpEO9v-9PGFZxqnI/edit?usp=sharing&ouid=117901746878207900634&rtpof=true&sd=true');
  };

  const startPlanning = () => {
    ReactNativeHapticFeedback.trigger('impactLight', options);
    navigation.navigate(SCREEN.DESTINATION);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView />
      <AppHeader
        leftComp={
          <Pressable onPress={goBack}>
            <SVG.BackIcon fill={COLOR.primary} />
          </Pressable>
        }
        title="Prime Access"
        titleStyle={styles.headerTitle}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#002953', '#245AA8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroBadge}>
            <SVG.Done />
            <Label style={styles.heroBadgeText}>Included with your app purchase</Label>
          </View>
          <Label style={styles.heroTitle}>Everything is unlocked.</Label>
          <Label style={styles.heroText}>
            You already have full access to Triposo AI planning, travel tools, and itinerary features.
          </Label>
        </LinearGradient>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Label style={styles.summaryValue}>No</Label>
            <Label style={styles.summaryLabel}>subscriptions</Label>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Label style={styles.summaryValue}>No</Label>
            <Label style={styles.summaryLabel}>restore needed</Label>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Label style={styles.summaryValue}>Full</Label>
            <Label style={styles.summaryLabel}>access</Label>
          </View>
        </View>

        <View style={styles.section}>
          <Label style={styles.sectionTitle}>Your Advantages</Label>
          {benefits.map((item) => {
            const Icon = item.icon;
            return (
              <View key={item.title} style={styles.benefitItem}>
                <View style={styles.iconWrap}>
                  <Icon fill="#3B82F6" width={22} height={22} />
                </View>
                <View style={styles.benefitCopy}>
                  <Label style={styles.benefitTitle}>{item.title}</Label>
                  <Label style={styles.benefitText}>{item.text}</Label>
                </View>
              </View>
            );
          })}
        </View>

        <LinearGradient
          colors={['#002953', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaButton}
        >
          <Button
            text="Plan a New Trip"
            textStyle={styles.ctaText}
            style={styles.transparentButton}
            onPress={startPlanning}
          />
        </LinearGradient>

        <View style={styles.legalLinks}>
          <Pressable
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight', options);
              openTermsOfUse();
            }}
          >
            <Label style={styles.legalText}>Terms of Service</Label>
          </Pressable>
          <Label style={styles.legalSeparator}>-</Label>
          <Pressable
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight', options);
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

export default AdvantageScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.background,
  },
  headerTitle: {
    ...TEXT_STYLE.textBold,
    color: COLOR.primary,
  },
  scrollContent: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(4),
  },
  hero: {
    borderRadius: hp(2),
    padding: wp(5),
    marginBottom: hp(2),
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: hp(3),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    marginBottom: hp(2),
  },
  heroBadgeText: {
    ...TEXT_STYLE.smallTextSemiBold,
    color: COLOR.white,
  },
  heroTitle: {
    ...TEXT_STYLE.title,
    color: COLOR.white,
    fontWeight: '800',
    marginBottom: hp(1),
  },
  heroText: {
    ...TEXT_STYLE.bigText,
    color: '#E8F0FE',
    lineHeight: 25,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLOR.white,
    borderRadius: hp(1.5),
    paddingVertical: hp(2),
    marginBottom: hp(2),
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    ...TEXT_STYLE.bigTextBold,
    color: COLOR.primary,
    marginBottom: hp(0.4),
  },
  summaryLabel: {
    ...TEXT_STYLE.smallTextMedium,
    color: COLOR.gray,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: hp(4),
    backgroundColor: '#E5E7EB',
  },
  section: {
    marginBottom: hp(2),
  },
  sectionTitle: {
    ...TEXT_STYLE.smallTitleBold,
    color: COLOR.primary,
    marginBottom: hp(1.2),
  },
  benefitItem: {
    flexDirection: 'row',
    backgroundColor: COLOR.white,
    borderRadius: hp(1.4),
    padding: wp(4),
    marginBottom: hp(1),
  },
  iconWrap: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    backgroundColor: '#E8F0FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3),
  },
  benefitCopy: {
    flex: 1,
  },
  benefitTitle: {
    ...TEXT_STYLE.textBold,
    color: COLOR.primary,
    marginBottom: hp(0.4),
  },
  benefitText: {
    ...TEXT_STYLE.text,
    color: '#4B5563',
    lineHeight: 21,
  },
  ctaButton: {
    borderRadius: hp(3),
    marginTop: hp(1),
  },
  transparentButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    marginVertical: 0,
  },
  ctaText: {
    color: COLOR.white,
    fontWeight: '700',
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp(2),
  },
  legalText: {
    ...TEXT_STYLE.smallText,
    color: COLOR.gray,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    color: COLOR.gray,
    marginHorizontal: wp(2),
  },
});
