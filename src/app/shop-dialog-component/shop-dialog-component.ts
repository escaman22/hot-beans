import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ShopService } from '../services/shop.service';

@Component({
  selector: 'app-shop-dialog-component',
  imports: [CommonModule],
  templateUrl: './shop-dialog-component.html',
  styleUrl: './shop-dialog-component.css',
  standalone: true,
})
export class ShopDialogComponent {
  shop: google.maps.places.PlaceResult;
  rating: number = 0; // local rating value (0–10)
  isPopping = false;
  hover = 0; // hover preview
  beans = Array(5); // 5 beans for rating

  constructor(
    public config: DynamicDialogConfig,
    private shopService: ShopService,
    public ref: DynamicDialogRef
  ) {
    this.shop = this.config.data;
  }

  onImageClick() {
    if (this.isPopping) return; // prevent double-click issues
    this.isPopping = true;

    // Automatically reset after animation duration (200ms)
    setTimeout(() => {
      this.isPopping = false;
    }, 200);
  }

  // User clicks a bean
  setRating(value: number) {
    this.rating = value;
    this.hover = value;
  }

  // User hovers over a bean
  hoverRating(value: number) {
    this.hover = value;
  }

  // Submit the rating
  async submitRating() {
    console.log(`Submitted ${this.rating} beans for`, this.shop.name);
    // Call your API here to save rating
    await this.shopService.submitRating({
      name: this.shop.name!,
      lat: this.shop.geometry!.location!.lat(),
      lng: this.shop.geometry!.location!.lng(),
      shopId: this.shop.place_id!,
      rating: this.rating,
    });

    // Optionally, close the dialog or give feedback
    this.ref.close();
  }

  getDirectionsLink(shop: google.maps.places.PlaceResult): string {
    if (!shop.geometry || !shop.geometry.location) return '#';
    const lat = shop.geometry.location.lat();
    const lng = shop.geometry.location.lng();
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
}
