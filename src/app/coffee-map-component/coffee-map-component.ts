import { CommonModule } from '@angular/common';
import { Component, inject, NgZone, ViewChild } from '@angular/core';
import { GoogleMap, GoogleMapsModule } from '@angular/google-maps';
import { DialogService } from 'primeng/dynamicdialog';
import { ShopDialogComponent } from '../shop-dialog-component/shop-dialog-component';
import { ShopService } from '../services/shop.service';
import { FormsModule } from '@angular/forms';
import { SelectButton } from 'primeng/selectbutton';
import { ShopListComponent } from './components/shop-list-component/shop-list-component';

@Component({
  selector: 'app-coffee-map-component',
  imports: [GoogleMapsModule, CommonModule, FormsModule, SelectButton, ShopListComponent],
  templateUrl: './coffee-map-component.html',
  styleUrl: './coffee-map-component.css',
  providers: [DialogService],
  standalone: true,
})
export class CoffeeMapComponent {
  center: google.maps.LatLngLiteral = { lat: 37.7749, lng: -122.4194 }; // Example: San Francisco
  markers: google.maps.marker.AdvancedMarkerElement[] = [];
  userMarker!: google.maps.MarkerOptions;
  initialCenter = { ...this.center };
  showSearchAreaBtn = false;
  reviews: any[] = [];
  shopMapping: Map<string, any> = new Map();

  viewOptions = [
    { label: 'Map', value: 'map', icon: 'pi pi-map' },
    { label: 'List', value: 'list', icon: 'pi pi-list' },
  ];
  currentView: 'list' | 'map' = 'map';
  isMapReady = false;

