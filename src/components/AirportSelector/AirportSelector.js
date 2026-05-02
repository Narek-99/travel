import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text, StyleSheet, Keyboard, ActivityIndicator } from 'react-native';
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedAirport) {
      setQuery(`${selectedAirport.city} (${selectedAirport.iata})`);
    } else {
      setQuery('');
    }
  }, [selectedAirport]);

  const handleSearch = (text) => {
    setQuery(text);
    if (text.trim() === '') {
      setSelectedAirport(null);
      setFilteredAirports([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      const results = airportList.filter(
        (airport) =>
          airport.name.toLowerCase().includes(text.toLowerCase()) ||
          airport.city.toLowerCase().includes(text.toLowerCase()) ||
          airport.iata.toLowerCase().includes(text.toLowerCase())
      );

      setFilteredAirports(results.length > 0 ? results : []);
      setLoading(false);
    }, 300); // slight debounce

    return () => clearTimeout(timer);
  };

  const handleSelect = (airport) => {
    if (airport.iata) {
      setSelectedAirport(airport);
      setQuery(`${airport.city} (${airport.iata})`);
    }
    setFilteredAirports([]);
    Keyboard.dismiss();
  };

  const highlightMatch = (text, keyword) => {
    if (!keyword) return text;
    const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
    return parts.map((part, index) => (
      part.toLowerCase() === keyword.toLowerCase() ? (
        <Text key={index} style={styles.highlightText}>{part}</Text>
      ) : (
        <Text key={index}>{part}</Text>
      )
    ));
  };

  return (
    <View style={{ marginBottom: hp(2) }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={query}
        onChangeText={handleSearch}
        placeholder="Search Airport..."
        style={styles.input}
        placeholderTextColor="#9CA3AF"
      />

      {loading && (
        <ActivityIndicator color="#007AFF" style={{ marginTop: 10 }} />
      )}

      {filteredAirports.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={filteredAirports}
            keyExtractor={(item, index) => item.iata + index}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.itemText}>
                  {highlightMatch(`${item.name} (${item.iata})`, query)}
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
    color: COLOR.white,
  },
  input: {
    backgroundColor: '#F3F4F6',
    padding: wp(4),
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdown: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginTop: 5,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownItem: {
    padding: wp(4),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  itemText: {
    fontSize: 14,
    color: '#1F2A44',
  },
  highlightText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  noResultText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
  },
});
