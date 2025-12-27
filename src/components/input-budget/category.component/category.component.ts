import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-category',
  imports: [FormsModule],
  templateUrl: './category.component.html',
  styleUrl: './category.component.scss',
})
export class CategoryComponent {
  newCategory = '';
  readonly categories = model<string[]>([]);
  readonly onCategoriesChange = output<string[]>();

  addCategory() {
    const cat = this.newCategory.trim();
    if (cat && !this.categories().includes(cat)) {
      this.categories.set([...this.categories(), cat]);
      this.onCategoriesChange.emit(this.categories());
    }
    this.newCategory = '';
  }

  removeCategory(cat: string) {
    this.categories.set(this.categories().filter(c => c !== cat));
    this.onCategoriesChange.emit(this.categories());
  }
}
