import airports from '../assets/data/airports.json';

export const getCityDetailsFromDestination = (destination) => {
    const matchingAirports = Object.values(airports).filter(
        (airport) => airport.city.toLowerCase() === destination.toLowerCase()
    );

    if (matchingAirports.length === 0) {
        return null;
    }

    let airport = matchingAirports.find(airport => airport.country === 'DE') || matchingAirports[0];
    return {
        latitude: airport.lat,
        longitude: airport.lon,
    };
};