const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 3000;

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb'); 

// middleware
app.use(express.json());
app.use(cors());

// MongoDB connection string
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gpc8o8j.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    const db = client.db('book_courier_db');

    // Collections
    const parcelsCollection = db.collection('parcels');
    const booksCollection = db.collection('books');
    
    // --- NEW: Orders Collection Add Kora Hoise ---
    const ordersCollection = db.collection('orders');

    // Parcels API
    app.get('/parcels', async (req, res) => {
      const result = await parcelsCollection.find().toArray();
      res.send(result);
    });

    app.post('/parcels', async (req, res) => {
      const parcel = req.body;
      const result = await parcelsCollection.insertOne(parcel);
      res.send(result);
    });

    // Books API
    app.post('/books', async (req, res) => {
      const book = req.body;
      book.createdAt = new Date(); 
      const result = await booksCollection.insertOne(book);
      res.send(result);
    });

    app.get('/books', async (req, res) => {
      const result = await booksCollection.find().toArray();
      res.send(result);
    });

    app.get('/books/latest', async (req, res) => {
      const latestBooks = await booksCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
      res.send(latestBooks);
    });

    // --- NEW: Order Place API ---
    app.post('/orders', async (req, res) => {
        const order = req.body;
        
        // Default Status set kora hoise
        order.status = 'pending';
        order.paymentStatus = 'unpaid';
        order.createdAt = new Date();
        
        const result = await ordersCollection.insertOne(order);
        res.send(result);
    });

    // Ping DB
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB Successfully!");

  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('BookCourier Backend Running!');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});