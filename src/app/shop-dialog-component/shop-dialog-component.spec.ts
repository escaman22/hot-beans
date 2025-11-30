import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShopDialogComponent } from './shop-dialog-component';

describe('ShopDialogComponent', () => {
  let component: ShopDialogComponent;
  let fixture: ComponentFixture<ShopDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShopDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShopDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
