import { SafeAreaView, StyleSheet, View, TouchableOpacity, Text, Pressable, Animated, ScrollView } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { Button, Label } from '../../components';
import { En } from '../../locales/En';
import { COLOR, hp, TEXT_STYLE, wp } from '../../enums/StyleGuide';
import { SCREEN } from '../../enums/AppEnums';
import { SVG } from '../../assets/svgs';
import ProgressBar from 'react-native-progress/Bar';
import { useTripStore } from '../../store/tripStore';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import Toast from 'react-native-toast-message';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const hapticOptions = {
  enableVibrateFallback: true,
};

const currentStep = 5;
const totalSteps = 7;
const progress = currentStep / totalSteps;

const activityOptions = [
  { label: '🎭 Culture & History', value: 'culture' },
  { label: '🌳 Nature & Outdoors', value: 'nature' },
  { label: '🥾 Adventure & Thrills', value: 'adventure' },
  { label: '🍴 Food & Culinary', value: 'food' },
  { label: '🌃 Nightlife & Entertainment', value: 'nightlife' },
  { label: '🧘‍♀️ Relaxation & Wellness', value: 'relaxation' },
  { label: '🛍️ Shopping', value: 'shopping' },
  { label: '👨‍👩‍👧 Family-Friendly', value: 'family' },
];

const ActivitiesScreen = ({ navigation }) => {
  const user = useSelector(({ appReducer }) => appReducer.user);
  const route = useRoute();
  const tripId = route.params?.tripId;
  const [selectedActivities, setSelectedActivities] = useState([]);
  const { setTripData } = useTripStore();

  // Animation state for each option
  const animatedValues = useRef(
    activityOptions.reduce((acc, option) => {
      acc[option.value] = {
        scale: new Animated.Value(1),
        opacity: new Animated.Value(0),
      };
      return acc;
    }, {})
  ).current;

  const handleActivitySelect = (activityValue) => {
    setSelectedActivities((prev) => {
      if (prev.includes(activityValue)) {
        animatedValues[activityValue].scale.setValue(1);
        animatedValues[activityValue].opacity.setValue(0);
        return prev.filter((activity) => activity !== activityValue);
      } else {
        Animated.parallel([
          Animated.spring(animatedValues[activityValue].scale, {
            toValue: 1.02,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValues[activityValue].opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
        return [...prev, activityValue];
      }
    });

    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
  };

  useEffect(() => {
    const loadTripData = async () => {
      if (!tripId) return;

      try {
        const tripDetails = await firestore()
          .collection('users')
          .doc(user.uid)
          .collection('trips')
          .doc(tripId)
          .get();
        if (tripDetails.exists) {
          const data = tripDetails.data();
          const activities = data.activities || [];
          setSelectedActivities(activities);
          activities.forEach((activity) => {
            Animated.parallel([
              Animated.spring(animatedValues[activity].scale, {
                toValue: 1.02,
                friction: 5,
                tension: 40,
                useNativeDriver: true,
              }),
              Animated.timing(animatedValues[activity].opacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start();
          });
        }
      } catch (error) {
        console.error('Fehler beim Laden der Trip-Daten:', error);
      }
    };

    loadTripData();
  }, [tripId]);

  const handleSaveActivities = async () => {
    if (selectedActivities.length === 0) return;
    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(tripId)
        .update({
          activities: selectedActivities,
        });

      Toast.show({
        type: 'success',
        text1: 'Activities Updated Successfully',
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (error) {
      console.error('Error updating activities:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to update activities',
        position: 'top',
        visibilityTime: 4000,
      });
    }
  };

  const handleNext = () => {
    setTripData({ activities: selectedActivities });
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate(SCREEN.PREFERENCES, { tripId });
  };

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView />
      <View style={styles.headerContainer}>
        <View style={styles.headlineContainer}>
          <Pressable
            style={styles.iconWrapper}
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
              navigation.goBack();
            }}
          >
            <SVG.BackIcon fill={COLOR.white} />
          </Pressable>

          <View style={styles.centerWrapper}>
            <Label style={styles.stepText}>
              Step {currentStep} of {totalSteps}
            </Label>
            <ProgressBar
              progress={progress}
              width={wp(40)}
              height={hp(0.5)}
              color={COLOR.accent}
              borderRadius={5}
            />
          </View>

          <Pressable
            style={styles.iconWrapper}
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
              tripId
                ? navigation.navigate(SCREEN.TRIPDETAILS, { tripId })
                : navigation.navigate(SCREEN.TRIPS);
            }}
          >
            <SVG.Close fill={COLOR.white} />
          </Pressable>
        </View>

        <Label style={styles.titleText}>{En.activitiesTitle}</Label>
        <Label style={styles.subtitleText}>{En.activitiesSubtutle}</Label>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.optionsContainer}>
          {activityOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => handleActivitySelect(option.value)}
              activeOpacity={0.8}
            >
              <Animated.View
                style={[
                  styles.optionButton,
                  selectedActivities.includes(option.value) && {
                    backgroundColor: COLOR.lightBlue,
                    borderRadius: 8,
                  },
                  {
                    opacity: Animated.add(
                      selectedActivities.includes(option.value)
                        ? animatedValues[option.value].opacity
                        : 1,
                      selectedActivities.includes(option.value) ? 0 : 0.2
                    ),
                  },
                ]}
              >
                <Text style={styles.optionText}>{option.label}</Text>
              </Animated.View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.submitContainer}>
        {tripId && (
          <Button
            style={styles.saveButton}
            textStyle={[{ color: COLOR.white }]}
            text={En.save}
            onPress={handleSaveActivities}
          />
        )}
        <Button
          style={styles.nextButton}
          text={En.next}
          textStyle={styles.buttonText}
          onPress={handleNext}
          disabled={selectedActivities.length === 0}
        />
      </View>
    </View>
  );
};

export default ActivitiesScreen;

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLOR.primary,
  },
  headerContainer: {
    paddingHorizontal: wp(4),
  },
  headlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: hp(2),
    paddingHorizontal: wp(3),
  },
  centerWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  iconWrapper: {
    width: hp(4.8),
    height: hp(4.8),
    borderRadius: hp(2.4),
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    ...TEXT_STYLE.textSmall,
    color: COLOR.white,
    marginBottom: hp(1),
  },
  titleText: {
    ...TEXT_STYLE.title,
    color: COLOR.white,
    marginVertical: hp(2),
  },
  subtitleText: {
    ...TEXT_STYLE.textMedium,
    color: '#DDEBFF',
  },
  scrollContainer: {
    flex: 1,
    marginHorizontal: wp(5),
  },
  optionsContainer: {
    marginVertical: hp(4),
  },
  optionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: hp(1.6),
    marginVertical: 5,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  optionText: {
    color: COLOR.white,
    ...TEXT_STYLE.textMedium,
  },
  submitContainer: {
    backgroundColor: 'rgba(0, 27, 57, 0.94)',
    paddingVertical: hp(2),
    paddingHorizontal: wp(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  saveButton: {
    backgroundColor: 'transparent',
    marginHorizontal: wp(2),
    borderWidth: 1,
    borderColor: COLOR.lightBlue,
  },
  nextButton: {
    backgroundColor: COLOR.accent,
    marginHorizontal: wp(2),
  },
  buttonText: {
    color: COLOR.primary,
    fontWeight: '800',
  }
});
