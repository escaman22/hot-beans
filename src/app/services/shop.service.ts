import { inject, Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  doc,
  Firestore,
  GeoPoint,
  getDocs,
  query,
  runTransaction,
  setDoc,
  where,
} from '@angular/fire/firestore';
import { geohashForLocation, geohashQueryBounds, distanceBetween } from 'geofire-common';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ShopService {
  firestore: Firestore = inject(Firestore);
  reviewsCollection = collection(this.firestore, 'reviews');
  items$: Observable<any[]> = collectionData<any>(this.reviewsCollection);

  // ---------------------------------------------
  // SAVE A BUSINESS (WITH GEOHASH)
  // ---------------------------------------------
  async submitRating(data: {
    name: string;
    lat: number;
    lng: number;
    shopId: string;
    rating: number;
  }) {
    const businessRef = doc(this.firestore, `reviews/${data.shopId}`);
    const geohash = geohashForLocation([data.lat, data.lng]);

    // Use transaction to avoid race conditions
    await runTransaction(this.firestore, async (transaction) => {
      const docSnap = await transaction.get(businessRef);

      if (!docSnap.exists()) {
        // If the document doesn't exist, create it with the first rating
        transaction.set(businessRef, {
          name: data.name,
          shopId: data.shopId,
          totalScore: data.rating,
          lat: data.lat,
          lng: data.lng,
          numRatings: 1,
          avgRating: data.rating,
          geohash,
        });
      } else {
        // Update the running total and average
        const firebaseData = docSnap.data() as any;
        const newTotal = (firebaseData.totalScore || 0) + data.rating;
        const newCount = (firebaseData.numRatings || 0) + 1;
        const newAvg = newTotal / newCount;

        transaction.update(businessRef, {
          totalScore: newTotal,
          numRatings: newCount,
          avgRating: newAvg,
        });
      }
    });
  }
  // ---------------------------------------------
  // QUERY NEAREST BUSINESSES
  // ---------------------------------------------
  async getNearbyBusinesses(lat: number, lng: number, radiusKm: number, maxResults = 10) {
    const center: [number, number] = [lat, lng];
    const bounds = geohashQueryBounds(center, radiusKm * 1000);
    const queries = [];
    for (const b of bounds) {
      queries.push(
        getDocs(
          query(this.reviewsCollection, where('geohash', '>=', b[0]), where('geohash', '<=', b[1]))
        )
      );
    }
    // Run all bounding queries in parallel
    const snapshots = await Promise.all(queries);
    const matchingDocs: any[] = [];
    snapshots.forEach((snap) => {
      snap.docs.forEach((doc) => {
        const data = doc.data() as any;
        const distance = distanceBetween(center, [data.lat, data.lng]);
        if (distance <= radiusKm) {
          matchingDocs.push({
            id: doc.id,
            distanceKm: distance,
            ...data,
          });
        }
      });
    });
    // Sort by distance (closest first)
    matchingDocs.sort((a, b) => a.distanceKm - b.distanceKm);
    // Limit results
    return matchingDocs.slice(0, maxResults);
  }
}
