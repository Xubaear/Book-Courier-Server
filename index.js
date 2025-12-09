const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 3000;

const { MongoClient, ServerApiVersion } = require('mongodb');

// middleware
app.use(express.json());
app.use(cors());

// MongoDB connection string
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gpc8o8j.mongodb.net/?appName=Cluster0`;

// Create Mongo Client
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

   

    app.get('/parcels', async (req, res) => {
      const result = await parcelsCollection.find().toArray();
      res.send(result);
    });

    app.post('/parcels', async (req, res) => {
      const parcel = req.body;
      const result = await parcelsCollection.insertOne(parcel);
      res.send(result);
    });

    

  

// Add a new book
app.post('/books', async (req, res) => {
  const book = req.body;
  book.createdAt = new Date(); 
  const result = await booksCollection.insertOne(book);
  res.send(result);
});

// Get ALL books
app.get('/books', async (req, res) => {
  const result = await booksCollection.find().toArray();
  res.send(result);
});

// Get latest 4–6 books
app.get('/books/latest', async (req, res) => {
  const latestBooks = await booksCollection
    .find()
    .sort({ createdAt: -1 })
    .limit(6)
    .toArray();

  res.send(latestBooks);
});


    // Ping DB
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB Successfully!");

  } finally {
    // Do not close client — keeps server alive
    // await client.close();
  }
}

run().catch(console.dir);

// Root route
app.get('/', (req, res) => {
  res.send('BookCourier Backend Running!');
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
