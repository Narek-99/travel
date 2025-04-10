import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, SafeAreaView, Pressable, StyleSheet, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import { SVG } from '../../assets/svgs';
import { COLOR, hp, wp } from '../../enums/StyleGuide';
import Toast from 'react-native-toast-message';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Modal from 'react-native-modal';
import { searchHotels } from '../../services/searchHotels';
import { getCityDetailsFromDestination } from '../../utils/airports';
import { createBookingComLink } from '../../utils/bookingLinks';

const HotelBookingScreen = ({ navigation }) => {
  const user = useSelector(({ appReducer }) => appReducer.user);
  const route = useRoute();
  const tripId = route.params?.tripId;
  const [trip, setTrip] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);

  useEffect(() => {
    if (tripId && user?.uid) {
      firestore()
        .collection('users')
        .doc(user.uid)
        .collection('trips')
        .doc(tripId)
        .get()
        .then(snapshot => {
          const data = snapshot.data();
          if (data) {
            setTrip(data);
          }
        })
        .catch(error => {
          console.error('❌ Error loading trip:', error);
          Toast.show({ type: 'error', text1: 'Failed to load trip details' });
        });
    }
  }, [tripId, user?.uid]);

  useEffect(() => {
    if (trip) {
      console.log('🗺️ Trip Destination:', trip.destination);
      fetchHotels();
    }
  }, [trip]);

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return '';
    const date = new Date(timestamp.seconds * 1000);
    return date.toISOString().split('T')[0];
  };

  const calculateNights = (checkIn, checkOut) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const timeDiff = end - start;
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  };

  const fetchHotels = async () => {
    if (!trip?.destination || !trip?.startDate || !trip?.endDate) {
      Toast.show({ type: 'error', text1: 'Trip details are incomplete' });
      return;
    }

    const cityDetails = getCityDetailsFromDestination(trip.destination);
    if (!cityDetails) {
      Toast.show({ type: 'error', text1: `Destination "${trip.destination}" not supported yet` });
      return;
    }

    const checkIn = formatDate(trip.startDate);
    const checkOut = formatDate(trip.endDate);
    setCheckInDate(checkIn);
    setCheckOutDate(checkOut);

    // Validate dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDateObj = new Date(checkIn);
    const checkOutDateObj = new Date(checkOut);

    console.log('📅 Dates:', { checkInDate: checkIn, checkOutDate: checkOut, today: today.toISOString().split('T')[0] });

    if (checkInDateObj < today) {
      Toast.show({ type: 'error', text1: 'Check-in date must be in the future' });
      return;
    }

    if (checkOutDateObj <= checkInDateObj) {
      Toast.show({ type: 'error', text1: 'Check-out date must be after check-in date' });
      return;
    }

    setLoading(true);
    try {
      // Override coordinates for Berlin to be more central
      const adjustedCityDetails = { ...cityDetails };
      if (trip.destination.toLowerCase() === 'berlin') {
        adjustedCityDetails.latitude = 52.5200; // Central Berlin (near Brandenburg Gate)
        adjustedCityDetails.longitude = 13.4050;
      }

      const hotelSearchParams = {
        latitude: adjustedCityDetails.latitude,
        longitude: adjustedCityDetails.longitude,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults: 2, // Reduced to 2 adults for testing
        roomQuantity: 1, // Reduced to 1 room for testing
      };
      console.log('🔍 Hotel Search Parameters:', hotelSearchParams);

      const hotelsResult = await searchHotels(hotelSearchParams);

      let filteredHotels = hotelsResult || [];

      // Log the raw hotels result before filtering
      console.log('🏨 Raw Hotels Result:', filteredHotels);

      // If no hotels are found, fall back to Booking.com
      if (filteredHotels.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'No hotels found in this area',
          text2: 'Redirecting to Booking.com...',
        });
        const url = createBookingComLink(trip.destination, checkIn, checkOut);
        await Linking.openURL(url).catch(err => {
          console.error('❌ Failed to open URL:', err);
          Toast.show({ type: 'error', text1: 'Failed to open booking link' });
        });
        // Keep loading true during redirect to avoid UI flicker
        return;
      }

      // Filter by user's accommodation preferences
      let appliedPreferences = false;
      if (trip.accommodation?.length) {
        console.log('🛠️ Filtering with preferences:', trip.accommodation);
        appliedPreferences = true;
        const typeKeywords = trip.accommodation.map(type => type.toLowerCase());
        filteredHotels = filteredHotels.filter(hotel => {
          const hotelName = (hotel.hotel?.name || '').toLowerCase();
          const hotelDescription = (hotel.hotel?.description?.text || '').toLowerCase();
          const hotelRating = parseInt(hotel.hotel?.rating) || 0;

          // Skip filtering for "hotel" since all results are hotels
          if (typeKeywords.includes('hotel')) {
            return true;
          }

          // Check for star rating preferences (e.g., "5-star", "4-star")
          const starRatingMatch = typeKeywords.some(keyword => {
            if (keyword.includes('star')) {
              const stars = parseInt(keyword.match(/\d+/)) || 0;
              return stars === hotelRating;
            }
            return false;
          });

          // Check for keyword matches in name or description
          const keywordMatch = typeKeywords.some(keyword =>
            hotelName.includes(keyword) || hotelDescription.includes(keyword)
          );

          return starRatingMatch || keywordMatch;
        });
      }

      console.log('🏨 Filtered Hotels:', filteredHotels);

      // If filtering removed all hotels, use the unfiltered list
      if (filteredHotels.length === 0 && appliedPreferences) {
        filteredHotels = hotelsResult || [];
      }

      // Only show this Toast if there are truly no hotels to display
      if (filteredHotels.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'No hotels available',
          text2: 'Try adjusting your dates or preferences',
        });
      } else {
        console.log('✅ Hotels to display:', filteredHotels.length);
      }

      setHotels(filteredHotels);
    } catch (error) {
      console.error('❌ Error fetching hotels:', JSON.stringify(error.cause?.response?.data || error.message || error, null, 2));
      const errorMessage = error.cause?.response?.data?.message || error.message;
      let toastText2 = 'Please try again later or adjust your search criteria';

      if (errorMessage.includes('Failed to get access token')) {
        toastText2 = 'Server authentication issue. Please contact support.';
      } else if (errorMessage.includes('Missing required parameters')) {
        toastText2 = 'Invalid search parameters. Please check your trip details.';
      } else if (errorMessage.includes('Rate limit exceeded')) {
        toastText2 = 'Rate limit exceeded. Please try again later.';
      }

      Toast.show({
        type: 'error',
        text1: 'Failed to fetch hotels',
        text2: toastText2,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHotelPress = (hotel) => {
    setSelectedHotel(hotel);
    setIsModalVisible(true);
  };

  const handleBookNow = () => {
    if (!trip || !selectedHotel) return;

    const url = createBookingComLink(trip.destination, checkInDate, checkOutDate);
    Linking.openURL(url).catch(err => {
      console.error('❌ Failed to open URL:', err);
      Toast.show({ type: 'error', text1: 'Failed to open booking link' });
    });
    setIsModalVisible(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
      <SafeAreaView style={{ backgroundColor: '#fff' }} />

      <View style={styles.header}>
        <Pressable onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight');
          navigation.goBack();
        }}>
          <SVG.BackIcon />
        </Pressable>
        <Text style={styles.headerTitle}>Book a Hotel in {trip?.destination || ''}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: hp(10) }} />
      ) : hotels.length === 0 ? (
        <Text style={styles.noHotelsText}>No hotels found. Try adjusting your preferences or dates.</Text>
      ) : (
        <FlatList
          data={hotels}
          keyExtractor={(item, index) => item.hotel?.hotelId || index.toString()}
          renderItem={({ item }) => {
            const nights = checkInDate && checkOutDate ? calculateNights(checkInDate, checkOutDate) : 1;
            const totalPrice = item.offers?.[0]?.price?.total || 'N/A';
            const currency = item.offers?.[0]?.price?.currency || '';
            const pricePerNight = totalPrice !== 'N/A' ? (parseFloat(totalPrice) / nights).toFixed(2) : 'N/A';

            return (
              <TouchableOpacity
                style={styles.hotelCard}
                onPress={() => handleHotelPress(item)}
              >
                <Text style={styles.hotelName}>{item.hotel?.name || 'Unknown Hotel'}</Text>
                {item.hotel?.rating && (
                  <Text style={styles.hotelRating}>⭐ {item.hotel.rating}</Text>
                )}
                {totalPrice !== 'N/A' ? (
                  <Text style={styles.hotelPrice}>
                    {totalPrice} {currency} for {nights} night{nights > 1 ? 's' : ''} (~{pricePerNight} {currency}/night)
                  </Text>
                ) : (
                  <Text style={styles.hotelPrice}>Price not available</Text>
                )}
                {item.hotel?.address?.lines?.[0] ? (
                  <Text style={styles.hotelLocation}>{item.hotel.address.lines[0]}</Text>
                ) : (
                  <Text style={styles.hotelLocation}>Address not available</Text>
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ padding: wp(4) }}
        />
      )}

      {/* Modal */}
      <Modal
        isVisible={isModalVisible}
        onBackdropPress={() => setIsModalVisible(false)}
        onSwipeComplete={() => setIsModalVisible(false)}
        swipeDirection="down"
        style={{ justifyContent: 'flex-end', margin: 0 }}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{selectedHotel?.hotel?.name || 'Hotel Details'}</Text>
          {selectedHotel?.hotel?.rating && (
            <Text style={styles.modalText}>Rating: ⭐ {selectedHotel.hotel.rating}</Text>
          )}
          {selectedHotel?.offers?.[0]?.price?.total ? (
            <Text style={styles.modalText}>
              Price: {selectedHotel.offers[0].price.total} {selectedHotel.offers[0].price.currency} for {calculateNights(checkInDate, checkOutDate)} night{calculateNights(checkInDate, checkOutDate) > 1 ? 's' : ''}
            </Text>
          ) : (
            <Text style={styles.modalText}>Price: Not available</Text>
          )}
          <Text style={styles.modalText}>
            Guests: {trip?.numberOfPersons || 1} | Rooms: {Math.ceil((trip?.numberOfPersons || 1) / 2)}
          </Text>
          {selectedHotel?.hotel?.address?.lines?.[0] ? (
            <Text style={styles.modalText}>Address: {selectedHotel.hotel.address.lines[0]}</Text>
          ) : (
            <Text style={styles.modalText}>Address: Not available</Text>
          )}
          {selectedHotel?.hotel?.description?.text ? (
            <Text style={styles.modalText}>Description: {selectedHotel.hotel.description.text}</Text>
          ) : (
            <Text style={styles.modalText}>Description: Not available</Text>
          )}

          <TouchableOpacity
            style={styles.modalButton}
            onPress={handleBookNow}
          >
            <Text style={styles.modalButtonText}>Book Now on Booking.com</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsModalVisible(false)}>
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

export default HotelBookingScreen;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLOR.white2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLOR.Charcoal,
  },
  hotelCard: {
    backgroundColor: '#FFFFFF',
    padding: wp(4),
    marginBottom: hp(2),
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hotelName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2A44',
  },
  hotelRating: {
    fontSize: 14,
    color: '#F59E0B',
    marginTop: 5,
  },
  hotelPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
    marginTop: 5,
  },
  hotelLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 5,
  },
  noHotelsText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: hp(10),
  },
  modalContent: {
    backgroundColor: 'white',
    padding: wp(5),
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2A44',
    marginBottom: hp(2),
  },
  modalText: {
    fontSize: 16,
    color: '#1F2A44',
    marginBottom: hp(1),
  },
  modalButton: {
    backgroundColor: '#007AFF',
    padding: hp(1.5),
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: hp(2),
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
    marginTop: hp(1),
  },
});