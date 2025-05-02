import { SafeAreaView, StyleSheet, View, Pressable } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Button, Label } from '../../components';
import { En } from '../../locales/En';
import { COLOR, hp, TEXT_STYLE, wp } from '../../enums/StyleGuide';
import { SCREEN } from '../../enums/AppEnums';
import DateTimePicker from '@react-native-community/datetimepicker';
import ProgressBar from 'react-native-progress/Bar';
import { SVG } from '../../assets/svgs';
import { useTripStore } from '../../store/tripStore';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import Toast from 'react-native-toast-message';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const hapticOptions = {
  enableVibrateFallback: true,
};

const DatesScreen = ({ navigation }) => {
  const { setTripData, tripData } = useTripStore();
  const user = useSelector(({ appReducer }) => appReducer.user);
  const route = useRoute();
  const tripId = route.params?.tripId;
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

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
          const parseDate = (value) => {
            if (value instanceof Date) return value;
            if (value?.toDate) return value.toDate();
            if (typeof value === 'string') return new Date(value);
            if (typeof value === 'object' && value.seconds) return new Date(value.seconds * 1000);
            return null;
          };

          const start = parseDate(data.startDate);
          const end = parseDate(data.endDate);

          if (start) setStartDate(start);
          if (end) setEndDate(end);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Trip-Daten:', error);
      }
    };

    loadTripData();
  }, [tripId]);

  const currentStep = 2;
  const totalSteps = 7;
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
    if (!startDate || !endDate) {
      Toast.show({
        type: 'error',
        text1: 'Missing Dates',
        text2: 'Please select both start and end dates.',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    try {
      const tripRef = firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(tripId);
      const tripDoc = await tripRef.get();

      await tripRef.update({
        startDate: firestore.Timestamp.fromDate(startDate),
        endDate: firestore.Timestamp.fromDate(endDate),
        itinerary: [],
        itineraryFetchedAt: null,
        attractions: [],
        attractionsFetchedAt: null,
        needsRegeneration: true, // Trigger regeneration
      });

      setTripData({
        ...tripData,
        startDate: firestore.Timestamp.fromDate(startDate),
        endDate: firestore.Timestamp.fromDate(endDate),
      });

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
    if (!startDate || !endDate) {
      Toast.show({
        type: 'error',
        text1: 'Missing Dates',
        text2: 'Please select both start and end dates.',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }
    setTripData({ startDate: firestore.Timestamp.fromDate(new Date(startDate)), endDate: firestore.Timestamp.fromDate(new Date(endDate)) });
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    navigation.navigate(SCREEN.COMPANION, { tripId });
  };

  return (
    <View style={styles.screenContainer}>
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
              tripId ? navigation.navigate(SCREEN.TRIPDETAILS, { tripId }) : navigation.navigate(SCREEN.TRIPS)
            }} >
            <SVG.Close fill="black" />
          </Pressable>
        </View>

        <Label style={styles.titleText}>{En.datesTitle}</Label>
        <Label style={styles.subtitleText}>{En.datesSubtitle}</Label>

        <View style={styles.dateContainer}>
          <View>
            <DateTimePicker
              value={startDate || new Date()} // Temporary display fallback for picker
              mode="date"
              onChange={onChangeStartDate}
              themeVariant="light"
              minimumDate={new Date()}
            />
          </View>

          <Label style={{ color: "black" }}>to</Label>

          <DateTimePicker
            value={endDate || new Date()} // Temporary display fallback for picker
            mode="date"
            onChange={onChangeEndDate}
            themeVariant="light"
            minimumDate={startDate || new Date()}
          />
        </View>
      </View>

      <View style={styles.submitContainer}>
        {tripId && (
          <Button
            style={styles.saveButton}
            text={En.save}
            onPress={handleSaveDates}
            disabled={!startDate || !endDate}
          />
        )}
        <Button
          style={[
            styles.nextButton,
            { backgroundColor: startDate && endDate ? COLOR.primary : '#CCCCCC' },
          ]}
          text={En.next}
          textStyle={styles.buttonText}
          onPress={handleNext}
          disabled={!startDate || !endDate}
        />
      </View>
    </View>
  );
};

export default DatesScreen;

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
    color: COLOR.gray,
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