import React, { useState } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text, StyleSheet } from 'react-native';
import airports from '../../assets/data/airports.json';
import { COLOR, wp, hp } from '../../enums/StyleGuide';

const airportList = Object.values(airports)
  .filter(a => a.iata && a.city)
  .map(a => ({
    name: `${a.city} - ${a.name}`,
    iata: a.iata,
    city: a.city,
    country: a.country,
  }));

const AirportSelector = ({ label, selectedAirport, setSelectedAirport }) => {
  const [query, setQuery] = useState('');
  const [filteredAirports, setFilteredAirports] = useState([]);

  const handleSearch = (text) => {
    setQuery(text);

    if (text.trim() === '') {
      setSelectedAirport(null); // ✨ if empty, clear selection
      setFilteredAirports([]);
      return;
    }

    const results = airportList.filter(
      (airport) =>
        airport.name.toLowerCase().includes(text.toLowerCase()) ||
        airport.city.toLowerCase().includes(text.toLowerCase()) ||
        airport.iata.toLowerCase().includes(text.toLowerCase())
    );

    setFilteredAirports(results.length > 0 ? results : [{ name: 'No airport found', iata: '' }]);
  };

  const handleSelect = (airport) => {
    if (airport.iata) {
      setSelectedAirport(airport);
      setQuery(`${airport.city} (${airport.iata})`); // show nicely selected
    }
    setFilteredAirports([]);
  };

  return (
    <View style={{ marginBottom: hp(2) }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={query}
        onChangeText={handleSearch}
        placeholder="Search Airport..."
        style={styles.input}
      />
      {filteredAirports.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={filteredAirports}
            keyExtractor={(item, index) => item.iata + index}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleSelect(item)}
                disabled={!item.iata}
              >
                <Text style={{ fontSize: 14 }}>
                  {item.iata ? `${item.name} (${item.iata})` : item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
};

export default AirportSelector;

const styles = StyleSheet.create({
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: hp(1),
    color: COLOR.dark,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: wp(4),
    borderRadius: 10,
    fontSize: 16,
  },
  dropdown: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    maxHeight: 200,
    marginTop: 4,
  },
  dropdownItem: {
    padding: wp(4),
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
