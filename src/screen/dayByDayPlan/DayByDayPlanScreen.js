import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, View, Pressable, Text, ScrollView, Linking } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { AppHeader } from '../../components';
import { COLOR, TEXT_STYLE, hp, wp } from '../../enums/StyleGuide';
import { SVG } from '../../assets/svgs';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import MapView, { Marker, Polyline, Callout } from 'react-native-maps';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

const DayByDayPlanScreen = ({ navigation }) => {
  const route = useRoute();
  const { itinerary } = route.params;
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setError('Loading timed out. Please try again.');
        setLoading(false);
      }
    }, 10000);

    if (!itinerary || !Array.isArray(itinerary) || itinerary.length === 0) {
      setError('No itinerary data available.');
      setLoading(false);
      clearTimeout(timeout);
      return;
    }

    try {
      const invalidItems = itinerary.filter(
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

      const latitudes = itinerary.map(item => item.attraction.lat);
      const longitudes = itinerary.map(item => item.attraction.lng);

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
  }, [itinerary]);

  const getRouteCoordinates = () => {
    if (!region || !itinerary || itinerary.length === 0) return [];

    const coordinates = [];
    itinerary.forEach((item, index) => {
      if (index === 0) {
        coordinates.push({ latitude: region.latitude, longitude: region.longitude });
      }
      coordinates.push({ latitude: item.attraction.lat, longitude: item.attraction.lng });
    });
    if (itinerary.length > 0) {
      coordinates.push({ latitude: region.latitude, longitude: region.longitude });
    }
    return coordinates;
  };

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

      <ScrollView contentContainerStyle={{ paddingBottom: hp(5), paddingTop: hp(2) }} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Day 1: Optimized Route</Text>

        {loading ? (
          <SkeletonPlaceholder borderRadius={10}>
            <View style={{ height: 250, marginBottom: hp(2), marginHorizontal: wp(5) }} />
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
        ) : region && itinerary.length > 0 ? (
          <>
            <View style={{ height: 250, marginBottom: hp(2), marginHorizontal: wp(5) }}>
              <MapView
                style={StyleSheet.absoluteFillObject}
                provider="google"
                region={region}
                showsUserLocation
                showsMyLocationButton
                rotateEnabled>
                {itinerary.map((item, index) => (
                  <Marker
                    key={index}
                    coordinate={{ latitude: item.attraction.lat, longitude: item.attraction.lng }}
                    title={item.attraction.name}>
                    <Callout>
                      <View style={{ width: 200, alignItems: 'center', padding: 5 }}>
                        <Text style={{ fontWeight: 'bold' }}>{item.attraction.name}</Text>
                        <Text>⭐ {item.attraction.rating} ({item.attraction.reviews} reviews)</Text>
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
            </View>

            {itinerary.map((item, index) => (
              <View key={index} style={styles.card}>
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
                  <Text
                    style={styles.directionsText}
                    onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${item.attraction.lat},${item.attraction.lng}`)}>
                    Directions
                  </Text>
                </View>
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.emptyText}>No itinerary available.</Text>
        )}
      </ScrollView>
    </View>
  );
};

export default DayByDayPlanScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.white,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: 'rgba(30, 58, 138, 1)',
    paddingHorizontal: wp(5),
    marginBottom: hp(1.5),
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLOR.white,
    borderRadius: 10,
    padding: wp(4),
    marginHorizontal: wp(5),
    marginBottom: hp(1.5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  order: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLOR.dark,
    marginRight: wp(3),
  },
  details: {
    flex: 1,
  },
  placeText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.dark,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    color: COLOR.mediumGray,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    color: COLOR.mediumGray,
    marginBottom: 4,
  },
  travelText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  directionsText: {
    fontSize: 14,
    color: '#1E90FF',
    textDecorationLine: 'underline',
  },
  emptyText: {
    fontSize: 16,
    padding: wp(5),
    fontStyle: 'italic',
    textAlign: 'center',
    color: COLOR.mediumGray,
  },
  errorText: {
    fontSize: 16,
    padding: wp(5),
    textAlign: 'center',
    color: 'red',
  },
});