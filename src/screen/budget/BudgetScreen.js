import { SafeAreaView, StyleSheet, View, TextInput, TouchableOpacity, Text, Keyboard, Pressable, TouchableWithoutFeedback } from 'react-native';
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

const budgetOptions = [
  { label: '💰 Low', value: 'low' },
  { label: '💵 Medium', value: 'medium' },
  { label: '💎 High', value: 'high' },
  { label: '🔢 Enter specific amount', value: 'custom' },
];

const currentStep = 4;
const totalSteps = 8;
const progress = currentStep / totalSteps;

const BudgetScreen = ({ navigation }) => {
  const { tripData, setTripData } = useTripStore(); // Access Zustand store

  const user = useSelector(({ appReducer }) => appReducer.user);
  const route = useRoute();
  const tripId = route.params?.tripId;

  // Load saved values if they exist
  const [selectedBudget, setSelectedBudget] = useState(tripData.budget || null);
  const [customAmount, setCustomAmount] = useState(tripData.customAmount || '');

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

          setCustomAmount(data.customAmount);
          setSelectedBudget(data.budget);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Trip-Daten:', error);
      }
    };

    loadTripData();
  }, [tripId]); // Abhängigkeit von tripId

  useEffect(() => {
    setTripData({ budget: selectedBudget, customAmount });
  }, [selectedBudget, customAmount]);

  const handleSaveBudget = async () => {
    if (!selectedBudget || (selectedBudget === 'custom' && !customAmount)) return;

    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(tripId)
        .update({
          budget: selectedBudget,
          customAmount: selectedBudget === 'custom' ? customAmount : null
        });

      Toast.show({
        type: 'success',
        text1: 'Budget Updated Successfully',
        position: 'top',
        visibilityTime: 2000,
      });

    } catch (error) {
      console.error('Error updating budget:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to update budget',
        position: 'bottom',
        visibilityTime: 4000,
      });
    }
  };

  const handleNext = () => {
    if (!selectedBudget || (selectedBudget === 'custom' && !customAmount)) return;

    setTripData({ budget: selectedBudget, customAmount });
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate(SCREEN.ACTIVITIES, { tripId });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.screenContainer}>
        <View style={styles.contentContainer}>
          <SafeAreaView />
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
            <Label style={styles.titleText}>{En.budgetTitle}</Label>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => tripId ? navigation.navigate(SCREEN.TRIPDETAILS, { tripId: tripId }) : navigation.navigate(SCREEN.TRIPS)}>
              <SVG.Close fill="black" />
            </Pressable>
          </View>
          <Label style={styles.subtitleText}>{En.budgetSubtitle}</Label>

          {/* Budget Options */}
          <View style={styles.optionsContainer}>
            {budgetOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  selectedBudget === option.value && styles.selectedOption,
                ]}
                onPress={() => {
                  setSelectedBudget(option.value);
                  if (option.value !== 'custom') setCustomAmount('');
                }}
              >
                <Text style={styles.optionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedBudget === 'custom' && (
            <TextInput
              style={styles.input}
              placeholder="Enter amount (in U.S. Dollars)"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              value={customAmount}
              onChangeText={(text) => setCustomAmount(text.replace(/[^0-9]/g, ''))} // Only allow numbers
            />
          )}
        </View>

        <View style={styles.submitContainer}>
          {tripId && (
            <Button
              style={styles.saveButton}
              text={En.save}
              textStyle={styles.saveButtonText}
              onPress={handleSaveBudget}  // Use the new handleSaveBudget function
            />
          )}
          <Button
            style={styles.nextButton}
            text={En.next}
            textStyle={styles.buttonText}
            onPress={handleNext}  // Ensure this only handles navigation
            disabled={!selectedBudget || (selectedBudget === 'custom' && !customAmount)}
          />
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default BudgetScreen;

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
  nextButton: {
    backgroundColor: '#002953',
    marginHorizontal: wp(2),
  },
});
