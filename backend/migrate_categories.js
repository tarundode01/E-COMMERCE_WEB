import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './models/Category.js';

dotenv.config();

async function migrate() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/premium-ecommerce';
  await mongoose.connect(mongoUri);

  const categories = await Category.find();
  console.log(`Found ${categories.length} categories to check/migrate...`);

  for (const cat of categories) {
    let modified = false;
    if (!cat.slug) {
      cat.slug = await Category.generateUniqueSlug(cat.name, cat._id);
      modified = true;
    }
    if (!cat.status) {
      cat.status = 'active';
      cat.isActive = true;
      modified = true;
    }
    if (modified) {
      await cat.save();
      console.log(`  ✓ Updated Category: ${cat.name} -> slug: "${cat.slug}", status: "${cat.status}"`);
    } else {
      console.log(`  - Category already up to date: ${cat.name} (${cat.slug})`);
    }
  }

  await mongoose.disconnect();
  console.log('Migration complete!');
}

migrate();
