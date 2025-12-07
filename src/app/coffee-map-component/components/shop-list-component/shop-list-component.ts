
import { Component, Input } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-shop-list-component',
  imports: [ButtonModule],
  templateUrl: './shop-list-component.html',
  styleUrl: './shop-list-component.css',
  standalone: true,
})
export class ShopListComponent {
  @Input() shops: any[] = [];

  encode(value: string): string {
    return encodeURIComponent(value);
  }
}
