export const createBookingComLink = (destination, checkIn, checkOut) => {
    const destinationQuery = encodeURIComponent(destination);
    return `https://www.booking.com/searchresults.html?ss=${destinationQuery}&checkin_date=${checkIn}&checkout_date=${checkOut}`;
};
