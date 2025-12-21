const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken'); 
const cookieParser = require('cookie-parser'); 
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173'], 
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gpc8o8j.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Verify Token Middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Unauthorized access' });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    const db = client.db('book_courier_db');
    const usersCollection = db.collection('users');
    const booksCollection = db.collection('books');
    const ordersCollection = db.collection('orders');
    const paymentsCollection = db.collection('payments');

    
    // AUTH RELATED API (JWT)
    

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' });

      res.cookie('token', token, {
        httpOnly: true,
        secure: false, 
        sameSite: 'strict'
      })
      .send({ success: true });
    });

    app.post('/logout', async (req, res) => {
      res.clearCookie('token', { maxAge: 0 }).send({ success: true });
    });

    
    // USER'S APIs
    

    app.post('/users', async (req, res) => {
      const user = req.body;
      const existing = await usersCollection.findOne({ email: user.email });
      if (existing) return res.send({ message: 'User already exists' });
      user.role = 'user';
      user.createdAt = new Date();
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email: email });
      res.send(result);
    });

    app.patch('/users/role', async (req, res) => {
      const { email, role } = req.body;
      const result = await usersCollection.updateOne(
        { email },
        { $set: { role } }
      );
      res.send(result);
    });

    
    // BOOKS APIs
    

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

    app.get('/latest-books', async (req, res) => {
      const result = await booksCollection.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
      res.send(result);
    });

    app.get('/books/librarian', async (req, res) => {
      const email = req.query.email;
      const result = await booksCollection.find({ librarianEmail: email }).toArray();
      res.send(result);
    });

    app.patch('/books/:id', async (req, res) => {
      const id = req.params.id;
      const update = req.body;
      delete update._id;
      const result = await booksCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: update }
      );
      res.send(result);
    });

    app.delete('/books/:id', async (req, res) => {
      const id = req.params.id;
      await ordersCollection.deleteMany({ bookId: id });
      const result = await booksCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    
    // ORDERS APIs
    

    app.post('/orders', async (req, res) => {
      const order = req.body;
      order.status = 'pending';
      order.paymentStatus = 'unpaid';
      order.createdAt = new Date();
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    });

    app.get('/orders/user', verifyToken, async (req, res) => {
      const email = req.query.email;
      
      // Authorization Check
      if(req.user.email !== email){
          return res.status(403).send({message: 'forbidden access'});
      }

      const result = await ordersCollection.find({ email: email }).toArray();
      res.send(result);
    });

    app.get('/orders/librarian', async (req, res) => {
      const email = req.query.email;
      const result = await ordersCollection.find({ librarianEmail: email }).toArray();
      res.send(result);
    });

    app.get('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await ordersCollection.findOne(query);
      res.send(result);
    });

    app.patch('/orders/status/:id', async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const result = await ordersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status } }
      );
      res.send(result);
    });

    app.patch('/orders/cancel/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const result = await ordersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: 'cancelled' } }
      );
      res.send(result);
    });

    
    // PAYMENTS APIs
   
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

    console.log('MongoDB Connected Successfully');
  } finally {}
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('BookCourier Backend Running');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});