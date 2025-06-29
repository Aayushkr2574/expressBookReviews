const express = require('express');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const app = express();
const books = require("./booksdb.js");

let users = [];

const isValid = (username) => {
  return users.some(user => user.username === username);
};

const authenticatedUser = (username, password) => {
  return users.some(user => user.username === username && user.password === password);
};

app.use(express.json());
app.use("/customer", session({ secret: "fingerprint_customer", resave: true, saveUninitialized: true }));

// Middleware for authenticated routes
app.use("/customer/auth/*", function auth(req, res, next) {
  if (req.session.authorization) {
    const token = req.session.authorization['accessToken'];
    jwt.verify(token, "access", (err, user) => {
      if (!err) {
        req.user = user;
        next();
      } else {
        return res.status(403).json({ message: "User not authenticated" });
      }
    });
  } else {
    return res.status(403).json({ message: "User not logged in" });
  }
});

// Register
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Username and password required" });
  if (isValid(username)) return res.status(409).json({ message: "Username already exists" });

  users.push({ username, password });
  return res.status(200).json({ message: "User registered successfully" });
});

// Login
app.post("/customer/login", (req, res) => {
  const { username, password } = req.body;
  if (!authenticatedUser(username, password)) return res.status(401).json({ message: "Invalid credentials" });

  const accessToken = jwt.sign({ username }, "access", { expiresIn: 3600 });
  req.session.authorization = { accessToken };
  return res.status(200).json({ message: "Logged in successfully" });
});

// Add/Modify Review
app.put("/customer/auth/review/:isbn", (req, res) => {
  const { review } = req.body;
  const { isbn } = req.params;
  const username = req.user.username;

  if (books[isbn]) {
    books[isbn].reviews[username] = review;
    return res.status(200).json({ message: "Review added/modified successfully" });
  }
  return res.status(404).json({ message: "Book not found" });
});

// Delete Review
app.delete("/customer/auth/review/:isbn", (req, res) => {
  const { isbn } = req.params;
  const username = req.user.username;

  if (books[isbn] && books[isbn].reviews[username]) {
    delete books[isbn].reviews[username];
    return res.status(200).json({ message: "Review deleted successfully" });
  }
  return res.status(404).json({ message: "Review not found for user or book not found" });
});

// -------------------- Public Routes --------------------

const public_users = express.Router();

// Get all books
public_users.get('/', (req, res) => {
  res.status(200).json(books);
});

// Get book by ISBN
public_users.get('/isbn/:isbn', (req, res) => {
  const { isbn } = req.params;
  res.status(200).json(books[isbn] || { message: "Book not found" });
});

// Get books by author
public_users.get('/author/:author', (req, res) => {
  const { author } = req.params;
  const results = Object.entries(books).filter(([id, book]) => book.author.toLowerCase() === author.toLowerCase());
  res.status(200).json(Object.fromEntries(results));
});

// Get books by title
public_users.get('/title/:title', (req, res) => {
  const { title } = req.params;
  const results = Object.entries(books).filter(([id, book]) => book.title.toLowerCase() === title.toLowerCase());
  res.status(200).json(Object.fromEntries(results));
});

// Get reviews by ISBN
public_users.get('/review/:isbn', (req, res) => {
  const { isbn } = req.params;
  res.status(200).json(books[isbn]?.reviews || { message: "Book not found" });
});

app.use("/", public_users);

// -------------------- Server --------------------

const PORT = 5000;
app.listen(PORT, () => console.log("Server is running on port", PORT));
