export const createSmartTripAffiliateLink = (trip) => {
    if (!trip || !trip.destination || !trip.startDate || !trip.endDate) {
        return 'https://www.trip.com/m/hotels/list';
    }

    const destination = "Roma";
    const checkIn = new Date(trip.startDate.seconds * 1000).toISOString().split('T')[0].replace(/-/g, '/');
    const checkOut = new Date(trip.endDate.seconds * 1000).toISOString().split('T')[0].replace(/-/g, '/');
    const adults = parseInt(trip.numberOfPersons || '2', 10);

    const url = new URL('https://www.trip.com/m/hotels/list/');

    url.searchParams.append('optionName', 'Rome');
    url.searchParams.append('checkIn', checkIn);
    url.searchParams.append('checkOut', checkOut);
    url.searchParams.append('adult', adults.toString());
    url.searchParams.append('children', '0');
    url.searchParams.append('crn', '1');
    url.searchParams.append('metaFinish', 'true');
    url.searchParams.append('cityId', '343');
    url.searchParams.append('countryId', '106');
    url.searchParams.append('optionid', '343');
    url.searchParams.append('optiontype', 'IntlCity');

    return url.toString();
};


export const createFlightAffiliateLink = (trip) => {
    if (!trip || !trip.startDate || !trip.endDate) {
        return 'https://www.trip.com/m/flights/xflightfirst/';
    }

    const departureDate = new Date(trip.startDate.seconds * 1000).toISOString().split('T')[0];
    const returnDate = new Date(trip.endDate.seconds * 1000).toISOString().split('T')[0];
    const adults = parseInt(trip.numberOfPersons || '2', 10);

    // Sinnvolle Dummy-Codes
    const dcityCode = 'FRA'; // Frankfurt (Germany)
    const acityCode = 'BCN'; // Barcelona (Spain)

    const url = `https://www.trip.com/m/flights/xflightfirst/?triptype=1&classtype=0&adult=${adults}&child=0&infant=0&ddate=${departureDate}&adate=${returnDate}&dcitycode=${dcityCode}&acitycode=${acityCode}&lowpricesource=searchForm&from=flighthome&stoptype=0&classgroupsearch=true`;
    return url;
};