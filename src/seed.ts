/**
 * Seed script: creates 2 companies and 3 users for local dev/testing.
 * Run: npx ts-node src/seed.ts
 */
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm-email-tasks';

const CompanySchema = new mongoose.Schema({ slug: String, name: String, isActive: Boolean });
const UserSchema = new mongoose.Schema({ companyId: mongoose.Types.ObjectId, name: String, emails: [String], isActive: Boolean });

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const Company = mongoose.model('Company', CompanySchema);
  const User = mongoose.model('User', UserSchema);

  await Company.deleteMany({});
  await User.deleteMany({});

  // Company 1: Acme Corp
  const acme = await Company.create({ slug: 'acme-corp', name: 'Acme Corp', isActive: true });

  // Company 2: Globex
  const globex = await Company.create({ slug: 'globex', name: 'Globex Inc', isActive: true });

  // Users for Acme
  const alice = await User.create({
    companyId: acme._id,
    name: 'Alice Johnson',
    emails: ['alice@acme.com', 'alice.johnson@acme.com'],
    isActive: true,
  });

  const bob = await User.create({
    companyId: acme._id,
    name: 'Bob Smith',
    emails: ['bob@acme.com'],
    isActive: true,
  });

  // User for Globex
  const carol = await User.create({
    companyId: globex._id,
    name: 'Carol White',
    emails: ['carol@globex.com'],
    isActive: true,
  });

  console.log('\n✅ Seed complete!\n');
  console.log('--- Companies ---');
  console.log(`Acme Corp:  _id=${acme._id}  slug=acme-corp`);
  console.log(`Globex Inc: _id=${globex._id}  slug=globex`);
  console.log('\n--- Users ---');
  console.log(`Alice (Acme):  _id=${alice._id}  emails: alice@acme.com`);
  console.log(`Bob   (Acme):  _id=${bob._id}  emails: bob@acme.com`);
  console.log(`Carol (Globex): _id=${carol._id}  emails: carol@globex.com`);
  console.log('\nUse these IDs in X-User-Id header when testing GET /tasks');

  await mongoose.disconnect();
}

seed().catch(console.error);
