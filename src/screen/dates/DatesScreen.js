import { SafeAreaView, StyleSheet, View, Pressable } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Button, Label } from '../../components';
import { En } from '../../locales/En';
import { COLOR, hp, TEXT_STYLE, wp } from '../../enums/StyleGuide';
import { SCREEN } from '../../enums/AppEnums';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import DateTimePicker from '@react-native-community/datetimepicker';
import ProgressBar from 'react-native-progress/Bar';
import { SVG } from '../../assets/svgs';
import { useTripStore } from '../../store/tripStore'; // Import Zustand store
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import Toast from 'react-native-toast-message';

const hapticOptions = {
  enableVibrateFallback: true,
};

const DatesScreen = ({ navigation }) => {
  const { setTripData } = useTripStore(); // Access Zustand store

  const user = useSelector(({ appReducer }) => appReducer.user);
  const route = useRoute();
  const tripId = route.params?.tripId;
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

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


          const start = new Date(data.startDate.seconds * 1000);
          const end = new Date(data.endDate.seconds * 1000);

          setStartDate(start);
          setEndDate(end);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Trip-Daten:', error);
      }
    };

    loadTripData();
  }, [tripId]);

  const currentStep = 2;
  const totalSteps = 8;
  const progress = currentStep / totalSteps;


  const onChangeStartDate = (event, selectedDate) => {
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onChangeEndDate = (event, selectedDate) => {
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const handleSaveDates = async () => {
    if (!startDate || !endDate) return;

    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(tripId)
        .update({ startDate, endDate });

      setTripData({ startDate, endDate });
      Toast.show({
        visibilityTime: 2000,
        type: 'success',
        text1: 'Dates Updated Successfully',
        position: 'top',
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
    setTripData({ startDate, endDate }); // ✅ gezielte Speicherung
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate(SCREEN.COMPANION, { tripId });
  };

  return (
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
          <Pressable onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
            navigation.goBack();
          }}>
            <SVG.BackIcon fill="black" />
          </Pressable>
          <Label style={styles.titleText}>{En.datesTitle}</Label>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => tripId ? navigation.navigate(SCREEN.TRIPDETAILS, { tripId: tripId }) : navigation.navigate(SCREEN.TRIPS)}>
            <SVG.Close fill="black" />
          </Pressable>
        </View>
        <Label style={styles.subtitleText}>{En.datesSubtitle}</Label>

        <View style={styles.dateContainer}>
          <View>
            <DateTimePicker
              value={startDate}
              mode="date"
              onChange={onChangeStartDate}
              themeVariant="light"
              minimumDate={!tripId ? new Date() : undefined}
            />
          </View>

          <Label style={{ color: "black" }}>to</Label>

          <DateTimePicker
            value={endDate}
            mode="date"
            onChange={onChangeEndDate}
            themeVariant="light"
            minimumDate={startDate ? startDate : !tripId ? new Date() : undefined}
          />
        </View>
      </View>

      <View style={styles.submitContainer}>
        {tripId && (
          <Button
            style={styles.saveButton}
            text={En.save}
            onPress={handleSaveDates}
          />
        )}
        <Button
          style={[
            styles.nextButton,
            { backgroundColor: '#002953' },
          ]}
          text={En.next}
          textStyle={styles.buttonText}
          onPress={handleNext}
        />
      </View>
    </View>
  );
};

export default DatesScreen;

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
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: hp(5),
  },
  titleText: {
    ...TEXT_STYLE.title,
    color: COLOR.black,
    marginVertical: hp(2),
  },
  subtitleText: {
    ...TEXT_STYLE.textMedium,
    color: COLOR.black,
  },
  dateButton: {
    marginVertical: hp(2),
    backgroundColor: '#002953',
    padding: 10,
    borderRadius: 10,
    width: wp(80),
    alignItems: 'center',
  },
  startButton: {
    marginTop: 'auto',
    marginBottom: hp(5),
    backgroundColor: '#002953',
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
    color: COLOR.black,
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
