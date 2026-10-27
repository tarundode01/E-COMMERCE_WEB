import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/premium-ecommerce');
  const cats = await mongoose.connection.db.collection('categories').find({}).toArray();
  const catMap = {};
  cats.forEach(c => {
    catMap[c._id.toString()] = c.name;
  });

  const prods = await mongoose.connection.db.collection('products').find({}).toArray();
  let updated = 0;
  for (const p of prods) {
    if (catMap[p.category]) {
      await mongoose.connection.db.collection('products').updateOne(
        { _id: p._id },
        { $set: { category: catMap[p.category] } }
      );
      updated++;
    }
  }
  console.log(`Updated ${updated} products to clean category names.`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
