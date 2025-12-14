const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

    const usersCollection = db.collection('users');
    const booksCollection = db.collection('books');
    const ordersCollection = db.collection('orders');
    const paymentsCollection = db.collection('payments');

    /* ================= USERS ================= */

    // Save user (default role = user)
    app.post('/users', async (req, res) => {
      const user = req.body;
      const existing = await usersCollection.findOne({ email: user.email });
      if (existing) return res.send({ message: 'User already exists' });

      user.role = 'user';
      user.createdAt = new Date();
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Get all users (admin)
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // // Update role (admin)
    // app.patch('/users/role', async (req, res) => {
    //   const { email, role } = req.body;
    //   const result = await usersCollection.updateOne(
    //     { email },
    //     { $set: { role } }
    //   );
    //   res.send(result);
    // });

    /* ================= BOOKS ================= */

    // Add book (librarian)
    app.post('/books', async (req, res) => {
      const book = req.body;
      book.createdAt = new Date();
      const result = await booksCollection.insertOne(book);
      res.send(result);
    });

    // Get published books (public)
    app.get('/books', async (req, res) => {
      const result = await booksCollection.find({ status: 'published' }).toArray();
      res.send(result);
    });

    // Librarian books
    app.get('/books/librarian', async (req, res) => {
      const email = req.query.email;
      const result = await booksCollection.find({ librarianEmail: email }).toArray();
      res.send(result);
    });

    // Update book
    app.patch('/books/:id', async (req, res) => {
      const id = req.params.id;
      const update = req.body;
      const result = await booksCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: update }
      );
      res.send(result);
    });

    // Delete book (admin) + cascade orders
    app.delete('/books/:id', async (req, res) => {
      const id = req.params.id;
      await ordersCollection.deleteMany({ bookId: id });
      const result = await booksCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    /* ================= ORDERS ================= */

    // Place order (user)
    app.post('/orders', async (req, res) => {
      const order = req.body;
      order.status = 'pending';
      order.paymentStatus = 'unpaid';
      order.createdAt = new Date();
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    });

    // User orders
    app.get('/orders/user', async (req, res) => {
      const email = req.query.email;
      const result = await ordersCollection.find({ userEmail: email }).toArray();
      res.send(result);
    });

    // Librarian orders
    app.get('/orders/librarian', async (req, res) => {
      const email = req.query.email;
      const result = await ordersCollection.find({ librarianEmail: email }).toArray();
      res.send(result);
    });

    // Update order status (librarian)
    app.patch('/orders/status/:id', async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const result = await ordersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status } }
      );
      res.send(result);
    });

    // Cancel order (user/librarian)
    app.patch('/orders/cancel/:id', async (req, res) => {
      const id = req.params.id;
      const result = await ordersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: 'cancelled' } }
      );
      res.send(result);
    });

    /* ================= PAYMENTS (FAKE) ================= */

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      payment.createdAt = new Date();

      await ordersCollection.updateOne(
        { _id: new ObjectId(payment.orderId) },
        { $set: { paymentStatus: 'paid' } }
      );

      const result = await paymentsCollection.insertOne(payment);
      res.send(result);
    });

    app.get('/payments', async (req, res) => {
      const email = req.query.email;
      const result = await paymentsCollection.find({ userEmail: email }).toArray();
      res.send(result);
    });

    console.log(' MongoDB Connected');
  } finally {}
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('BookCourier Backend Running');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
