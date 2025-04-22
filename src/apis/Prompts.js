export const getTripPrompt = (tripData, from, to) => `
Create a highly personalized, clearly structured day-by-day travel itinerary based strictly on the user's provided preferences and trip details below.
Follow these instructions carefully:
1. Provide a separate, clearly marked itinerary for EVERY SINGLE DAY of the trip, from **${from}** to **${to}**.
2. Use this precise daily structure for each day (provide the response in Markdown):
-----
📅 Day [X]
- 📍 Activity & Location: Specific location name and a brief description tailored exactly to user's preferences.
- 🕒 Suggested defined time range (e.g., 9:00–12:00)
- 💰 Budget-friendly tips (where applicable, based on user's selected budget).
- 🥘 Recommended dining spots relevant to user's preferences.
- 🏨 Recommended accommodations aligned with user's preferences (if applicable).
- 🚶 Travel tips or local insights relevant to the itinerary.
----
Repeat exactly this structured format for every single day of the trip.
User’s Trip Details to Strictly Follow:
- **Destination:** ${tripData.destination}
- **Travel Dates:** ${tripData.startDate} to ${tripData.endDate} (Provide itinerary for every day!)
- **Traveling with:** ${tripData.companion}, ${tripData.persons || '1'} person(s)
- **Budget:** ${tripData.budget || 'medium'}
- **Preferred Activities:** ${tripData.activities?.join(', ') || 'no specific activities'}
- **Accommodation Preferences:** ${tripData.accommodation?.join(', ') || 'no specific preferences'}
- **Preferred Location within Destination:** ${tripData.location?.join(', ') || 'no specific location'}
- **Additional Information:** ${tripData.additionalInfo || 'none'}
Maintain a friendly, enthusiastic, and highly personalized tone throughout.
`;

export const getFunFactsPrompt = (destination) => `
Provide 15 highly engaging, unique, and surprising fun facts about ${destination}, tailored for a travel app to captivate and inspire travelers.

Each fact must:
- Start with a **catchy 1–3 word title**, followed by a colon (e.g., "Pink City: ...").
- Use simple language
- Be written in 1–2 exciting, positive sentences.
- Format as a numbered list from 1 to 15 (e.g., "1. Title: fact").

Do not include any introductory text, section headings, or extra formatting beyond the numbered list.
`;
