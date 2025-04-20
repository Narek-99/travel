import { SafeAreaView, StyleSheet, View } from 'react-native';
import React from 'react';
import { Button, Label, Photo } from '../../components';
import { IMAGES } from '../../assets/images';
import { En } from '../../locales/En';
import { COLOR, hp, TEXT_STYLE, wp } from '../../enums/StyleGuide';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { FIREBASE_COLLECTIONS, USER_STATUS } from '../../enums/AppEnums';
import { getDocumentData, saveData } from '../../services/FirebaseMethods';
import { setUser } from '../../redux/action/Action';
import { useDispatch, useSelector } from 'react-redux';
import useRating from '../../utils/useRating';
import { SCREEN } from '../../enums/AppEnums';

const hapticOptions = {
  enableVibrateFallback: true,
};

const Onboarding1Screen = ({ navigation }) => {
  return (
    <View style={styles.screenContainer}>
      <Photo src={IMAGES.Onboarding1} style={styles.image} contain />
      <View style={styles.contentContainer}>
        <SafeAreaView />

        <Label style={styles.titleText}>{En.onboarding1Title}</Label>
        {/* <Label style={styles.subtitleText}>{En.onboarding1Subtitle}</Label> */}
      </View>

      <Button
        style={styles.continueButton}
        text="✨ Explore Now! ✨"
        textStyle={styles.buttonText}
        onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
          navigation.navigate(SCREEN.HELP);
        }}
      />
    </View>
  );
};

export default Onboarding1Screen;

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    paddingTop: '8%',
    paddingHorizontal: '5%',
  },
  titleText: {
    ...TEXT_STYLE.title,
    fontWeight: '600',
    color: '#FFFFFF', // Changed to white for better contrast
    textShadowColor: 'rgba(0, 0, 0, 0.75)', // Added shadow for readability
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginVertical: hp(1),
  },
  subtitleText: {
    ...TEXT_STYLE.textMedium,
    color: "#FFFFFF", // Changed to white for better contrast
    textShadowColor: 'rgba(0, 0, 0, 0.5)', // Added shadow for readability
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  continueButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 50,
    marginTop: 'auto',
    marginBottom: hp(5),
    marginHorizontal: wp(5),
  },
  buttonText: {
    color: 'white',
  },
});