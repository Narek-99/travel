import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, View, Pressable, Text, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Modal } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SVG } from '../../assets/svgs';
import { COLOR, hp, TEXT_STYLE, wp } from '../../enums/StyleGuide';
import { searchFlights } from '../../services/amadeusApi';
import { createSmartTripAffiliateLink } from '../../services/TripLinkService';
import Toast from 'react-native-toast-message';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import AirportSelector from '../../components/AirportSelector';
import airports from '../../assets/data/airports.json';
import { Label } from '../../components';


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

    // 1. Zuerst Airport finden mit passender Stadt + Land
    const byCityAndCountry = airportEntries.find(airport =>
      airport.city?.toLowerCase() === cityName?.toLowerCase() &&
      airport.country?.toLowerCase() === countryCode?.toLowerCase() &&
      airport.iata
    );
    if (byCityAndCountry) return byCityAndCountry;

    // 2. Wenn nicht, nur Stadt suchen
    const byCity = airportEntries.find(airport =>
      airport.city?.toLowerCase() === cityName?.toLowerCase() &&
      airport.iata
    );
    if (byCity) return byCity;

    // 3. Wenn auch nicht, nur Land suchen
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

      console.log('Departure:', departureDateFormatted, 'Return:', returnDateFormatted);

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
  };

  const handleHotelLinkPress = () => {
    if (!trip) return;
    const hotelLink = createSmartTripAffiliateLink(trip);
    Linking.openURL(hotelLink);
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
              const start = new Date(data.startDate.seconds * 1000);
              const end = new Date(data.endDate.seconds * 1000);
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

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight');
          navigation.goBack();
        }}>
          <SVG.BackIcon fill={COLOR.dark} />
        </Pressable>
        <Text style={styles.headerTitle}>Your Booking</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">

        {/* Flight Search Form */}
        <Text style={styles.sectionTitle}>✈️ Flights</Text>

        <AirportSelector
          label="From"
          selectedAirport={originAirport}
          setSelectedAirport={setOriginAirport}
        />
        <AirportSelector
          label="To"
          selectedAirport={destinationAirport}
          setSelectedAirport={setDestinationAirport}
        />

        <View style={styles.dateContainer}>
          <View>
            <Label style={{ color: COLOR.dark, marginBottom: hp(1) }}>Departure Flight</Label>
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
            />
          </View>

          {showReturnFlight && (
            <>
              <Label style={{ color: COLOR.dark, marginBottom: hp(1) }}>Return Flight</Label>
              <DateTimePicker
                value={returnFlightDate}
                mode="date"
                display="default"
                minimumDate={startFlightDate}
                onChange={(event, selectedDate) => {
                  if (selectedDate) setReturnFlightDate(selectedDate);
                }}
                themeVariant="light"
              />
            </>
          )}
          {!showReturnFlight ? (
            <TouchableOpacity
              style={styles.addReturnButton}
              onPress={() => setShowReturnFlight(true)}
            >
              <Text style={styles.addReturnButtonText}>➕ Add Return Flight</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.removeReturnButton}
              onPress={() => setShowReturnFlight(false)}
            >
              <Text style={styles.removeReturnButtonText}>❌ Remove Return Flight</Text>
            </TouchableOpacity>
          )}
        </View>



        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.searchButton} onPress={handleSearchFlights}>
            <Text style={styles.buttonText}>🔎 Search Flights</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.buttonText}>🧹 Reset</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLOR.dark} style={{ marginTop: 20 }} />
        ) : (
          <>
            {/* Hinflug-Sektion */}
            {departureFlights.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: hp(2) }]}>✈️ Departure Flights</Text>
                {departureFlights.map((flight, index) => (
                  <TouchableOpacity
                    key={`dep-${index}`}
                    style={styles.flightCard}
                    onPress={() => handleFlightPress(flight)}
                  >
                    <Text style={styles.flightText}>
                      {flight.itineraries[0].segments[0].departure.iataCode} ➔ {flight.itineraries[0].segments.slice(-1)[0].arrival.iataCode}
                    </Text>

                    {flight.validatingAirlineCodes && (
                      <Text style={styles.flightText}>
                        Airline: {flight.validatingAirlineCodes.join(', ')}
                      </Text>
                    )}

                    <Text style={styles.flightText}>
                      Duration: {flight.itineraries[0].duration.replace('PT', '').toLowerCase()}
                    </Text>

                    <Text style={styles.flightText}>
                      Date: {new Date(flight.itineraries[0].segments[0].departure.at).toLocaleDateString()}
                    </Text>

                    <Text style={styles.flightPrice}>
                      Price: {flight.price.total} {flight.price.currency}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Rückflug-Sektion */}
            {returnFlights.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: hp(2) }]}>🔁 Return Flights</Text>
                {returnFlights.map((flight, index) => (
                  <TouchableOpacity
                    key={`ret-${index}`}
                    style={styles.flightCard}
                    onPress={() => handleFlightPress(flight)}
                  >
                    <Text style={styles.flightText}>
                      {flight.itineraries[0].segments[0].departure.iataCode} ➔ {flight.itineraries[0].segments.slice(-1)[0].arrival.iataCode}
                    </Text>
                    <Text style={styles.flightText}>
                      Duration: {flight.itineraries[0].duration.replace('PT', '').toLowerCase()}
                    </Text>
                    <Text style={styles.flightPrice}>
                      Price: {flight.price.total} {flight.price.currency}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        )}


        {/* Hotel Section */}
        {trip && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: hp(3) }]}>
              🏨 Hotels in {trip.destination}
            </Text>
            <Pressable style={styles.hotelButton} onPress={handleHotelLinkPress}>
              <Text style={styles.hotelButtonText}>🔗 Open Hotels</Text>
            </Pressable>
          </>
        )}

        <Modal
          visible={isModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {selectedFlight && (
                <>
                  <Text style={styles.modalTitle}>Flight Details</Text>

                  {/* Departure Info */}
                  <Text style={styles.modalSubTitle}>Departure</Text>
                  <Text>
                    {selectedFlight.itineraries[0].segments[0].departure.iataCode} ➔ {selectedFlight.itineraries[0].segments.slice(-1)[0].arrival.iataCode}
                  </Text>
                  <Text>
                    {new Date(selectedFlight.itineraries[0].segments[0].departure.at).toLocaleDateString()} -
                    {new Date(selectedFlight.itineraries[0].segments[0].departure.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>

                  {/* Arrival Info */}
                  <Text style={styles.modalSubTitle}>Arrival</Text>
                  <Text>
                    {new Date(selectedFlight.itineraries[0].segments.slice(-1)[0].arrival.at).toLocaleDateString()} -
                    {new Date(selectedFlight.itineraries[0].segments.slice(-1)[0].arrival.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>

                  {/* Duration */}
                  <Text style={styles.modalSubTitle}>Duration</Text>
                  <Text>{selectedFlight.itineraries[0].duration.replace('PT', '').toLowerCase()}</Text>

                  {/* Stops */}
                  <Text style={styles.modalSubTitle}>Stops</Text>
                  <Text>
                    {selectedFlight.itineraries[0].segments.length === 1
                      ? 'Direct flight'
                      : `${selectedFlight.itineraries[0].segments.length - 1} stop(s)`}
                  </Text>

                  {/* Airline */}
                  {selectedFlight.validatingAirlineCodes && (
                    <>
                      <Text style={styles.modalSubTitle}>Airline</Text>
                      <Text>{selectedFlight.validatingAirlineCodes.join(', ')}</Text>
                    </>
                  )}

                  {/* Price */}
                  <Text style={styles.modalSubTitle}>Price</Text>
                  <Text style={{ fontWeight: 'bold', fontSize: 18, marginTop: 4 }}>
                    {selectedFlight.price.total} {selectedFlight.price.currency}
                  </Text>

                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => {
                      const origin = selectedFlight.itineraries[0].segments[0].departure.iataCode; // e.g., "DUS"
                      const destination = selectedFlight.itineraries[0].segments.slice(-1)[0].arrival.iataCode; // e.g., "EVN"
                      const departureDate = new Date(selectedFlight.itineraries[0].segments[0].departure.at)
                        .toISOString()
                        .split('T')[0]
                        .replace(/-/g, '');

                      const bookingUrl = `https://www.google.com/travel/flights?hl=en&gl=US&curr=USD&q=Flights+to+${destination}+from+${origin}+on+${departureDate}+one+way`;

                      Linking.openURL(bookingUrl)
                        .catch(err => console.error('Failed to open URL:', err));
                      setIsModalVisible(false);
                    }}
                  >
                    <Text style={styles.modalButtonText}>Book now</Text>
                  </TouchableOpacity>

                  {/* Close */}
                  <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                    <Text style={{ marginTop: 10, color: COLOR.dark }}>❌ Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>



      </ScrollView>
    </View>
  );
};

export default BookingScreen;

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLOR.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
  },
  headerTitle: {
    ...TEXT_STYLE.smallTitleBold,
    fontSize: 20,
    color: COLOR.dark,
  },
  contentContainer: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(5),
  },
  sectionTitle: {
    ...TEXT_STYLE.title,
    marginBottom: hp(2),
  },
  datePickerButton: {
    backgroundColor: '#e5e5e5',
    borderRadius: 10,
    padding: wp(4),
    marginBottom: hp(2),
  },
  datePickerText: {
    fontSize: 16,
    color: COLOR.dark,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(2),
    marginBottom: hp(3),
  },
  searchButton: {
    flex: 1,
    backgroundColor: '#0084FF',
    padding: wp(4),
    borderRadius: 10,
    alignItems: 'center',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#ff4d4d',
    padding: wp(4),
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  flightCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: wp(4),
    marginBottom: hp(2),
  },
  flightText: {
    fontSize: 14,
    color: COLOR.dark,
    marginBottom: 4,
  },
  flightPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0084FF',
  },
  hotelButton: {
    backgroundColor: '#0084FF',
    borderRadius: 10,
    padding: wp(4),
    alignItems: 'center',
    marginTop: hp(1),
  },
  hotelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: hp(5),
    paddingBottom: hp(5),
  },
  addReturnButton: {
    marginTop: hp(2),
    backgroundColor: '#0084FF',
    padding: wp(3),
    borderRadius: 10,
    alignItems: 'center',
  },

  addReturnButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  removeReturnButton: {
    marginTop: hp(2),
    backgroundColor: '#ff4d4d',
    padding: wp(3),
    borderRadius: 10,
    alignItems: 'center',
  },

  removeReturnButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalButton: {
    marginTop: 20,
    backgroundColor: '#0084FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSubTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },

});
