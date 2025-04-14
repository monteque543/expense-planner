// Script to update categories with emojis
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { config } from 'dotenv';

config();
neonConfig.webSocketConstructor = ws;

async function addEmojisToCategories() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
  });

  const categoryEmojis = [
    { id: 1, name: "Bills", emoji: "💸" },
    { id: 2, name: "Food", emoji: "🍽️" },
    { id: 3, name: "Transportation", emoji: "🚗" },
    { id: 4, name: "Entertainment", emoji: "🎬" },
    { id: 5, name: "Shopping", emoji: "🛍️" },
    { id: 6, name: "Health", emoji: "⚕️" },
    { id: 7, name: "Travel", emoji: "✈️" },
    { id: 8, name: "Beauty", emoji: "💅" },
    { id: 9, name: "IDOinDenmark", emoji: "🇩🇰" },
    { id: 10, name: "Courses", emoji: "📚" },
    { id: 11, name: "Subscription", emoji: "🔄" },
    { id: 12, name: "Other", emoji: "📦" },
    { id: 13, name: "Income", emoji: "💰" },
    { id: 14, name: "Gift", emoji: "🎁" },
    { id: 15, name: "Fast Food", emoji: "🍔" }
  ];

  try {
    console.log('Starting emoji updates...');
    
    for (const category of categoryEmojis) {
      const result = await pool.query(
        'UPDATE categories SET emoji = $1 WHERE id = $2 RETURNING *',
        [category.emoji, category.id]
      );
      
      if (result.rows.length > 0) {
        console.log(`Updated ${category.name} with emoji ${category.emoji}`);
      } else {
        console.log(`No category found with id ${category.id}`);
      }
    }
    
    console.log('Emoji updates completed!');
  } catch (error) {
    console.error('Error updating categories:', error);
  } finally {
    await pool.end();
  }
}

addEmojisToCategories();