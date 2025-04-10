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

const HotelBookingScreen = ({ navigation }) => {
  const user = useSelector(({ appReducer }) => appReducer.user);
  const route = useRoute();
  const tripId = route.params?.tripId;
  const [trip, setTrip] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const fetchHotels = async () => {
    if (!trip?.destination) return;

    setLoading(true);
    try {
      // 👇 You could replace this later with your own backend call
      const searchQuery = encodeURIComponent(trip.destination + ' hotels');
      const hotelUrl = `https://www.google.com/search?q=${searchQuery}&tbm=lcl`;

      setHotels([{ name: trip.destination + " Hotels", url: hotelUrl }]);
    } catch (error) {
      console.error('❌ Error fetching hotels:', error);
      Toast.show({ type: 'error', text1: 'Failed to fetch hotels' });
    } finally {
      setLoading(false);
    }
  };

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
        });
    }
  }, [tripId, user?.uid]);

  useEffect(() => {
    if (trip) {
      fetchHotels();
    }
  }, [trip]);

  const handleHotelPress = (hotel) => {
    setSelectedHotel(hotel);
    setIsModalVisible(true);
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
        <Text style={styles.headerTitle}>Book a Hotel</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: hp(10) }} />
      ) : (
        <FlatList
          data={hotels}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.hotelCard}
              onPress={() => handleHotelPress(item)}
            >
              <Text style={styles.hotelName}>{item.name}</Text>
              <Text style={styles.hotelLocation}>Tap to explore hotels</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: wp(4) }}
        />
      )}

      <Modal
        isVisible={isModalVisible}
        onBackdropPress={() => setIsModalVisible(false)}
        onSwipeComplete={() => setIsModalVisible(false)}
        swipeDirection="down"
        style={{ justifyContent: 'flex-end', margin: 0 }}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Hotel Booking</Text>

          {selectedHotel && (
            <>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  Linking.openURL(selectedHotel.url);
                  setIsModalVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>Explore Hotels</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </>
          )}
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
  hotelLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 5,
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
    marginBottom: hp(2),
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
