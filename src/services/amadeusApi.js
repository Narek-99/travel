import axios from 'axios';

export const searchFlights = async ({ originLocationCode, destinationLocationCode, departureDate, returnDate, adults = 1, max = 5 }) => {
    try {
        const params = {
            originLocationCode,
            destinationLocationCode,
            departureDate,
            adults,
            max,
        };

        if (returnDate) {
            params.returnDate = returnDate; // only add if it exists
        }

        const response = await axios.get('https://openai-proxy-gilt-three.vercel.app/api/searchFlights', { params });

        return response.data;
    } catch (error) {
        console.error('❌ Mobile App Error:', error.response?.data || error.message);
        throw error;
    }
};
