const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'imdiyo_airline',
  });

  try {
    console.log('Attempting to connect to database...');
    console.log(`Host: ${client.host}`);
    console.log(`Port: ${client.port}`);
    console.log(`User: ${client.user}`);
    console.log(`Database: ${client.database}`);
    
    await client.connect();
    console.log('✅ Connected to database successfully');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'src/database/migrations/001-initial-schema-and-data.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found at: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running initial migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration completed successfully!');

    // Optional: Run verification queries
    const verificationQueries = [
      "SELECT 'Seat Classes:' as info, COUNT(*) as count FROM seat_classes",
      "SELECT 'Users:' as info, COUNT(*) as count FROM users",
      "SELECT 'Flights:' as info, COUNT(*) as count FROM flights",
      "SELECT 'Seats:' as info, COUNT(*) as count FROM seats",
      "SELECT 'Fares:' as info, COUNT(*) as count FROM fares",
      "SELECT 'Bookings:' as info, COUNT(*) as count FROM bookings"
    ];

    console.log('\n📊 Database Statistics:');
    for (const query of verificationQueries) {
      const result = await client.query(query);
      console.log(`${result.rows[0].info} ${result.rows[0].count}`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.error('\n🔧 Troubleshooting Tips:');
      console.error('1. Check your PostgreSQL username and password');
      console.error('2. Make sure PostgreSQL is running');
      console.error('3. Verify your .env file has the correct DB_USERNAME and DB_PASSWORD');
      console.error('4. Try connecting with psql: psql -h localhost -U postgres -d imdiyo_airline');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.error('\n🔧 Database does not exist. Create it first:');
      console.error('1. Connect to PostgreSQL: psql -h localhost -U postgres');
      console.error('2. Create database: CREATE DATABASE imdiyo_airline;');
    } else if (error.message.includes('connect')) {
      console.error('\n🔧 Connection failed. Check:');
      console.error('1. PostgreSQL service is running');
      console.error('2. Host and port are correct');
      console.error('3. Firewall settings allow the connection');
    }
    
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed');
  }
}

// Run the migration
runMigration(); 