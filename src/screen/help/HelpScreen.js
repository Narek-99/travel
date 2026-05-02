import { SafeAreaView, StyleSheet, View, Pressable, Animated } from 'react-native';
import { Button, Label } from '../../components';
import { COLOR, hp, TEXT_STYLE, wp } from '../../enums/StyleGuide';
import { useSelector, useDispatch } from 'react-redux';
import { SVG } from '../../assets/svgs';
import { FIREBASE_COLLECTIONS, USER_STATUS } from '../../enums/AppEnums';
import { getDocumentData, saveData } from '../../services/FirebaseMethods';
import { setUser } from '../../redux/action/Action';
import React, { useRef, useEffect, useState } from 'react';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../utils/Keys';
import useRating from '../../utils/useRating';

const hapticOptions = { enableVibrateFallback: true };

const HelpScreen = ({ navigation }) => {
  const user = useSelector(({ appReducer }) => appReducer.user);
  const dispatch = useDispatch();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [loading, setLoading] = useState(false);
  const { showRating } = useRating();

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleUserStatusUpdate = async () => {
    if (loading) return;

    try {
      setLoading(true);

      const uid = user?.uid || await AsyncStorage.getItem(KEYS.USERID);
      if (!uid) {
        throw new Error('Missing user id during onboarding completion');
      }

      await showRating(true);
      await new Promise(resolve => setTimeout(resolve, 700));

      const updatedData = { uid, userStatus: USER_STATUS.OLD };
      dispatch(setUser({ ...(user || {}), ...updatedData }));

      await saveData(FIREBASE_COLLECTIONS.USERS, uid, updatedData);

      const updatedUserData = await getDocumentData(FIREBASE_COLLECTIONS.USERS, uid);
      dispatch(setUser({ ...(user || {}), ...updatedUserData, ...updatedData }));
    } catch (error) {
      console.log('Error updating user status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <LinearGradient
        colors={['#002953', '#063D78', '#001B39']}
        locations={[0, 0.48, 1]}
        style={styles.background}
      />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.headerContainer}>
        <SafeAreaView />
        <Pressable onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
          navigation.goBack();
        }} style={styles.backButton}>
          <SVG.BackIcon fill={COLOR.white} />
        </Pressable>
      </View>

      <View style={styles.contentContainer}>
        <Animated.View style={[styles.iconShell, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.iconCircle}>
            <Label style={styles.heroStar}>★</Label>
          </View>
        </Animated.View>

        <View style={styles.brandBadge}>
          <Label style={styles.brandBadgeText}>Almost ready</Label>
        </View>

        <Label style={styles.headline}>Help us grow</Label>
        <Label style={styles.subtext}>
          A quick rating helps more travelers discover Triposo and keeps the app improving.
        </Label>

        <View style={styles.ratingPreview}>
          <Label style={styles.stars}>★★★★★</Label>
          <Label style={styles.previewText}>A quick App Store rating means a lot.</Label>
        </View>
      </View>

      <View style={styles.submitContainer}>
        <Button
          isLoading={loading}
          disabled={loading}
          style={styles.nextButton}
          text="Okay!"
          textStyle={styles.buttonText}
          onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
            handleUserStatusUpdate();
          }}
        />
      </View>
    </View>
  );
};

export default HelpScreen;

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLOR.primary,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  glowTop: {
    position: 'absolute',
    top: hp(8),
    right: -wp(18),
    width: wp(52),
    height: wp(52),
    borderRadius: wp(26),
    backgroundColor: 'rgba(254, 163, 0, 0.18)',
  },
  glowBottom: {
    position: 'absolute',
    left: -wp(24),
    bottom: hp(5),
    width: wp(70),
    height: wp(70),
    borderRadius: wp(35),
    backgroundColor: 'rgba(142, 187, 255, 0.14)',
  },
  headerContainer: {
    paddingHorizontal: wp(5),
  },
  backButton: {
    width: hp(4.8),
    height: hp(4.8),
    borderRadius: hp(2.4),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingBottom: hp(3),
  },
  iconShell: {
    width: wp(33),
    height: wp(33),
    borderRadius: wp(16.5),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: hp(2.4),
  },
  iconCircle: {
    width: wp(25),
    height: wp(25),
    borderRadius: wp(12.5),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR.white,
  },
  heroStar: {
    color: COLOR.accent,
    fontSize: 54,
    fontWeight: '800',
    lineHeight: 58,
  },
  brandBadge: {
    backgroundColor: 'rgba(254, 163, 0, 0.16)',
    borderColor: 'rgba(254, 163, 0, 0.34)',
    borderWidth: 1,
    borderRadius: hp(3),
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.7),
    marginBottom: hp(1.4),
  },
  brandBadgeText: {
    ...TEXT_STYLE.smallTextSemiBold,
    color: '#FFE0A6',
  },
  headline: {
    ...TEXT_STYLE.title,
    color: COLOR.white,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: hp(0.8),
  },
  subtext: {
    ...TEXT_STYLE.bigText,
    color: '#DDEBFF',
    textAlign: 'center',
    lineHeight: 25,
    paddingHorizontal: wp(3),
    marginBottom: hp(2.2),
  },
  ratingPreview: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: hp(2),
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.4),
    width: '100%',
  },
  stars: {
    color: COLOR.accent,
    fontSize: 23,
    fontWeight: '800',
    marginBottom: hp(0.4),
  },
  previewText: {
    ...TEXT_STYLE.textMedium,
    color: '#FFF4D6',
    textAlign: 'center',
  },
  submitContainer: {
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: wp(5),
    paddingBottom: hp(4),
  },
  nextButton: {
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
    fontSize: 17,
    fontWeight: '800',
  },
});
