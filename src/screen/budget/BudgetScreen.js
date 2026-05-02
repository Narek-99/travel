import { SafeAreaView, StyleSheet, View, TextInput, TouchableOpacity, Text, Keyboard, Pressable, TouchableWithoutFeedback, Animated, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
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

const budgetOptions = [
  { label: '💰 Low', value: 'low' },
  { label: '💵 Medium', value: 'medium' },
  { label: '💎 High', value: 'high' },
  { label: '🔢 Enter specific amount', value: 'custom' },
];

const currentStep = 4;
const totalSteps = 7;
const progress = currentStep / totalSteps;

const BudgetScreen = ({ navigation }) => {
  const { setTripData } = useTripStore();
  const user = useSelector(({ appReducer }) => appReducer.user);
  const route = useRoute();
  const tripId = route.params?.tripId;

  const [selectedBudget, setSelectedBudget] = useState('');
  const [customAmount, setCustomAmount] = useState('');

  // Animation state for each option
  const animatedValues = useRef(
    budgetOptions.reduce((acc, option) => {
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

    setSelectedBudget(value);
    if (value !== 'custom') setCustomAmount('');
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
          setCustomAmount(data.customAmount || '');
          setSelectedBudget(data.budget || '');
          // Trigger animation for pre-selected option
          if (data.budget) {
            handleSelect(data.budget);
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden der Trip-Daten:', error);
      }
    };

    loadTripData();
  }, [tripId]);

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
          customAmount: selectedBudget === 'custom' ? customAmount : null,
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.screenContainer}
        keyboardVerticalOffset={0}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.contentContainer}>
            <SafeAreaView />
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

            <Label style={styles.titleText}>{En.budgetTitle}</Label>
            <Label style={styles.subtitleText}>{En.budgetSubtitle}</Label>

            <View style={styles.optionsContainer}>
              {budgetOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => handleSelect(option.value)}
                  activeOpacity={0.8}
                >
                  <Animated.View
                    style={[
                      styles.optionButton,
                      selectedBudget === option.value && {
                        backgroundColor: COLOR.lightBlue,
                        transform: [{ scale: animatedValues[option.value].scale }],
                      },
                      {
                        opacity: Animated.add(
                          selectedBudget === option.value
                            ? animatedValues[option.value].opacity
                            : 1,
                          selectedBudget === option.value ? 0 : 0.2
                        ),
                      },
                    ]}
                  >
                    <Text style={styles.optionText}>{option.label}</Text>
                  </Animated.View>
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
                onChangeText={(text) => setCustomAmount(text.replace(/[^0-9]/g, ''))}
              />
            )}
          </View>
        </ScrollView>

        <View style={styles.submitContainer}>
          {tripId && (
            <Button
              style={styles.saveButton}
              textStyle={[{ color: COLOR.white }]}
              text={En.save}
              onPress={handleSaveBudget}
            />
          )}
          <Button
            style={styles.nextButton}
            text={En.next}
            textStyle={styles.buttonText}
            onPress={handleNext}
            disabled={!selectedBudget || (selectedBudget === 'custom' && !customAmount)}
          />
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

export default BudgetScreen;

const styles = StyleSheet.create({
  headlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: wp(3),
    marginVertical: hp(2),
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
  screenContainer: {
    flex: 1,
    backgroundColor: COLOR.primary,
  },
  contentContainer: {
    paddingTop: '8%',
    paddingHorizontal: '5%',
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
  input: {
    backgroundColor: COLOR.white,
    color: COLOR.primary,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    fontSize: 16,
  },
  buttonText: {
    color: COLOR.primary,
    fontWeight: '800',
  },
  saveButton: {
    backgroundColor: 'transparent',
    marginHorizontal: wp(2),
    borderWidth: 1,
    borderColor: COLOR.lightBlue,
  },
  stepText: {
    ...TEXT_STYLE.textSmall,
    color: COLOR.white,
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
    backgroundColor: COLOR.accent,
    marginHorizontal: wp(2),
  },
});
