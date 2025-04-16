import axios from 'axios';

// Replace this with your Vercel backend URL
const API_BASE_URL = 'https://openai-proxy-gilt-three.vercel.app/api/hotels';

export const searchHotels = async ({ latitude, longitude, checkInDate, checkOutDate, adults, roomQuantity }) => {
    try {
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
        if (!hotels || hotels.length === 0) {
            return [];
        }

        return hotels;
    } catch (error) {
        console.error('❌ Error fetching hotels from backend:', error.response?.data || error.message);
        throw new Error('Failed to fetch hotels from backend', { cause: error });
    }
};