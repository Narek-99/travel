import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Pressable, Text, ScrollView, Linking, Animated, Image, Dimensions } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { COLOR, hp, wp } from '../../enums/StyleGuide';
import { SVG } from '../../assets/svgs';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import MapView, { Marker, Polyline, Callout } from 'react-native-maps';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

const { height } = Dimensions.get('window');

const DayByDayPlanScreen = ({ navigation }) => {
  const route = useRoute();
  const { itinerary: groupedItinerary, trip } = route.params;
  const [dailyItineraries, setDailyItineraries] = useState([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapFadeAnim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef(null);

  useEffect(() => {
    if (!groupedItinerary || !Array.isArray(groupedItinerary)) {
      setError('No itinerary data available.');
      setLoading(false);
      return;
    }
    setDailyItineraries(groupedItinerary);
  }, [groupedItinerary]);

  useEffect(() => {
    if (!dailyItineraries.length || !dailyItineraries[selectedDayIndex]) {
      setError('No itinerary data for this day.');
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);

    const timeout = setTimeout(() => {
      setError('Loading timed out. Please try again.');
      setLoading(false);
    }, 10000);

    const selectedItems = dailyItineraries[selectedDayIndex].items || [];

    if (selectedItems.length === 0) {
      setError('No itinerary available for this day.');
      setLoading(false);
      clearTimeout(timeout);
      return;
    }

    try {
      const latitudes = selectedItems.map(item => item.attraction.lat);
      const longitudes = selectedItems.map(item => item.attraction.lng);
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
      clearTimeout(timeout);
    } catch (err) {
      setError('Failed to calculate map region.');
      setLoading(false);
      clearTimeout(timeout);
    }
  }, [dailyItineraries, selectedDayIndex]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(mapFadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const getRouteCoordinates = () => {
    const items = dailyItineraries[selectedDayIndex]?.items || [];
    if (!region || items.length === 0) return [];

    const coordinates = items.map(item => ({
      latitude: item.attraction.lat,
      longitude: item.attraction.lng,
    }));

    return coordinates.length > 1
      ? [{ latitude: region.latitude, longitude: region.longitude }, ...coordinates, { latitude: region.latitude, longitude: region.longitude }]
      : coordinates;
  };

  const formatDayLabel = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <SkeletonPlaceholder borderRadius={0}>
          <View style={styles.mapSkeleton} />
          <View style={styles.daySelectorContainer}>
            {[...Array(3)].map((_, i) => (
              <View key={i} style={styles.dayTabSkeleton} />
            ))}
          </View>
          <View style={styles.attractionsContainer}>
            {[...Array(3)].map((_, i) => (
              <View key={i} style={styles.cardSkeleton}>
                <View style={styles.imageSkeleton} />
                <View style={{ height: 20, width: '60%', marginTop: 10 }} />
                <View style={{ height: 14, width: '80%', marginTop: 4 }} />
              </View>
            ))}
          </View>
        </SkeletonPlaceholder>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : region && dailyItineraries[selectedDayIndex]?.items?.length > 0 ? (
        <>
          <Animated.View style={[styles.mapContainer, { opacity: mapFadeAnim }]}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider="google"
              region={region}
              showsUserLocation
              showsMyLocationButton
              rotateEnabled>
              <Marker
                coordinate={{ latitude: region.latitude, longitude: region.longitude }}
                title="Starting Point"
                pinColor="blue"
              />
              {dailyItineraries[selectedDayIndex].items.map((item, index) => (
                <Marker
                  key={index}
                  coordinate={{ latitude: item.attraction.lat, longitude: item.attraction.lng }}
                  title={item.attraction.name}
                  pinColor={index + 1 === 1 ? 'teal' : 'red'}>
                  <Callout tooltip>
                    <View style={styles.calloutContainer}>
                      {item.attraction.photo ? (
                        <Image
                          source={{ uri: item.attraction.photo }}
                          style={styles.calloutImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text>No Image</Text>
                      )}
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
            <Pressable
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
                navigation.goBack();
              }}
              style={styles.backButton}>
              <SVG.BackIcon fill={COLOR.white} />
            </Pressable>
          </Animated.View>

          <View style={styles.bottomContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelectorContainer}>
              {dailyItineraries.map((day, index) => (
                <Pressable
                  key={index}
                  onPress={() => {
                    setSelectedDayIndex(index);
                    setError(null);
                  }}
                  style={[styles.dayTab, selectedDayIndex === index && styles.dayTabSelected]}>
                  <Text style={[styles.dayTabText, selectedDayIndex === index && styles.dayTabTextSelected]}>
                    {formatDayLabel(day.date)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attractionsContainer}>
              {dailyItineraries[selectedDayIndex].items.map((item, index) => (
                <React.Fragment key={index}>
                  <Pressable
                    style={styles.card}
                    onPress={() => {
                      mapRef.current?.animateToRegion(
                        {
                          latitude: item.attraction.lat,
                          longitude: item.attraction.lng,
                          latitudeDelta: 0.01,
                          longitudeDelta: 0.01,
                        },
                        800
                      );
                    }}>
                    <View style={styles.orderContainer}>
                      <Text style={styles.order}>#{item.order}</Text>
                    </View>
                    <View style={styles.imageContainer}>
                      <Image
                        source={{ uri: item.attraction.photo || 'https://via.placeholder.com/80' }}
                        style={styles.attractionImage}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={styles.details}>
                      <Text style={styles.placeText}>{item.attraction.name}</Text>
                      <View style={styles.reviewContainer}>
                        <SVG.Star width={14} height={14} fill="#FBA047" />
                        <Text style={styles.ratingText}>{item.attraction.rating} ({item.attraction.reviews} Reviews)</Text>
                      </View>
                      <View style={styles.timeContainer}>
                        <SVG.Clock width={14} height={14} fill="#1E90FF" />
                        <Text style={styles.timeText}>{item.startTime} - {item.endTime}</Text>
                      </View>
                      <Pressable
                        onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${item.attraction.lat},${item.attraction.lng}`)}
                        style={styles.directionsButton}>
                        <Text style={styles.directionsText}>Directions</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                  {index < dailyItineraries[selectedDayIndex].items.length - 1 && (
                    <View style={styles.travelInfoContainer}>
                      <View style={styles.travelContainer}>
                        <SVG.Car width={14} height={14} fill="#4B5563" />
                        <Text style={styles.travelText}>{item.travelDistance}</Text>
                      </View>
                      <View style={styles.travelContainer}>
                        <SVG.Clock width={14} height={14} fill="#4B5563" />
                        <Text style={styles.travelText}>{item.travelDuration}</Text>
                      </View>
                    </View>
                  )}
                </React.Fragment>
              ))}
            </ScrollView>
          </View>
        </>
      ) : (
        <Text style={styles.emptyText}>No itinerary available for this day.</Text>
      )}
    </View>
  );
};

export default DayByDayPlanScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  mapContainer: {
    flex: 1,
    width: '100%',
    height: height,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapSkeleton: {
    width: '100%',
    height: height,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: "50%",
    padding: 5,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
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
  dayTabSkeleton: {
    width: 120,
    height: 40,
    borderRadius: 20,
    marginRight: wp(2),
  },
  attractionsContainer: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(3),
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    width: 200,
    backgroundColor: COLOR.white,
    borderRadius: 14,
    marginRight: wp(1),
    padding: wp(3),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  cardSkeleton: {
    width: 260,
    height: 220,
    borderRadius: 14,
    marginRight: wp(1),
  },
  orderContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: "50%",
    padding: wp(2),
    zIndex: 1,
  },
  order: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLOR.white,
  },
  dayText: {
    fontSize: 12,
    color: COLOR.white,
  },
  imageContainer: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    overflow: 'hidden',
  },
  attractionImage: {
    width: '100%',
    height: '100%',
  },
  imageSkeleton: {
    width: '100%',
    height: 120,
    borderRadius: 10,
  },
  details: {
    paddingTop: hp(0.5),
    paddingBottom: hp(0.5),
    flexDirection: "column",
    gap: hp(0.3),
    flex: 1,
  },
  placeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLOR.dark,
    marginBottom: hp(0.5),
  },
  ratingText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  timeContainer: {
    flexDirection: 'row',
    gap: wp(1),
  },
  reviewContainer: {
    flexDirection: 'row',
    gap: wp(1),
  },
  travelContainer: {
    flexDirection: 'row',
    gap: wp(1),
    alignItems: 'center',
  },
  travelInfoContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(1),
    backgroundColor: 'white',
    borderRadius: 20,
    padding: wp(2)
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  travelText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  directionsButton: {
    backgroundColor: '#1E90FF',
    borderRadius: 6,
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2),
    alignSelf: 'flex-start',
    marginTop: hp(0.5),
  },
  directionsText: {
    fontSize: 12,
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
    paddingBottom: 10,
    backgroundColor: COLOR.white,
    borderRadius: 8,
  },
  calloutImage: {
    width: 200,
    height: 100,
    borderRadius: 8,
  },
  calloutTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: COLOR.dark,
    marginTop: 8,
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 12,
    color: '#6B7280',
  },
});