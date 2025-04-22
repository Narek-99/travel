import { SafeAreaView, StyleSheet, View, TouchableOpacity, Text, Pressable } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Button, Label } from '../../components';
import { En } from '../../locales/En';
import { COLOR, hp, TEXT_STYLE, wp } from '../../enums/StyleGuide';
import { SCREEN } from '../../enums/AppEnums';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { SVG } from '../../assets/svgs';
import ProgressBar from 'react-native-progress/Bar';
import { useTripStore } from '../../store/tripStore';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import Toast from 'react-native-toast-message';

const hapticOptions = {
  enableVibrateFallback: true,
};

const currentStep = 5;
const totalSteps = 7;
const progress = currentStep / totalSteps;

const activityOptions = [
  { label: '🎭 Culture & History', value: 'culture' },
  { label: '🌳 Nature', value: 'nature' },
  { label: '💞 Romantic', value: 'romantic' },
  { label: '🌃 Nightlife', value: 'nightlife' },
  { label: '🧘‍♀️ Relaxation', value: 'relaxation' },
  { label: '🛍️ Shopping', value: 'shopping' },
  { label: '📚 Learning', value: 'learning' },
  { label: '⚽ Sports', value: 'sports' },
  { label: '🎮 Tech & VR Experiences', value: 'tech' },
  { label: '🌍 Eco', value: 'eco_tours' },
  { label: '📸 Photography & Sightseeing', value: 'photography' },
];

const ActivitiesScreen = ({ navigation }) => {
  const user = useSelector(({ appReducer }) => appReducer.user);
  const route = useRoute();
  const tripId = route.params?.tripId;
  const [selectedActivities, setSelectedActivities] = useState([]);
  const { setTripData } = useTripStore();

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

          setSelectedActivities(data.activities);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Trip-Daten:', error);
      }
    };

    loadTripData();
  }, [tripId]); // Abhängigkeit von tripId

  const handleActivitySelect = (activityValue) => {
    setSelectedActivities((prev) => {
      if (prev.includes(activityValue)) {
        return prev.filter((activity) => activity !== activityValue);
      } else {
        return [...prev, activityValue];
      }
    });
  };

  const handleSaveActivities = async () => {
    if (selectedActivities.length === 0) return;
    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(tripId)
        .update({
          activities: selectedActivities
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
        position: 'Top',
        visibilityTime: 4000,
      });
    }
  };

  const handleNext = () => {
    if (selectedActivities.length === 0) return;

    setTripData({ activities: selectedActivities });
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate(SCREEN.PREFERENCES, { tripId });
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.contentContainer}>
        <SafeAreaView />

        <View style={styles.headlineContainer}>
          <Pressable style={styles.iconWrapper} onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
            navigation.goBack();
          }}>
            <SVG.BackIcon fill="black" />
          </Pressable>

          <View style={styles.centerWrapper}>
            <Label style={styles.stepText}>Step {currentStep} of {totalSteps}</Label>
            <ProgressBar
              progress={progress}
              width={wp(40)}
              height={hp(0.5)}
              color={COLOR.primary}
              borderRadius={5}
            />
          </View>

          <Pressable style={styles.iconWrapper} onPress={() =>
            tripId ? navigation.navigate(SCREEN.TRIPDETAILS, { tripId }) : navigation.navigate(SCREEN.TRIPS)
          }>
            <SVG.Close fill="black" />
          </Pressable>
        </View>

        <Label style={styles.titleText}>{En.activitiesTitle}</Label>
        <Label style={styles.subtitleText}>{En.activitiesSubtutle}</Label>


        {/* Activity Options */}
        <View style={styles.optionsContainer}>
          {activityOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                selectedActivities.includes(option.value) && styles.selectedOption,
              ]}
              onPress={() => handleActivitySelect(option.value)}
            >
              <Text style={styles.optionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.submitContainer}>
        {tripId && (
          <Button
            style={styles.saveButton}
            text={En.save}
            onPress={handleSaveActivities}
          />
        )}
        <Button
          style={[
            styles.nextButton,
            { backgroundColor: selectedActivities.length === 0 ? COLOR.lightGray : COLOR.primary }
          ]}
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
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    ...TEXT_STYLE.textSmall,
    color: COLOR.primary,
    marginBottom: hp(1),
  },
  screenContainer: {
    flex: 1,
    backgroundColor: COLOR.white,
  },
  contentContainer: {
    paddingTop: '8%',
    paddingHorizontal: '5%',
  },
  titleText: {
    ...TEXT_STYLE.title,
    color: COLOR.black,
    marginVertical: hp(2),
  },
  subtitleText: {
    ...TEXT_STYLE.textMedium,
    color: 'black'
  },
  optionsContainer: {
    marginVertical: hp(4),
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionButton: {
    backgroundColor: COLOR.darkGrey,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 5,
    marginHorizontal: wp(2),
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: COLOR.lightBlue,
  },
  optionText: {
    color: 'black',
    ...TEXT_STYLE.textMedium,
  },
  continueButton: {
    backgroundColor: '#002953',
    marginTop: 'auto',
    marginBottom: hp(5),
    marginHorizontal: wp(2),
  },
  buttonText: {
    color: 'white',
  },
  saveButton: {
    backgroundColor: 'transparent',
    marginHorizontal: wp(2),
    borderWidth: 1,
    borderColor: COLOR.lightBlue
  },
  submitContainer: {
    justifyContent: 'flex-end',
    marginTop: 'auto',
    width: '100%',
    paddingHorizontal: wp(2),
    marginBottom: hp(2),
  },
  nextButton: {
    backgroundColor: '#002953',
    marginHorizontal: wp(2),
  },
});
