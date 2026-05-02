import { SafeAreaView, StyleSheet, View } from 'react-native';
import React from 'react';
import { Button, Label, Photo } from '../../components';
import { IMAGES } from '../../assets/images';
import { COLOR, hp, TEXT_STYLE, wp } from '../../enums/StyleGuide';
import { SCREEN } from '../../enums/AppEnums';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import LinearGradient from 'react-native-linear-gradient';

const hapticOptions = { enableVibrateFallback: true };

const Onboarding1Screen = ({ navigation }) => {
  return (
    <View style={styles.screenContainer}>
      <Photo src={IMAGES.Onboarding1} style={styles.image} />
      <LinearGradient
        colors={['rgba(0, 41, 83, 0.82)', 'rgba(0, 41, 83, 0.24)', 'transparent']}
        locations={[0, 0.52, 1]}
        style={styles.topOverlay}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0, 24, 51, 0.78)', '#001B39']}
        locations={[0, 0.36, 1]}
        style={styles.bottomOverlay}
      />

      <View style={styles.topContent}>
        <SafeAreaView />
        <View style={styles.brandBadge}>
          <Label style={styles.brandText}>Triposo</Label>
        </View>
      </View>

      <View style={styles.bottomContent}>
        <Label style={styles.titleText}>Plan every trip with Triposo.</Label>
        <Label style={styles.subtitleText}>
          Smart itineraries, travel deals, and local tips in one place.
        </Label>

        <View style={styles.accessRow}>
          <View style={styles.accessDot} />
          <Label style={styles.accessText}>Full access included with your app purchase</Label>
        </View>

        <Button
          style={styles.continueButton}
          text="Start"
          textStyle={styles.buttonText}
          onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
            navigation.navigate(SCREEN.HELP);
          }}
        />
      </View>
    </View>
  );
};

export default Onboarding1Screen;
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLOR.primary,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: hp(25),
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: hp(36),
  },
  topContent: {
    paddingHorizontal: wp(5),
  },
  brandBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.26)',
    borderWidth: 1,
    borderRadius: hp(3),
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.8),
    marginTop: hp(1),
  },
  brandText: {
    ...TEXT_STYLE.textBold,
    color: COLOR.white,
    letterSpacing: 0,
  },
  bottomContent: {
    marginTop: 'auto',
    paddingHorizontal: wp(5),
    paddingBottom: hp(3),
  },
  titleText: {
    ...TEXT_STYLE.title,
    color: COLOR.white,
    fontWeight: '800',
    lineHeight: 34,
    marginBottom: hp(0.6),
  },
  subtitleText: {
    ...TEXT_STYLE.bigText,
    color: '#DDEBFF',
    lineHeight: 23,
    marginBottom: hp(1.2),
  },
  accessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: hp(2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    marginBottom: hp(1.2),
  },
  accessDot: {
    width: hp(1),
    height: hp(1),
    borderRadius: hp(0.5),
    backgroundColor: "green",
    marginRight: wp(2.5),
  },
  accessText: {
    ...TEXT_STYLE.smallTextSemiBold,
    color: '#FFF4D6',
    flex: 1,
  },
  continueButton: {
    backgroundColor: COLOR.accent,
    borderColor: COLOR.accent,
    borderRadius: hp(3),
    marginVertical: 0,
    shadowColor: COLOR.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    color: COLOR.primary,
    fontWeight: '800',
  },
});
