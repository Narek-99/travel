import React, { useState, useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Pressable,
  Text,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useSelector } from 'react-redux';
import { AppHeader, Label } from '../../components';
import { COLOR, TEXT_STYLE, wp, hp } from '../../enums/StyleGuide';
import { SCREEN } from '../../enums/AppEnums';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { SVG } from '../../assets/svgs';
import firestore from '@react-native-firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { SwipeListView } from 'react-native-swipe-list-view';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

const TripsScreen = ({ navigation }) => {
  const user = useSelector(({ appReducer }) => appReducer.user);
  const [trips, setTrips] = useState([]);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(true); // New loading state
  const hapticOptions = { enableVibrateFallback: true };
  const [tripImages, setTripImages] = useState({});
  const [loadingImages, setLoadingImages] = useState({});
  const [lastFetchedDestinations, setLastFetchedDestinations] = useState({});

  const fetchTripImage = async (destination, tripId) => {
    if (tripImages[tripId] && lastFetchedDestinations[tripId] === destination) return;

    setLoadingImages(prev => ({ ...prev, [tripId]: true }));

    try {
      const response = await fetch(`https://openai-proxy-gilt-three.vercel.app/api/unsplash?destination=${destination}`);
      const data = await response.json();
      const imageUrl = data.results[0]?.urls?.small;

      if (imageUrl) {
        setTripImages(prev => ({ ...prev, [tripId]: imageUrl }));
        setLastFetchedDestinations(prev => ({ ...prev, [tripId]: destination }));
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden des Bildes:', error);
    } finally {
      setLoadingImages(prev => ({ ...prev, [tripId]: false }));
    }
  };

  const fetchTrips = useCallback(async () => {
    try {
      const snapshot = await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .orderBy('createdAt', 'desc')
        .get();

      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(trip => trip.destination);

      setTrips(data);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Trips:', error);
    }
  }, [user.uid]);

  // Fetch subscription status from Firestore
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .onSnapshot(
        doc => {
          const data = doc.data();
          // Assuming subscription is stored in Firestore; update Redux if needed
          setIsSubscriptionLoading(false);
        },
        error => {
          console.error('❌ Error fetching subscription:', error);
          setIsSubscriptionLoading(false);
        }
      );

    return () => unsubscribe();
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      if (user?.uid) fetchTrips();
    }, [user?.uid, fetchTrips])
  );

  useEffect(() => {
    trips.forEach(trip => fetchTripImage(trip.destination, trip.id));
  }, [trips]);

  const ImageSkeleton = () => (
    <SkeletonPlaceholder borderRadius={4}>
      <SkeletonPlaceholder.Item width="100%" height={200} />
    </SkeletonPlaceholder>
  );

  const getCompanionEmoji = (companion) => {
    switch ((companion || '').toLowerCase()) {
      case 'partner':
        return '❤️';
      case 'familie':
      case 'family':
        return '👨‍👩‍👧‍👦';
      case 'freunde':
      case 'friends':
        return '🧑‍🤝‍🧑';
      case 'kollegen':
      case 'colleagues':
        return '💼';
      case 'allein':
      case 'alone':
        return '👤';
      default:
        return '👥';
    }
  };

  const deleteTrip = async (tripId) => {
    Alert.alert("Delete Trip", "Are you sure you want to delete this trip?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await firestore()
              .collection('users')
              .doc(user.uid)
              .collection('trips')
              .doc(tripId)
              .delete();

            setTrips(prev => prev.filter(trip => trip.id !== tripId));
            ReactNativeHapticFeedback.trigger('impactHeavy', hapticOptions);
          } catch (error) {
            console.error('❌ Fehler beim Löschen:', error);
          }
        }
      }
    ]);
  };

  const formatDateRange = (start, end) => {
    const startDate = start?.toDate();
    const endDate = end?.toDate();

    if (!startDate || !endDate) return '';

    const options = { day: '2-digit', month: 'short' };
    const startStr = startDate.toLocaleDateString('en-US', options);
    const endStr = endDate.toLocaleDateString('en-US', options);
    return `${startStr} – ${endStr}`;
  };

  // Handle navigation based on subscription status
  const handleAddTripNavigation = () => {
    if (isSubscriptionLoading) return; // Prevent navigation during loading
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    if (user?.subscription === false) {
      navigation.navigate(SCREEN.SUBSCRIPTION);
    } else {
      navigation.navigate(SCREEN.DESTINATION);
    }
  };

  // Handle premium button press
  const handlePremiumPress = () => {
    if (isSubscriptionLoading) return; // Prevent navigation during loading
    if (!user?.subscription) {
      navigation.navigate(SCREEN.SUBSCRIPTION);
      ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView />
      <AppHeader
        leftComp={
          <Pressable onPress={() => {
            navigation.navigate(SCREEN.SETTINGS);
            ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
          }}>
            <SVG.Settings fill="black" />
          </Pressable>
        }
        centerComp={
          <View style={styles.headerActions}>
            {isSubscriptionLoading ? (
              <SkeletonPlaceholder borderRadius={hp(1)}>
                <SkeletonPlaceholder.Item width={wp(30)} height={hp(4)} />
              </SkeletonPlaceholder>
            ) : (
              <Pressable style={styles.gptPlusButton} onPress={handlePremiumPress}>
                <SVG.Flash fill="#3B82F6" />
                <Label style={{ color: '#3B82F6', fontWeight: 700 }}>
                  {user?.subscription ? "  Premium" : "  Get Premium"}
                </Label>
              </Pressable>
            )}
          </View>
        }
        rightComp={
          <Pressable onPress={handleAddTripNavigation}>
            <SVG.Plus fill="black" />
          </Pressable>
        }
      />

      <Pressable onPress={handleAddTripNavigation} style={styles.contentContainer}>
        {trips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <SVG.Plus fill={'#3B82F6'} width={wp(12)} height={wp(12)} style={styles.plusIcon} />
            <Text style={styles.emptyTitle}>No trips yet!</Text>
            <Text style={styles.emptySubtitle}>Let’s plan your first adventure.</Text>
          </View>
        ) : (
          <SwipeListView
            data={trips}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={1}
                style={styles.card}
                onPress={() => {
                  ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
                  navigation.navigate(SCREEN.TRIPDETAILS, { tripId: item.id })
                }
                }
              >
                <View style={styles.cardImageContainer}>
                  {loadingImages[item.id] || !tripImages[item.id] ? (
                    <ImageSkeleton />
                  ) : (
                    <FastImage
                      source={{ uri: tripImages[item.id], priority: FastImage.priority.high }}
                      style={styles.cardImage}
                    />
                  )}

                  <LinearGradient
                    colors={['rgba(0, 0, 0, 0.9)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.overlay}
                  >
                    <View style={styles.companionRow}>
                      <Text style={styles.destinationText}>{item.destination}</Text>
                      <Text style={styles.dateText}>{formatDateRange(item.startDate, item.endDate)}</Text>
                      <View style={styles.infoRow}>
                        <Label style={styles.dateText}>{getCompanionEmoji(item.companion)}</Label>
                        <Label style={styles.dateText}>
                          {item.companion} · {item.numberOfPersons || '1'} person
                        </Label>
                      </View>
                    </View>
                  </LinearGradient>

                  <TouchableOpacity
                    style={styles.detailButton}
                    onPress={() => {
                      ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                      navigation.navigate(SCREEN.TRIPDETAILS, { tripId: item.id });
                    }}
                  >
                    <Text style={styles.detailButtonText}>Details →</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
            renderHiddenItem={({ item }) => (
              <View style={styles.hiddenRow}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteTrip(item.id)}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
            rightOpenValue={-100}
            previewRowKey={'0'}
            previewOpenDelay={3000}
          />
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR.white, paddingBottom: 10 },
  gptPlusButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: wp(6),
    paddingVertical: hp(1),
    borderRadius: hp(1),
    flexDirection: 'row',
    gap: wp(1),
    alignItems: 'center',
  },
  headerActions: { flexDirection: 'col', alignItems: 'center', gap: wp(3) },
  contentContainer: { flex: 1, padding: 20 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusIcon: {
    marginBottom: hp(2),
  },
  emptyTitle: {
    color: COLOR.black,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: hp(1),
  },
  emptySubtitle: {
    color: '#3B82F6',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  tripCard: {
    backgroundColor: COLOR.darkGrey,
    padding: 15,
    borderRadius: 10,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: COLOR.lightBlue,
  },
  tripTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tripDate: {
    color: COLOR.lightGray,
    fontSize: 14,
    marginTop: 5,
  },
  deleteButton: {
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 10,
  },
  deleteText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoDestination: {
    ...TEXT_STYLE.title,
    color: COLOR.dark,
    marginBottom: 4,
  },
  infoDate: {
    ...TEXT_STYLE.textSmall,
    color: COLOR.mediumGray,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  hiddenRow: {
    flex: 1,
    alignItems: 'flex-end',
    marginHorizontal: wp(2),
  },
  deleteButton: {
    width: 80,
    height: '90%',
    backgroundColor: 'red',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripImage: {
    width: 120,
    height: "100%",
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  imageLoader: {
    width: 100,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
  },
  cardImageContainer: {
    height: 200,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    justifyContent: "flex-start",
    top: 0,
    left: 0,
    bottom: 0,
  },
  dateText: {
    fontSize: 16,
    color: 'white',
    fontWeight: "500"
  },
  destinationText: {
    fontSize: 28,
    fontWeight: "bold",
    color: 'white',
    marginBottom: hp(0.5)
  },
  companionRow: {
    flexDirection: 'column',
    padding: wp(4)
  },
  detailButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  detailButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default TripsScreen;