
import firestore from '@react-native-firebase/firestore'

export const getDocumentData = async (collection, doc) => {
    let found = {}
    await firestore()
        .collection(collection)
        .doc(doc)
        .get()
        .then((doc) => {
            if (doc.exists) {
                found = { ...doc.data() }
            }
        })
    return found
}

export async function saveData(collection, doc, jsonObject, merge = true) {
    await firestore()
        .collection(collection)
        .doc(doc)
        .set(jsonObject, { merge })
        .catch(function (error) {
            console.error('Error writing document: ', error);
        });
    console.log('Document successfully written!');
}

export const DeleteMessages = async (collection, userId) => {
    const messagesRef = firestore().collection(collection).doc(userId).collection('messages');
    const messagesSnapshot = await messagesRef.get();

    const batch = firestore().batch();
    messagesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
};

// 🔹 Trip speichern oder aktualisieren
export const saveTrip = async (userId, tripId, tripData) => {
    try {
        await firestore()
            .collection('users')
            .doc(userId)
            .collection('trips')
            .doc(tripId)
            .set(tripData, { merge: true });

        console.log('Trip gespeichert:', tripId);
    } catch (error) {
        console.error('Fehler beim Speichern des Trips:', error);
    }
};

// 🔹 Alle Trips eines Users abrufen
export const getTrips = async (userId) => {
    try {
        const snapshot = await firestore()
            .collection('users')
            .doc(userId)
            .collection('trips')
            .get();

        let trips = [];
        snapshot.forEach((doc) => {
            trips.push({ id: doc.id, ...doc.data() });
        });

        return trips;
    } catch (error) {
        console.error('Fehler beim Abrufen der Trips:', error);
        return [];
    }
};

// 🔹 Trip löschen
export const deleteTrip = async (userId, tripId) => {
    try {
        await firestore()
            .collection('users')
            .doc(userId)
            .collection('trips')
            .doc(tripId)
            .delete();

        console.log('Trip gelöscht:', tripId);
    } catch (error) {
        console.error('Fehler beim Löschen des Trips:', error);
    }
};