  minimalMapStyle: google.maps.MapTypeStyle[] = [
    {
      featureType: 'all',
      elementType: 'geometry',
      stylers: [{ color: '#1e1e1e' }],
    },
    {
      featureType: 'all',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#cfcfcf' }],
    },
    {
      featureType: 'all',
      elementType: 'labels.text.stroke',
      stylers: [{ color: '#1e1e1e' }],
    },
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#2c2c2c' }],
    },
    {
      featureType: 'road',
      elementType: 'labels.icon',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'transit',
      elementType: 'all',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#121212' }],
    },
  ];

  mapStyle = [
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#e9e9e9' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#ffffff' }],
    },
    // ... rest of your JSON styling
  ];

  mapOptions: google.maps.MapOptions = {
    clickableIcons: false,
    styles: this.minimalMapStyle,
  };
  shops: any[] = [];

  constructor(
    private dialogService: DialogService,
    private ngZone: NgZone,
    private shopService: ShopService
  ) {}

  async ngOnInit() {
    await this.setUserLocation();
    await this.onSearchThisArea();
    await this.getLocalReviews();
    await this.loadCoffeeShops();
  }

  async getLocalReviews() {
    this.reviews = await this.shopService.getNearbyBusinesses(
      this.center.lat,
      this.center.lng,
      50, // 5 km radius
      20 // max 20 results
    );
    console.log('Nearby reviews from Firestore:', this.reviews);
    this.shopMapping.clear();
    for (const review of this.reviews) {
      this.shopMapping.set(review.shopId, review);
    }
    console.log('Shop mapping:', this.shopMapping);
  }

  async setUserLocation(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (!navigator.geolocation) {
        console.warn('Geolocation unavailable. Using fallback location.');
        this.center = { lat: 34.0549, lng: 118.2426 };
        return;
      }

      await navigator.geolocation.getCurrentPosition(async (position) => {
        this.center = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        this.userMarker = {
          position: this.center,
          title: 'You are here',
          icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        };
        this.initialCenter = { ...this.center };
        resolve();
      });
    });
  }

  onViewChange() {
    if (this.currentView === 'map' && !this.isMapReady) {
      this.isMapReady = true; // Lazy load map only once
    }
  }

  ngAfterViewInit() {
    // Listen for map drag/move
    this.mapComponent.googleMap!.addListener('center_changed', () => {
      this.ngZone.run(() => {
        const mapCenter = this.mapComponent.googleMap!.getCenter();
        if (mapCenter) {
          const distance = this.calculateDistance(
            this.initialCenter.lat,
            this.initialCenter.lng,
            mapCenter.lat(),
            mapCenter.lng()
          );
          this.showSearchAreaBtn = distance > 1; // in km
        }
      });
    });
  }

  async loadCoffeeShops() {
    const { PlacesService } = (await google.maps.importLibrary(
      'places'
    )) as google.maps.PlacesLibrary;
    const service = new PlacesService(document.createElement('div'));

    const request: google.maps.places.PlaceSearchRequest = {
      location: this.center,
      radius: 2000, // 2 km radius
      keyword: 'coffee shop',
    };

    service.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        this.clearMarkers();

        this.ngZone.run(() => {
          for (const place of results) {
            this.shops.push(place);
            if (!place.geometry?.location) continue;

            const content = this.createCustomMarkerContent(place);

            let marker = new google.maps.marker.AdvancedMarkerElement({
              map: this.map,
              position: place.geometry.location,
              content, // the HTML element
            });

            marker.addListener('click', () => {
              this.openShopDialog(place);
            });
            // store the marker
            this.markers.push(marker);
          }
          // this.markers = results.map(
          //   (place) =>
          //     new google.maps.marker.AdvancedMarkerElement({
          //       position: place.geometry?.location?.toJSON(),
          //       title: place.name,
          //       // iconUrl: '../../assets/hotbean2.png',
          //       // hours: place.opening_hours?.isOpen() ? 'Open' : 'Closed',
          //       // address: place.vicinity,
          //       // placeId: place.place_id,
          //       // label: place.name,
          //       content,
          //     })
          // );
        });
      }
    });
  }

  clearMarkers() {
    this.markers.forEach((marker) => (marker.map = null));
    this.markers = [];
  }

  // Called when user clicks "Search this area"
  async onSearchThisArea() {
    const mapCenter = this.mapComponent.googleMap!.getCenter();
    if (mapCenter) {
      this.center = { lat: mapCenter.lat(), lng: mapCenter.lng() };
      this.showSearchAreaBtn = false;

      // Trigger your coffee shop search here
      await this.getLocalReviews();
      await this.loadCoffeeShops();
    }
  }

  async openShopDialog(shopMarker: google.maps.places.PlaceResult) {
    console.log('Opening dialog for shop:', shopMarker.name);
    const screenWidth = window.innerWidth;

    let dialogWidth = '50%'; // default for desktop
    if (screenWidth <= 1024) {
      // tablet & mobile
      dialogWidth = '90%';
    }
    const dialogRef = this.dialogService.open(ShopDialogComponent, {
      width: dialogWidth,
      data: shopMarker,
      modal: true,
      dismissableMask: true, // 👈 allows closing by clicking outside
      closable: true,
      styleClass: 'coffee-dialog',
      showHeader: false,
      style: { backgroundColor: '#2c2c2c' },
    });

    dialogRef!.onClose.subscribe(async () => {
      await this.getLocalReviews();
      await this.loadCoffeeShops();
    });
  }

  createCustomMarkerContent(place: google.maps.places.PlaceResult): HTMLElement {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '6px';
    container.style.padding = '4px 8px';
    container.style.background = 'rgba(33, 37, 41, 0.95)';
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    container.style.fontSize = '12px';
    container.style.fontWeight = 'bold';

    // coffee cup icon using emoji
    const icon = document.createElement('span');
    icon.textContent = '☕'; // coffee cup emoji
    icon.style.fontSize = '20px';
    icon.style.color = '#ffdd59';
    if (this.shopMapping.has(place.place_id!)) {
      const rating = this.shopMapping.get(place.place_id!).avgRating.toFixed(1);
      icon.textContent = rating + '🔥'; // fire emoji
    }

    // label text
    const label = document.createElement('span');
    label.textContent = place.name!;
    label.style.color = '#ffdd59';

    container.appendChild(icon);
    container.appendChild(label);

    return container;
  }

  // Haversine formula to calculate distance in km
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  @ViewChild(GoogleMap) mapComponent!: GoogleMap;

  get map() {
    return this.mapComponent.googleMap!;
  }
}
