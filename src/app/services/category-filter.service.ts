import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
 
@Injectable({
  providedIn: 'root'
})
export class CategoryFilterService {
 
  // null = toutes les catégories, number = catégorie filtrée
  private categoryIdSource = new BehaviorSubject<number | null>(null);
 
  categoryId$ = this.categoryIdSource.asObservable();
 
  setCategory(id: number | null): void {
    this.categoryIdSource.next(id);
  }
}