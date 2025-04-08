// services/amadeusApi.js

import axios from 'axios';

const API_KEY = 'IyLqPM5UyAvaBA6JSfO5gJeHqo5cbf6N';
const API_SECRET = 'AGsTpufmRwYEOAxe';

let accessToken = null;
let tokenExpiresAt = null;

export const getAccessToken = async () => {
    if (accessToken && tokenExpiresAt > Date.now()) {
        return accessToken;
    }

    try {
        const response = await axios.post(
            'https://test.api.amadeus.com/v1/security/oauth2/token',
            `grant_type=client_credentials&client_id=${API_KEY}&client_secret=${API_SECRET}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        accessToken = response.data.access_token;
        tokenExpiresAt = Date.now() + (response.data.expires_in * 1000) - 60000;

        console.log('✅ Access Token erfolgreich erhalten');
        return accessToken;
    } catch (error) {
        console.error('❌ Fehler beim Abrufen des Access Tokens:', error.response?.data || error.message);
        throw error;
    }
};

export const searchFlights = async ({ originLocationCode, destinationLocationCode, departureDate, adults = 1, max = 5 }) => {
    const token = await getAccessToken();

    try {
        const response = await axios.get(
            'https://test.api.amadeus.com/v2/shopping/flight-offers',
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                params: {
                    originLocationCode,
                    destinationLocationCode,
                    departureDate,
                    adults,
                    max,
                    currencyCode: 'USD',
                },
            }
        );

        return response.data.data;
    } catch (error) {
        console.error('❌ Fehler beim Suchen von Flügen:', error.response?.data || error.message);
        throw error;
    }
};
