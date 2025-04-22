import { SafeAreaView, StyleSheet, View, TouchableOpacity, Text, Pressable, ScrollView } from 'react-native';
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

const hapticOptions = { enableVibrateFallback: true };

const currentStep = 6;
const totalSteps = 7;
const progress = currentStep / totalSteps;

const accommodationOptions = [
  { label: '🏨 Hotel', value: 'hotel' },
  { label: '🏡 Airbnb', value: 'airbnb' },
  { label: '🏠 Vacation Apartment', value: 'vacationApartment' },
  { label: '🏨 Hostel', value: 'hostel' },
  { label: '⛺ Camping', value: 'camping' },
  { label: '🌟 Luxury Hotel', value: 'luxuryHotel' },
  { label: '💸 Budget Options', value: 'budgetOptions' },
];

const locationPreferences = [
  { label: '🏙️ Central', value: 'central' },
  { label: '🌳 Quiet Area', value: 'quietArea' },
  { label: '🌲 Near Nature', value: 'nearNature' },
  { label: '💎 Luxury', value: 'luxury' },
  { label: '💰 Budget Friendly', value: 'budgetFriendly' },
];

const PreferencesScreen = ({ navigation }) => {
  const { tripData, setTripData } = useTripStore();
  const [selectedAccommodation, setSelectedAccommodation] = useState(tripData.accommodation || []);
  const [selectedLocation, setSelectedLocation] = useState(tripData.location || []);

  const user = useSelector(({ appReducer }) => appReducer.user);
  const route = useRoute();
  const tripId = route.params?.tripId;

  useEffect(() => {
    const loadTripData = async () => {
      if (!tripId) return; // Frühzeitiger Rückkehr, wenn keine tripId vorhanden ist

      try {
        const tripDetails = await firestore()
          .collection('users')
          .doc(user.uid)
          .collection('trips')
          .doc(tripId)
          .get();
        if (tripDetails.exists) {
          const data = tripDetails.data();

          setSelectedAccommodation(data.accommodation);
          setSelectedLocation(data.location);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Trip-Daten:', error);
      }
    };

    loadTripData();
  }, [tripId]); // Abhängigkeit von tripId

  useEffect(() => {
    setTripData({ accommodation: selectedAccommodation, location: selectedLocation });
  }, [selectedAccommodation, selectedLocation]);

  const handleAccommodationSelect = (value) => {
    setSelectedAccommodation((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const handleLocationSelect = (value) => {
    setSelectedLocation((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const handleSavePreferences = async () => {
    if (selectedAccommodation.length === 0 || selectedLocation.length === 0) {
      try {
        await firestore()
          .collection('users')
          .doc(user.uid)
          .collection('trips')
          .doc(tripId)
          .update({
            accommodation: selectedAccommodation,
            location: selectedLocation
          });

        Toast.show({
          type: 'success',
          text1: 'Preferences Updated Successfully',
          position: 'top',
          visibilityTime: 2000,
        });

      } catch (error) {
        console.error('Error updating preferences:', error);
        Toast.show({
          type: 'error',
          text1: 'Failed to update preferences',
          position: 'bottom',
          visibilityTime: 4000,
        });
      }
    }
  };

  const handleNext = () => {
    if (selectedAccommodation.length !== 0 || selectedLocation.length !== 0) {
      setTripData({ accommodation: selectedAccommodation, location: selectedLocation });
    }

    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate(SCREEN.ADDITIONAL, { tripId });
  };

  return (
    <View style={styles.screenContainer}>
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
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

          <Pressable style={styles.iconWrapper} onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
            tripId ? navigation.navigate(SCREEN.TRIPDETAILS, { tripId }) : navigation.navigate(SCREEN.TRIPS);
          }

          }>
            <SVG.Close fill="black" />
          </Pressable>
        </View>

        <Label style={styles.titleText}>Accommodations</Label>
        <Label style={styles.subtitleText}>1. What type of accommodation do you prefer?</Label>

        <View style={styles.optionsContainer}>
          {accommodationOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                selectedAccommodation.includes(option.value) && styles.selectedOption,
              ]}
              onPress={() => handleAccommodationSelect(option.value)}
            >
              <Text style={styles.optionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Label style={styles.subtitleText}>2. Do you have a preference for location or atmosphere?</Label>

        <View style={styles.optionsContainer}>
          {locationPreferences.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                selectedLocation.includes(option.value) && styles.selectedOption,
              ]}
              onPress={() => handleLocationSelect(option.value)}
            >
              <Text style={styles.optionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.submitContainer}>
        {tripId && (
          <Button
            style={styles.saveButton}
            text={En.save}
            onPress={handleSavePreferences}
          />
        )}
        <Button
          style={styles.nextButton}
          text={En.next}
          textStyle={styles.buttonText}
          onPress={handleNext}
        />
      </View>
    </View>
  );
};

export default PreferencesScreen;

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
  subtitleText: {
    ...TEXT_STYLE.textMedium,
    color: 'black'
  },
  stepIndicatorContainer: {
    alignItems: 'center',
  },
  submitContainer: {
    justifyContent: 'flex-end',
    marginTop: 'auto',
    width: '100%',
    paddingHorizontal: wp(2),
    marginBottom: hp(2),
  },
  nextButton: {
    backgroundColor: COLOR.primary,
    marginHorizontal: wp(2),
  },
});
