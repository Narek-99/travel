import airports from '../assets/data/airports.json';

export const getCityDetailsFromDestination = (destination) => {
    console.log('🔎 Looking for destination:', destination);
    const matchingAirports = Object.values(airports).filter(
        (airport) => airport.city.toLowerCase() === destination.toLowerCase()
    );

    if (matchingAirports.length === 0) {
        console.log('❌ No airport found for destination:', destination);
        return null;
    }

    // Prioritize airports in Germany for Berlin
    let airport = matchingAirports.find(airport => airport.country === 'DE') || matchingAirports[0];
    console.log('✅ Found airport:', airport);

    return {
        latitude: airport.lat,
        longitude: airport.lon,
    };
};