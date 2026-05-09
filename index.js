// --- Imports ---
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Pool } = require('pg'); // PostgreSQL library

// --- Initializations ---
const app = express();
const port = 3000; // Your backend server will run on port 3000

// --- Middleware ---
// These lines let your server accept JSON and requests from a web browser
app.use(cors());
app.use(express.json());

// --- 1. MongoDB Connection (for Posts) ---
// Mongoose is an "ODM" (Object Data Modeler)
const mongoURI = 'mongodb://localhost:27017/myNewsProject';
mongoose.connect(mongoURI)
  .then(() => console.log('✅ Connected to local MongoDB (myNewsProject)'))
  .catch((err) => console.error('❌ Error connecting to MongoDB:', err));

// --- 2. PostgreSQL Connection (for Users) ---
// We use a "Pool" to manage multiple connections efficiently
const pgPool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Check the connection
pgPool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error connecting to PostgreSQL:', err);
  } else {
    console.log('✅ Connected to PostgreSQL at', res.rows[0].now);
  }
});

// --- 3. Define MongoDB Schema (for Posts) ---
const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author_id: { type: Number, required: true }, // This 'links' to the user_id in PostgreSQL
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// A "Model" is a class compiled from the Schema, used to make and find documents
const Post = mongoose.model('Post', postSchema);

// --- 4. API Endpoints (The CRUD Operations) ---

// == USER ENDPOINTS (using SQL) ==

// [CREATE] Register a new user
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    // Note: In a real app, you would HASH the password. We skip for this demo.
    const sqlQuery = `
      INSERT INTO users (username, password_hash)
      VALUES ($1, $2)
      RETURNING user_id, username
    `;
    
    const result = await pgPool.query(sqlQuery, [username, password]);
    console.log('SQL Write OK:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  
  } catch (err) {
    console.error('SQL Error:', err.message);
    res.status(500).json({ error: 'Username may already be taken' });
  }
});

// ⭐️⭐️ START OF NEW LOGIN CODE ⭐️⭐️
// [READ] Login a user
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Use a parameterized query to prevent SQL injection
    const sqlQuery = 'SELECT * FROM users WHERE username = $1';
    const { rows } = await pgPool.query(sqlQuery, [username]);

    // Check if user was found
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // User was found, now check password
    // In a real app, you would compare hashes. Here we compare plain text.
    if (rows[0].password_hash !== password) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Password is correct! Send back user data (without password)
    console.log('SQL Login OK:', rows[0].username);
    res.status(200).json({
      user_id: rows[0].user_id,
      username: rows[0].username
    });

  } catch (err) {
    console.error('SQL Error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});
// ⭐️⭐️ END OF NEW LOGIN CODE ⭐️⭐️

// [READ] Get all users (for testing, not used in app)
app.get('/users', async (req, res) => {
  try {
    const result = await pgPool.query('SELECT user_id, username, registered_at FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// == POST ENDPOINTS (using MongoDB) ==

// [CREATE] Create a new news post
app.post('/posts', async (req, res) => {
  try {
    const { title, content, author_id } = req.body;
    
    // This is the Polyglot Persistence check!
    // Check if author_id (from SQL) is valid before creating a post (in Mongo)
    const userCheck = await pgPool.query('SELECT * FROM users WHERE user_id = $1', [author_id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User (author) not found in SQL database' });
    }
    
    // Create new Mongo document
    const newPost = new Post({
      title,
      content,
      author_id // The "foreign key" link
    });
    
    await newPost.save(); // Save to MongoDB
    console.log('MongoDB Write OK:', newPost);
    res.status(201).json(newPost);
    
  } catch (err) {
    console.error('Mongo Error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// [READ] Get all news posts
app.get('/posts', async (req, res) => {
  try {
    // Find all posts in Mongo, sort by upvotes (descending), then by new (descending)
    const posts = await Post.find().sort({ upvotes: -1, createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// [UPDATE] Upvote a post
app.put('/posts/:id/upvote', async (req, res) => {
  try {
    const postId = req.params.id;
    
    // This is the atomic operator! $inc
    // It's fast and efficient for counters.
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $inc: { upvotes: 1 } }, // $inc atomically increments the field
      { new: true } // This option returns the updated document
    );
    
    if (!updatedPost) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    console.log('MongoDB Update OK:', updatedPost);
    res.json(updatedPost);
    
  } catch (err)
    {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- 5. Start the Server ---
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});