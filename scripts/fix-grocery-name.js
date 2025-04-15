// Simple script to fix the typo in the "Grocerries" category name to "Groceries"
import { db } from '../server/db.js';
import { categories, eq } from '../shared/schema.js';

async function fixGroceryName() {
  try {
    // Find the category with the typo
    const [groceryCategory] = await db.select()
      .from(categories)
      .where(eq(categories.name, 'Grocerries'));
    
    if (!groceryCategory) {
      console.log('No category with the name "Grocerries" found');
      return;
    }
    
    // Update the category name
    const [updatedCategory] = await db.update(categories)
      .set({ name: 'Groceries' })
      .where(eq(categories.id, groceryCategory.id))
      .returning();
    
    console.log('Successfully updated category name from "Grocerries" to "Groceries"');
    console.log('Updated category:', updatedCategory);
  } catch (error) {
    console.error('Error updating category name:', error);
  } finally {
    process.exit(0);
  }
}

fixGroceryName();