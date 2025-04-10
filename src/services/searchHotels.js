import axios from 'axios';

// Replace this with your Vercel backend URL
const API_BASE_URL = 'https://openai-proxy-gilt-three.vercel.app/api/hotels';

export const searchHotels = async ({ latitude, longitude, checkInDate, checkOutDate, adults, roomQuantity }) => {
    try {
        console.log('🔍 Sending request to backend:', {
            latitude,
            longitude,
            checkInDate,
            checkOutDate,
            adults,
            roomQuantity,
        });

        const response = await axios.get(API_BASE_URL, {
            params: {
                latitude,
                longitude,
                checkInDate,
                checkOutDate,
                adults,
                roomQuantity,
            },
        });

        const hotels = response.data;
        console.log('🏨 Hotels received from backend:', hotels);

        if (!hotels || hotels.length === 0) {
            console.log('ℹ️ No hotels found from backend');
            return [];
        }

        return hotels;
    } catch (error) {
        console.error('❌ Error fetching hotels from backend:', error.response?.data || error.message);
        throw new Error('Failed to fetch hotels from backend', { cause: error });
    }
};