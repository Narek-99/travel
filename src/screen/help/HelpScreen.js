import { SafeAreaView, StyleSheet, View, Text, Pressable } from 'react-native';
import { Button, Photo } from '../../components';
import { IMAGES } from '../../assets/images';
import { En } from '../../locales/En';
import { COLOR, hp, wp } from '../../enums/StyleGuide';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useSelector, useDispatch } from 'react-redux';
import useRating from '../../utils/useRating';
import { SVG } from '../../assets/svgs';
import { FIREBASE_COLLECTIONS, USER_STATUS } from '../../enums/AppEnums';
import { getDocumentData, saveData } from '../../services/FirebaseMethods';
import { setUser } from '../../redux/action/Action';
import { Animated } from 'react-native';
import React, { useRef, useEffect } from 'react';

const hapticOptions = { enableVibrateFallback: true };

const HelpScreen = ({ navigation }) => {
  const user = useSelector(({ appReducer }) => appReducer.user);
  const dispatch = useDispatch();
  const { showRating } = useRating();
  const scaleAnim = useRef(new Animated.Value(1)).current;

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
    try {
      await showRating();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const updatedData = { userStatus: USER_STATUS.OLD };
      await saveData(FIREBASE_COLLECTIONS.USERS, user?.uid, updatedData);

      const updatedUserData = await getDocumentData(FIREBASE_COLLECTIONS.USERS, user?.uid);
      dispatch(setUser(updatedUserData));
    } catch (error) {
      console.log('Error updating user status:', error);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView />
      <View style={styles.headlineContainer}>
        <Pressable onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
          navigation.goBack();
        }}>
          <SVG.BackIcon fill="black" />
        </Pressable>
      </View>
      <View style={styles.contentContainer}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Photo src={IMAGES.Heart} style={styles.image} contain />
        </Animated.View>
        <Text style={styles.headline}>Help Us Grow</Text>
        <Text style={styles.subtext}>
          Show your appreciation by leaving a review in the App Store.
        </Text>
      </View>
      <View style={styles.submitContainer}>
        <Button
          style={styles.nextButton}
          text={En.start}
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
  headlineContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: '100%',
    paddingHorizontal: 10,
    gap: wp(2),
    marginTop: hp(2)
  },
  screenContainer: {
    flex: 1,
    backgroundColor: COLOR.white,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
  },
  image: {
    width: wp(50),
    height: wp(30),
    marginBottom: hp(3)
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.black,
    textAlign: 'center',
    marginBottom: hp(1),
  },
  subtext: {
    fontSize: 16,
    color: COLOR.gray,
    textAlign: 'center',
    paddingHorizontal: wp(10),
  },
  submitContainer: {
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: wp(5),
  },
  nextButton: {
    backgroundColor: COLOR.primary,
    borderWidth: 0,
    borderRadius: 50,
    marginBottom: hp(5),
  },
  buttonText: {
    color: COLOR.accent,
    fontSize: 16,
    fontWeight: '600',
  },
});