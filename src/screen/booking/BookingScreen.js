import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, View, Pressable, Text, FlatList, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SVG } from '../../assets/svgs';
import { COLOR, hp, wp } from '../../enums/StyleGuide';
import { searchFlights } from '../../services/amadeusApi';
import { createSmartTripAffiliateLink } from '../../services/TripLinkService';
import Toast from 'react-native-toast-message';
import AirportSelector from '../../components/AirportSelector';
import airports from '../../assets/data/airports.json';
import { Label } from '../../components';
import Icon from 'react-native-vector-icons/Ionicons';
import Modal from 'react-native-modal';
import Clipboard from '@react-native-clipboard/clipboard';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const BookingScreen = ({ navigation }) => {
  const user = useSelector(({ appReducer }) => appReducer.user);
  const route = useRoute();
  const tripId = route.params?.tripId;
  const [trip, setTrip] = useState(null);

  const [originAirport, setOriginAirport] = useState(null);
  const [destinationAirport, setDestinationAirport] = useState(null);
  const [startFlightDate, setStartFlightDate] = useState(new Date());
  const [returnFlightDate, setReturnFlightDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [showReturnFlight, setShowReturnFlight] = useState(false);
  const [departureFlights, setDepartureFlights] = useState([]);
  const [returnFlights, setReturnFlights] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleFlightPress = (flight) => {
    setSelectedFlight(flight);
    setIsModalVisible(true);
  };

  const findBestAirport = (cityName, countryCode) => {
    const airportEntries = Object.values(airports);
    const byCityAndCountry = airportEntries.find(airport =>
      airport.city?.toLowerCase() === cityName?.toLowerCase() &&
      airport.country?.toLowerCase() === countryCode?.toLowerCase() &&
      airport.iata
    );
    if (byCityAndCountry) return byCityAndCountry;
    const byCity = airportEntries.find(airport =>
      airport.city?.toLowerCase() === cityName?.toLowerCase() &&
      airport.iata
    );
    if (byCity) return byCity;
    const byCountry = airportEntries.find(airport =>
      airport.country?.toLowerCase() === countryCode?.toLowerCase() &&
      airport.iata
    );
    if (byCountry) return byCountry;
    return null;
  };

  const handleSearchFlights = async () => {
    if (!originAirport || !destinationAirport || !startFlightDate) {
      Toast.show({ type: 'error', text1: 'Please select airports and dates!' });
      return;
    }
    setLoading(true);
    try {
      const departureDateFormatted = startFlightDate.toISOString().split('T')[0];
      const returnDateFormatted = returnFlightDate?.toISOString().split('T')[0];
      const depFlights = await searchFlights({
        originLocationCode: originAirport.iata,
        destinationLocationCode: destinationAirport.iata,
        departureDate: departureDateFormatted,
        adults: 1,
        max: 5,
      });
      let retFlights = [];
      if (showReturnFlight && startFlightDate.getTime() !== returnFlightDate.getTime()) {
        retFlights = await searchFlights({
          originLocationCode: destinationAirport.iata,
          destinationLocationCode: originAirport.iata,
          departureDate: returnDateFormatted,
          adults: 1,
          max: 5,
        });
      }
      if (depFlights.length === 0 && retFlights.length === 0) {
        Toast.show({ type: 'info', text1: 'No flights found. Try different dates or airports.' });
      }
      setDepartureFlights(depFlights);
      setReturnFlights(retFlights);
    } catch (error) {
      console.error('❌ Flight search error:', error.response?.data || error.message);
      Toast.show({ type: 'error', text1: 'Flight search failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setOriginAirport(null);
    setDestinationAirport(null);
    setStartFlightDate(new Date());
    setReturnFlightDate(new Date());
    setShowReturnFlight(false);
    setDepartureFlights([]);
    setReturnFlights([]);
  };

  const handleHotelLinkPress = () => {
    if (!trip) return;
    const hotelLink = createSmartTripAffiliateLink(trip);
    Linking.openURL(hotelLink);
  };

  const triggerHaptic = () => {
    ReactNativeHapticFeedback.trigger('impactMedium', { enableVibrateFallback: true });
  };

  React.useEffect(() => {
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
            let destinationAirport = findBestAirport(data.destination, data.country);
            if (destinationAirport) {
              setDestinationAirport({
                iata: destinationAirport.iata,
                name: destinationAirport.name,
                city: destinationAirport.city,
                country: destinationAirport.country,
              });
            }
            if (data.startDate && data.endDate) {
              const start = new Date(data.startDate);
              const end = new Date(data.endDate);
              setStartFlightDate(start);
              setReturnFlightDate(end);
            }
          }
        })
        .catch(error => {
          console.error('❌ Error loading trip:', error);
        });
    }
  }, [tripId, user?.uid]);

  // Data for FlatList
  const renderData = [
    // Flights Section Title
    {
      type: 'sectionTitle',
      title: 'Flights',
    },
    // Airport Selectors
    {
      type: 'airportSelectors',
    },
    // Date Pickers
    {
      type: 'datePickers',
    },
    // Buttons
    {
      type: 'buttons',
    },
    // Loading Indicator
    ...(loading
      ? [
        {
          type: 'loader',
        },
      ]
      : []),
    // Departure Flights
    ...(departureFlights.length > 0
      ? [
        {
          type: 'sectionTitle',
          title: 'Departure Flights',
          marginTop: hp(2),
        },
        ...departureFlights.map((flight, index) => ({
          type: 'flightCard',
          flight,
          key: `dep-${index}`,
          isDeparture: true,
        })),
      ]
      : []),
    // Return Flights
    ...(returnFlights.length > 0
      ? [
        {
          type: 'sectionTitle',
          title: 'Return Flights',
          marginTop: hp(2),
        },
        ...returnFlights.map((flight, index) => ({
          type: 'flightCard',
          flight,
          key: `ret-${index}`,
          isDeparture: false,
        })),
      ]
      : []),
  ];

  const renderItem = ({ item }) => {
    switch (item.type) {
      case 'sectionTitle':
        return <Text style={[styles.sectionTitle, { marginTop: item.marginTop || hp(4) }]}>{item.title}</Text>;

      case 'airportSelectors':
        return (
          <View style={styles.inputCard}>
            <AirportSelector
              label="From"
              selectedAirport={originAirport}
              setSelectedAirport={(value) => setOriginAirport(value || null)}
            />
            <AirportSelector
              label="To"
              selectedAirport={destinationAirport}
              setSelectedAirport={(value) => setDestinationAirport(value || null)}
            />
          </View>
        );

      case 'datePickers':
        return (
          <View style={styles.dateContainer}>
            <View style={{ flexDirection: "row", justifyContent: showReturnFlight ? "space-around" : "space-between" }}>
              <View style={styles.datePickerWrapper}>
                <Label style={styles.label}>Departure Date</Label>
                <DateTimePicker
                  value={startFlightDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setStartFlightDate(selectedDate);
                      if (selectedDate > returnFlightDate) {
                        setReturnFlightDate(selectedDate);
                      }
                    }
                  }}
                  themeVariant="light"
                  minimumDate={new Date()}
                />
              </View>

              {showReturnFlight && (
                <View style={styles.datePickerWrapper}>
                  <Label style={styles.label}>Return Date</Label>
                  <DateTimePicker
                    value={returnFlightDate}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) setReturnFlightDate(selectedDate);
                    }}
                    minimumDate={startFlightDate}
                    themeVariant="light"
                  />
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.toggleReturnButton}
              onPress={() => {
                triggerHaptic();
                setShowReturnFlight(!showReturnFlight);
              }}
            >
              {showReturnFlight ? <SVG.Minus width="20" height="20" /> : <SVG.Plus width="20" height="20" fill="#007AFF" />}


              <Text style={styles.toggleReturnText}>
                {showReturnFlight ? "Remove Return Date" : "Add Return Date"}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'buttons':
        return (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => {
                triggerHaptic();
                handleSearchFlights();
              }}
            >
              <SVG.Search fill={COLOR.white} />
              <Text style={styles.buttonText}>Search Flights</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                triggerHaptic();
                handleReset();
              }}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>
        );

      case 'loader':
        return <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />;

      case 'flightCard':
        return (
          <TouchableOpacity
            style={styles.flightCard}
            onPress={() => {
              triggerHaptic();
              handleFlightPress(item.flight);
            }}
          >
            <View style={styles.flightCardHeader}>
              <Pressable
                onLongPress={() => {
                  Clipboard.setString(`${item.flight.itineraries[0].segments[0].departure.iataCode} → ${item.flight.itineraries[0].segments.slice(-1)[0].arrival.iataCode}`);
                  triggerHaptic();
                  Toast.show({ type: 'success', text1: 'Route copied!' });
                }}
              >
                <Text style={styles.flightRoute}>
                  {item.flight.itineraries[0].segments[0].departure.iataCode} → {item.flight.itineraries[0].segments.slice(-1)[0].arrival.iataCode}
                </Text>
              </Pressable>

              <Pressable
                onLongPress={() => {
                  Clipboard.setString(`${item.flight.price.total} ${item.flight.price.currency}`);
                  triggerHaptic();
                  Toast.show({ type: 'success', text1: 'Price copied!' });
                }}
              >
                <Text style={styles.flightPrice}>
                  {item.flight.price.total} {item.flight.price.currency}
                </Text>
              </Pressable>
            </View>

            <View style={styles.flightDetails}>
              {item.isDeparture && (
                <Pressable
                  onLongPress={() => {
                    Clipboard.setString(item.flight.validatingAirlineCodes?.join(', ') || 'N/A');
                    triggerHaptic();
                    Toast.show({ type: 'success', text1: 'Airline copied!' });
                  }}
                  style={styles.flightDetailRow}
                >
                  <Text style={styles.flightDetailText}>
                    ✈️ Airline: {item.flight.validatingAirlineCodes?.join(', ') || 'N/A'}
                  </Text>
                </Pressable>
              )}
              <Pressable
                onLongPress={() => {
                  Clipboard.setString(item.flight.itineraries[0].duration.replace('PT', '').toLowerCase());
                  triggerHaptic();
                  Toast.show({ type: 'success', text1: 'Duration copied!' });
                }}
                style={styles.flightDetailRow}
              >
                <Text style={styles.flightDetailText}>
                  ⏱️ Duration: {item.flight.itineraries[0].duration.replace('PT', '').toLowerCase()}
                </Text>
              </Pressable>
              <Pressable
                onLongPress={() => {
                  Clipboard.setString(
                    new Date(item.flight.itineraries[0].segments[0].departure.at).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  );
                  triggerHaptic();
                  Toast.show({ type: 'success', text1: 'Date copied!' });
                }}
                style={styles.flightDetailRow}
              >
                <Text style={styles.flightDetailText}>
                  📅 Date: {new Date(item.flight.itineraries[0].segments[0].departure.at).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </Pressable>
            </View>
          </TouchableOpacity>

        );

      case 'hotelButton':
        return (
          <TouchableOpacity
            style={styles.hotelButton}
            onPress={() => {
              triggerHaptic();
              handleHotelLinkPress();
            }}
          >
            <Icon name="bed-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.hotelButtonText}>Explore Hotels</Text>
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.safeArea} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => {
          triggerHaptic();
          navigation.goBack();
        }}>
          <SVG.BackIcon />
        </Pressable>
        <Text style={styles.headerTitle}>Book Your Trip</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={renderData}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.key || item.type + index}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      />

      <Modal
        isVisible={isModalVisible}
        onBackdropPress={() => setIsModalVisible(false)}
        onSwipeComplete={() => setIsModalVisible(false)}
        swipeDirection="down"
        style={styles.bottomModal}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHandle} />
          {selectedFlight && (
            <>
              <Text style={styles.modalTitle}>Flight Details</Text>

              <View style={styles.modalSection}>
                <Text style={styles.modalSubTitle}>Route</Text>
                <Text style={styles.modalText}>
                  {selectedFlight.itineraries[0].segments[0].departure.iataCode} → {selectedFlight.itineraries[0].segments.slice(-1)[0].arrival.iataCode}
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSubTitle}>Departure</Text>
                <Text style={styles.modalText}>
                  {new Date(selectedFlight.itineraries[0].segments[0].departure.at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} •{' '}
                  {new Date(selectedFlight.itineraries[0].segments[0].departure.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSubTitle}>Arrival</Text>
                <Text style={styles.modalText}>
                  {new Date(selectedFlight.itineraries[0].segments.slice(-1)[0].arrival.at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} •{' '}
                  {new Date(selectedFlight.itineraries[0].segments.slice(-1)[0].arrival.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSubTitle}>Duration</Text>
                <Text style={styles.modalText}>{selectedFlight.itineraries[0].duration.replace('PT', '').toLowerCase()}</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSubTitle}>Stops</Text>
                <Text style={styles.modalText}>
                  {selectedFlight.itineraries[0].segments.length === 1
                    ? 'Direct Flight'
                    : `${selectedFlight.itineraries[0].segments.length - 1} Stop(s)`}
                </Text>
              </View>

              {selectedFlight.validatingAirlineCodes && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSubTitle}>Airline</Text>
                  <Text style={styles.modalText}>{selectedFlight.validatingAirlineCodes.join(', ')}</Text>
                </View>
              )}

              <View style={styles.modalSection}>
                <Text style={styles.modalSubTitle}>Price</Text>
                <Text style={styles.modalPrice}>
                  {selectedFlight.price.total} {selectedFlight.price.currency}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  triggerHaptic();
                  const origin = selectedFlight.itineraries[0].segments[0].departure.iataCode;
                  const destination = selectedFlight.itineraries[0].segments.slice(-1)[0].arrival.iataCode;
                  const departureDate = new Date(selectedFlight.itineraries[0].segments[0].departure.at)
                    .toISOString()
                    .split('T')[0]
                    .replace(/-/g, '');

                  const bookingUrl = `https://www.google.com/travel/flights?hl=en&gl=US&curr=USD&q=Flights+to+${destination}+from+${origin}+on+${departureDate}+one+way`;

                  Linking.openURL(bookingUrl).catch(err => console.error('Failed to open URL:', err));
                  setIsModalVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>Book Now</Text>
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

export default BookingScreen;

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLOR.Charcoal,
  },
  contentContainer: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(10),
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLOR.Charcoal,
    marginBottom: hp(2),
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: wp(4),
    marginBottom: hp(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: wp(4),
    marginBottom: hp(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  datePickerWrapper: {
    flexDirection: "column",
    alignItems: "center",
    marginBottom: hp(2),
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: hp(1),
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 10,
    padding: wp(3),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  datePickerText: {
    fontSize: 16,
    color: '#1F2A44',
  },
  toggleReturnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(1),
  },
  toggleReturnText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: wp(2),
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(3),
    marginTop: hp(2),
  },
  searchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 58, 138, 1)',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    gap: wp(1)
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: hp(1.5),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  buttonIcon: {
    marginRight: wp(2),
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  loader: {
    marginTop: hp(3),
  },
  flightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: wp(4),
    marginBottom: hp(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  flightCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  flightRoute: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2A44',
  },
  flightPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
  },
  flightDetails: {
    marginTop: hp(1),
    marginLeft: wp(0)
  },
  flightDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.5),
  },
  flightDetailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: wp(2),
  },
  hotelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: hp(1.5),
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  hotelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: wp(2),
  },
  modalContainer: {
    flex: 1,
    // backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: wp(5),
    paddingTop: hp(2),
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: hp(2),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2A44',
    marginBottom: hp(2),
    textAlign: 'left',
  },
  modalSection: {
    marginBottom: hp(2),
  },
  modalSubTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: hp(0.5),
  },
  modalText: {
    fontSize: 16,
    color: '#1F2A44',
  },
  modalPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34C759',
  },
  modalButton: {
    backgroundColor: '#007AFF',
    paddingVertical: hp(1.5),
    borderRadius: 10,
    alignItems: 'center',
    marginTop: hp(2),
    marginBottom: hp(1),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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
    marginBottom: hp(2),
  },
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
});