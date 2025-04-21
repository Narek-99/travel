import { SafeAreaView, StyleSheet, View, TouchableOpacity, Text, Pressable } from 'react-native';
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

const currentStep = 6;
const totalSteps = 8;
const progress = currentStep / totalSteps;

const wishOptions = [
  { label: '🌱 Vegan', value: 'vegan' },
  { label: '🥗 Vegetarian', value: 'vegetarian' },
  { label: '🚫 Gluten-Free', value: 'glutenFree' },
  { label: '🥙 Halal', value: 'halal' },
  { label: '👨‍👩‍👧‍👦 Family-Friendly', value: 'familyFriendly' },
  { label: '🐾 Pet-Friendly', value: 'petFriendly' },
  { label: '🍽️ Allergy-Friendly', value: 'allergyFriendly' },
  { label: '📶 Free WiFi', value: 'freeWifi' },
  { label: '🏋️‍♂️ Fitness Center', value: 'fitnessCenter' },
  { label: '🧖‍♀️ Spa Services', value: 'spaServices' },
  { label: '🌆 City View', value: 'cityView' },
  { label: '🌃 Near Downtown', value: 'nearDowntown' },
  { label: '🤫 Quiet Environment', value: 'quietEnvironment' },
];

const WishesScreen = ({ navigation }) => {
  const { tripData, setTripData } = useTripStore(); // Access Zustand store

  // Load saved values if they exist
  const [selectedWishes, setSelectedWishes] = useState(tripData.wishes || []);

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

          setSelectedWishes(data.wishes);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Trip-Daten:', error);
      }
    };

    loadTripData();
  }, [tripId]); // Abhängigkeit von tripId

  useEffect(() => {
    setTripData({ wishes: selectedWishes });
  }, [selectedWishes]);

  const handleWishSelect = (wishValue) => {
    setSelectedWishes((prev) => {
      if (prev.includes(wishValue)) {
        return prev.filter((wish) => wish !== wishValue);
      } else {
        return [...prev, wishValue];
      }
    });
  };

  const handleSaveWishes = async () => {
    if (selectedWishes.length === 0) return;

    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(tripId)
        .update({
          wishes: selectedWishes
        });

      Toast.show({
        type: 'success',
        text1: 'Wishes Updated Successfully',
        position: 'top',
        visibilityTime: 2000,
      });

    } catch (error) {
      console.error('Error updating wishes:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to update wishes',
        position: 'bottom',
        visibilityTime: 4000,
      });
    }
  };

  const handleNext = () => {
    if (selectedWishes.length !== 0) {
      setTripData({ wishes: selectedWishes });
    }
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate(SCREEN.PREFERENCES, { tripId });
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.contentContainer}>
        <SafeAreaView />

        <View style={styles.stepIndicatorContainer}>
          <Label style={styles.stepText}>Step {currentStep} of {totalSteps}</Label>
          <ProgressBar
            progress={progress}
            width={wp(80)}
            height={hp(0.8)}
            color={COLOR.primary}
            borderRadius={5}
          />
        </View>
        <View style={styles.headlineContainer}>
          <Pressable onPress={() => navigation.goBack()}>
            <SVG.BackIcon fill="black" />
          </Pressable>
          <Label style={styles.titleText}>{En.wishesTitle}</Label>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => tripId ? navigation.navigate(SCREEN.TRIPDETAILS, { tripId: tripId }) : navigation.navigate(SCREEN.TRIPS)}>
            <SVG.Close fill="black" />
          </Pressable>
        </View>
        <Label style={styles.subtitleText}>{En.wishesSubtitle}</Label>

        {/* Wish Options */}
        <View style={styles.optionsContainer}>
          {wishOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                selectedWishes.includes(option.value) && styles.selectedOption,
              ]}
              onPress={() => handleWishSelect(option.value)}
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
            onPress={handleSaveWishes}
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

export default WishesScreen;

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
  stepIndicatorContainer: {
    alignItems: 'center',
  },
  stepText: {
    ...TEXT_STYLE.textSmall,
    color: COLOR.primary,
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
    backgroundColor: COLOR.primary,
    marginHorizontal: wp(2),
  },
});
