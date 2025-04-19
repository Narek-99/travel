import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, SafeAreaView, View, Pressable, Text, ScrollView, Linking, Dimensions, Animated } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { AppHeader } from '../../components';
import { COLOR, TEXT_STYLE, hp, wp } from '../../enums/StyleGuide';
import { SVG } from '../../assets/svgs';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import MapView, { Marker, Polyline, Callout } from 'react-native-maps';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const DayByDayPlanScreen = ({ navigation }) => {
  const route = useRoute();
  const { itinerary, trip } = route.params;
  const [dailyItineraries, setDailyItineraries] = useState([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fadeIn = () => {
      Animated.timing(mapFadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    };
    if (!loading) fadeIn();
  }, [loading]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setError('Loading timed out. Please try again.');
        setLoading(false);
      }
    }, 10000);

    if (!itinerary || !Array.isArray(itinerary) || itinerary.length === 0 || !trip) {
      setError('No itinerary data available.');
      setLoading(false);
      clearTimeout(timeout);
      return;
    }

    try {
      const days = calculateDays(trip.startDate, trip.endDate);
      const itinerariesByDay = splitItineraryByDay(itinerary, days.length);
      setDailyItineraries(itinerariesByDay);

      const selectedItinerary = itinerariesByDay[selectedDayIndex] || [];
      if (selectedItinerary.length === 0) {
        setError('No itinerary available for the selected day.');
        setLoading(false);
        clearTimeout(timeout);
        return;
      }

      const invalidItems = selectedItinerary.filter(
        item =>
          !item.attraction ||
          typeof item.attraction.lat !== 'number' ||
          typeof item.attraction.lng !== 'number' ||
          isNaN(item.attraction.lat) ||
          isNaN(item.attraction.lng)
      );

      if (invalidItems.length > 0) {
        throw new Error('Invalid coordinates in itinerary.');
      }

      const latitudes = selectedItinerary.map(item => item.attraction.lat);
      const longitudes = selectedItinerary.map(item => item.attraction.lng);

      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);

      const newRegion = {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.05),
        longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.05),
      };

      setRegion(newRegion);
      setLoading(false);
    } catch (err) {
      setError('Failed to load itinerary map: ' + err.message);
      setLoading(false);
    } finally {
      clearTimeout(timeout);
    }
  }, [itinerary, selectedDayIndex, trip]);

  const calculateDays = (startDate, endDate) => {
    const start = startDate.toDate();
    const end = endDate.toDate();
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const maxDays = Math.min(diffDays, 7);

    const days = [];
    for (let i = 0; i < maxDays; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const splitItineraryByDay = (itinerary, numDays) => {
    const itineraries = Array(numDays).fill().map(() => []);
    itinerary.forEach((item, index) => {
      const dayIndex = Math.min(Math.floor(index / (itinerary.length / numDays)), numDays - 1);
      itineraries[dayIndex].push({ ...item, order: itineraries[dayIndex].length + 1 });
    });
    return itineraries;
  };

  const getRouteCoordinates = () => {
    if (!region || !dailyItineraries[selectedDayIndex] || dailyItineraries[selectedDayIndex].length === 0) return [];

    const coordinates = [];
    dailyItineraries[selectedDayIndex].forEach((item, index) => {
      if (index === 0) {
        coordinates.push({ latitude: region.latitude, longitude: region.longitude });
      }
      coordinates.push({ latitude: item.attraction.lat, longitude: item.attraction.lng });
    });
    if (dailyItineraries[selectedDayIndex].length > 0) {
      coordinates.push({ latitude: region.latitude, longitude: region.longitude });
    }
    return coordinates;
  };

  const formatDayLabel = date => {
    const options = { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options).replace(/,/, '');
  };

  const days = trip ? calculateDays(trip.startDate, trip.endDate) : [];

  return (
    <View style={styles.container}>
      <SafeAreaView />
      <AppHeader
        leftComp={
          <Pressable
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
              navigation.goBack();
            }}>
            <SVG.BackIcon fill={COLOR.dark} />
          </Pressable>
        }
        title="Day-by-Day Plan"
        titleStyle={{ ...TEXT_STYLE.smallTitleBold, color: COLOR.dark }}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {loading ? (
          <SkeletonPlaceholder borderRadius={10}>
            <View style={styles.mapSkeleton} />
            {[...Array(3)].map((_, i) => (
              <View key={i} style={styles.card}>
                <View style={{ height: 20, width: '60%', marginBottom: 6 }} />
                <View style={{ height: 14, width: '80%', marginBottom: 4 }} />
                <View style={{ height: 14, width: '50%' }} />
              </View>
            ))}
          </SkeletonPlaceholder>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : region && dailyItineraries[selectedDayIndex]?.length > 0 ? (
          <>
            <Animated.View style={[styles.mapContainer, { opacity: mapFadeAnim }]}>
              <MapView
                style={styles.map}
                provider="google"
                region={region}
                showsUserLocation
                showsMyLocationButton
                rotateEnabled>
                {dailyItineraries[selectedDayIndex].map((item, index) => (
                  <Marker
                    key={index}
                    coordinate={{ latitude: item.attraction.lat, longitude: item.attraction.lng }}
                    title={item.attraction.name}>
                    <Callout>
                      <View style={styles.calloutContainer}>
                        <Text style={styles.calloutTitle}>{item.attraction.name}</Text>
                        <Text style={styles.calloutText}>
                          ⭐ {item.attraction.rating} ({item.attraction.reviews} reviews)
                        </Text>
                      </View>
                    </Callout>
                  </Marker>
                ))}
                <Polyline
                  coordinates={getRouteCoordinates()}
                  strokeColor="#1E90FF"
                  strokeWidth={3}
                  lineDashPattern={[10, 10]}
                />
              </MapView>
            </Animated.View>
            {days.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.daySelectorContainer}>
                {days.map((day, index) => (
                  <Pressable
                    key={index}
                    onPress={() => setSelectedDayIndex(index)}
                    style={[
                      styles.dayTab,
                      selectedDayIndex === index && styles.dayTabSelected,
                    ]}>
                    <Text
                      style={[
                        styles.dayTabText,
                        selectedDayIndex === index && styles.dayTabTextSelected,
                      ]}>
                      {formatDayLabel(day)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {dailyItineraries[selectedDayIndex].map((item, index) => (
              <LinearGradient
                key={index}
                colors={['#FFFFFF', '#F1F5F9']}
                style={styles.card}>
                <Text style={styles.order}>#{item.order}</Text>
                <View style={styles.details}>
                  <Text style={styles.placeText}>{item.attraction.name}</Text>
                  <Text style={styles.timeText}>
                    {item.startTime} - {item.endTime}
                  </Text>
                  <Text style={styles.ratingText}>
                    ⭐ {item.attraction.rating} ({item.attraction.reviews} reviews)
                  </Text>
                  <Text style={styles.travelText}>
                    🧭 {item.travelDistance} · ⏱ {item.travelDuration}
                  </Text>
                  <Pressable
                    onPress={() =>
                      Linking.openURL(
                        `https://www.google.com/maps/dir/?api=1&destination=${item.attraction.lat},${item.attraction.lng}`
                      )
                    }
                    style={styles.directionsButton}>
                    <Text style={styles.directionsText}>Directions</Text>
                  </Pressable>
                </View>
              </LinearGradient>
            ))}
          </>
        ) : (
          <Text style={styles.emptyText}>No itinerary available for this day.</Text>
        )}
      </ScrollView>
    </View>
  );
};

export default DayByDayPlanScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  headerGradient: {
    paddingTop: hp(5),
    paddingBottom: hp(2),
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(5),
  },
  backButton: {
    padding: wp(2),
  },
  headerTitle: {
    ...TEXT_STYLE.smallTitleBold,
    color: COLOR.white,
    fontSize: 20,
    flex: 1,
    textAlign: 'center',
  },
  scrollContainer: {
    paddingBottom: hp(5),
  },
  daySelectorContainer: {
    paddingHorizontal: wp(5),
    paddingVertical: hp(1),
  },
  dayTab: {
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
    paddingVertical: hp(1),
    paddingHorizontal: wp(4),
    marginRight: wp(2),
  },
  dayTabSelected: {
    backgroundColor: '#4B5EAA',
  },
  dayTabText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  },
  dayTabTextSelected: {
    color: COLOR.white,
  },
  mapContainer: {
    height: hp(40),
    width: '100%',
    marginBottom: hp(2),
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapSkeleton: {
    height: hp(40),
    width: '100%',
    marginBottom: hp(2),
  },
  card: {
    flexDirection: 'row',
    borderRadius: 15,
    padding: wp(4),
    marginHorizontal: wp(5),
    marginBottom: hp(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  order: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4B5EAA',
    marginRight: wp(3),
  },
  details: {
    flex: 1,
  },
  placeText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.dark,
    marginBottom: 6,
  },
  timeText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '500',
  },
  ratingText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '500',
  },
  travelText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
    fontWeight: '500',
  },
  directionsButton: {
    backgroundColor: '#1E90FF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  directionsText: {
    fontSize: 14,
    color: COLOR.white,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    padding: wp(5),
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    padding: wp(5),
    textAlign: 'center',
    color: '#EF4444',
  },
  calloutContainer: {
    width: 200,
    alignItems: 'center',
    padding: 8,
    backgroundColor: COLOR.white,
    borderRadius: 8,
  },
  calloutTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: COLOR.dark,
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 12,
    color: '#6B7280',
  },
});