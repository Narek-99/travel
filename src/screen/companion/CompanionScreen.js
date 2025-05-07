import { SafeAreaView, StyleSheet, View, TouchableOpacity, TextInput, Keyboard, TouchableWithoutFeedback, Pressable, Animated, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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

const options = [
  { label: '🚶 Alone', value: 'alone' },
  { label: '💑 With Partner', value: 'partner' },
  { label: '👨‍👩‍👧‍👦  With Family', value: 'family' },
  { label: '👫  With Friends', value: 'friends' },
  { label: '🧑‍🤝‍🧑 With Colleagues', value: 'group' },
];

const currentStep = 3;
const totalSteps = 7;
const progress = currentStep / totalSteps;

const CompanionScreen = ({ navigation }) => {
  const { setTripData } = useTripStore();
  const user = useSelector(({ appReducer }) => appReducer.user);
  const route = useRoute();
  const tripId = route.params?.tripId;

  const [selectedOption, setSelectedOption] = useState('');
  const [numberOfPersons, setNumberOfPersons] = useState('');

  // Animation state for each option
  const animatedValues = useRef(
    options.reduce((acc, option) => {
      acc[option.value] = {
        scale: new Animated.Value(1),
        opacity: new Animated.Value(0),
      };
      return acc;
    }, {})
  ).current;

  const handleSelect = (value) => {
    // Reset all animations
    Object.keys(animatedValues).forEach((key) => {
      if (key !== value) {
        animatedValues[key].scale.setValue(1);
        animatedValues[key].opacity.setValue(0);
      }
    });

    // Animate the selected option
    Animated.parallel([
      Animated.spring(animatedValues[value].scale, {
        toValue: 1.02, // Slight scale up
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValues[value].opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

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
          numberOfPersons: numberOfPersons,
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
    if (!selectedOption || (shouldShowInput && !numberOfPersons)) {
      return;
    }
    setTripData({ companion: selectedOption, numberOfPersons });
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate(SCREEN.BUDGET, { tripId });
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
          setNumberOfPersons(data.numberOfPersons || '');
          setSelectedOption(data.companion || '');
          // Trigger animation for pre-selected option
          if (data.companion) {
            handleSelect(data.companion);
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden der Trip-Daten:', error);
      }
    };

    loadTripData();
  }, [tripId]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.screenContainer}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.contentContainer}>
            <SafeAreaView />

            <View style={styles.headlineContainer}>
              <Pressable
                style={styles.iconWrapper}
                onPress={() => {
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

              <Pressable
                style={styles.iconWrapper}
                onPress={() => {
                  ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
                  tripId ? navigation.navigate(SCREEN.TRIPDETAILS, { tripId }) : navigation.navigate(SCREEN.TRIPS);
                }}>
                <SVG.Close fill="black" />
              </Pressable>
            </View>

            <Label style={styles.titleText}>{En.companionTitle}</Label>
            <Label style={styles.subtitleText}>{En.companionSubtitle}</Label>

            <View style={styles.optionsContainer}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => handleSelect(option.value)}
                  activeOpacity={0.8}>
                  <Animated.View
                    style={[
                      styles.optionButton,
                      selectedOption === option.value && {
                        backgroundColor: COLOR.lightBlue,
                        transform: [{ scale: animatedValues[option.value].scale }],
                      },
                      {
                        opacity: Animated.add(
                          selectedOption === option.value ? animatedValues[option.value].opacity : 1,
                          selectedOption === option.value ? 0 : 0.2
                        ),
                      },
                    ]}>
                    <Label style={styles.optionText}>{option.label}</Label>
                  </Animated.View>
                </TouchableOpacity>
              ))}
            </View>

            {shouldShowInput && (
              <TextInput
                style={styles.input}
                placeholder="Enter number of persons"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                value={numberOfPersons}
                onChangeText={setNumberOfPersons}
              />
            )}
          </View>
        </ScrollView>

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
            disabled={!selectedOption || (shouldShowInput && !numberOfPersons)}
          />
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

export default CompanionScreen;

const styles = StyleSheet.create({
  headlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(3),
    marginVertical: hp(2),
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
    color: COLOR.gray,
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
    borderColor: COLOR.lightBlue,
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
  saveButton: {
    backgroundColor: 'transparent',
    marginHorizontal: wp(2),
    borderWidth: 1,
    borderColor: COLOR.lightBlue,
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
    backgroundColor: '#002953',
    marginHorizontal: wp(2),
  },
  buttonText: {
    color: 'white',
  },
});