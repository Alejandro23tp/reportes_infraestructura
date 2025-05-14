import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HeaderVisibilityService {
  private _isHeaderVisible = new BehaviorSubject<boolean>(true);
  
  isHeaderVisible$ = this._isHeaderVisible.asObservable();

  hideHeader() {
    this._isHeaderVisible.next(false);
  }

  showHeader() {
    this._isHeaderVisible.next(true);
  }
}
