import { SafeAreaView, StyleSheet, View, TouchableOpacity, TextInput, Keyboard, TouchableWithoutFeedback, Pressable } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Button, Label } from '../../components';
import { En } from '../../locales/En';
import { COLOR, hp, TEXT_STYLE, wp } from '../../enums/StyleGuide';
import { SCREEN } from '../../enums/AppEnums';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { SVG } from '../../assets/svgs';
import ProgressBar from 'react-native-progress/Bar';
import { useTripStore } from '../../store/tripStore'; // Import Zustand store
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import Toast from 'react-native-toast-message';

const hapticOptions = {
  enableVibrateFallback: true,
};

const options = [
  { label: '🚶 Alone', value: 'alone' },
  { label: '💑 With Partner', value: 'partner' },
  { label: '👨‍👩‍👧‍👦  With Family', value: 'family' },
  { label: '👫  With Friends', value: 'friends' },
  { label: '🧑‍🤝‍🧑 Group', value: 'group' },
];

const currentStep = 3;
const totalSteps = 8;
const progress = currentStep / totalSteps;

const CompanionScreen = ({ navigation }) => {
  const { tripData, setTripData } = useTripStore(); // Access Zustand store

  const user = useSelector(({ appReducer }) => appReducer.user);
  const route = useRoute();
  const tripId = route.params?.tripId;

  // Load saved values if they exist
  const [selectedOption, setSelectedOption] = useState(tripData.companion || null);
  const [numberOfPersons, setNumberOfPersons] = useState(tripData.numberOfPersons || '');

  useEffect(() => {
    setTripData({ companion: selectedOption, numberOfPersons });
  }, [selectedOption, numberOfPersons]);

  const handleSelect = (value) => {
    setSelectedOption(value);
    setNumberOfPersons(''); // Reset input when changing selection
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
  };

  const shouldShowInput = selectedOption === 'family' || selectedOption === 'friends' || selectedOption === 'group';

  const handleSaveCompanion = async () => {
    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(tripId)
        .update({
          companion: selectedOption,
          numberOfPersons: numberOfPersons
        });

      Toast.show({
        visibilityTime: 2000,
        type: 'success',
        text1: 'Dates Updated Successfully',
        position: 'Top',
      });

    } catch (error) {
      console.error('Error updating dates:', error);
      Toast.show({
        type: 'error',
        position: 'bottom',
        text1: 'Failed to update dates',
        visibilityTime: 4000,
      });
    }
  };

  const handleNext = () => {
    if (!selectedOption || (shouldShowInput && !numberOfPersons)) return;

    setTripData({ companion: selectedOption, numberOfPersons });
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate(SCREEN.BUDGET, { tripId })

  };

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

          setNumberOfPersons(data.numberOfPersons);
          setSelectedOption(data.companion);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Trip-Daten:', error);
      }
    };

    loadTripData();
  }, [tripId]); // Abhängigkeit von tripId

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.screenContainer}>
        <View style={styles.contentContainer}>
          <SafeAreaView />

          {/* Step Indicator and Progress Bar */}
          <View style={styles.stepIndicatorContainer}>
            <Label style={styles.stepText}>Step {currentStep} of {totalSteps}</Label>
            <ProgressBar
              progress={progress}
              width={wp(80)}
              height={hp(1)}
              color={COLOR.lightBlue}
              borderRadius={5}
            />
          </View>

          <View style={styles.headlineContainer}>
            <Pressable onPress={() => navigation.goBack()}>
              <SVG.BackIcon fill="black" />
            </Pressable>
            <Label style={styles.titleText}>{En.companionTitle}</Label>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => tripId ? navigation.navigate(SCREEN.TRIPDETAILS, { tripId: tripId }) : navigation.navigate(SCREEN.TRIPS)}>
              <SVG.Close fill="black" />
            </Pressable>
          </View>
          <Label style={styles.subtitleText}>{En.companionSubtitle}</Label>

          <View style={styles.optionsContainer}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  selectedOption === option.value && styles.selectedOption,
                ]}
                onPress={() => handleSelect(option.value)}
              >
                <Label style={styles.optionText}>{option.label}</Label>
              </TouchableOpacity>
            ))}
          </View>

          {/* Show input field when necessary */}
          {shouldShowInput && (
            <TextInput
              style={styles.input}
              placeholder="Enter number of persons"
              placeholderTextColor="black"
              keyboardType="numeric"
              value={numberOfPersons}
              onChangeText={setNumberOfPersons}
            />
          )}
        </View>

        <View style={styles.submitContainer}>
          {tripId && (
            <Button
              style={styles.saveButton}
              text={En.save}
              onPress={handleSaveCompanion}
            />
          )}
          <Button
            style={styles.nextButton}
            text={En.next}
            textStyle={styles.buttonText}
            onPress={handleNext}
            disabled={!selectedOption || (shouldShowInput && !numberOfPersons)} // Disable if input is required but empty
          />
        </View>

      </View>
    </TouchableWithoutFeedback>
  );
};

export default CompanionScreen;

const styles = StyleSheet.create({
  headlineContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // Align items on both ends
    width: '100%', // Ensure the container takes full width
    paddingHorizontal: 10, // Optional: for inner spacing
    gap: wp(2),
    marginTop: hp(2)
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
  },
  optionButton: {
    backgroundColor: COLOR.darkGrey,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 5,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: "#444",
  },
  selectedOption: {
    backgroundColor: COLOR.lightBlue,
    borderWidth: 0,
  },
  optionText: {
    color: 'black',
    ...TEXT_STYLE.textMedium,
  },
  input: {
    backgroundColor: COLOR.lightGray,
    color: COLOR.black,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    fontSize: 16,
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
  stepIndicatorContainer: {
    alignItems: 'center',
  },
  stepText: {
    ...TEXT_STYLE.textSmall,
    color: COLOR.lightBlue,
    marginBottom: hp(1),
  },

  submitContainer: {
    justifyContent: 'flex-end',
    marginTop: 'auto',
    width: '100%',
    paddingHorizontal: wp(2),
    marginBottom: hp(2),
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
