require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Book = require("./models/book");
const Member = require("./models/member");
const Transaction = require("./models/transaction");
const Admin = require("./models/admin");
const User = require("./models/user");
const BookRequest = require("./models/bookRequest");
const path = require("path");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const MONGO_URL = "mongodb://127.0.0.1:27017/library";

main()
  .then(() => console.log("connected to DB"))
  .catch((err) => {
    console.log("DB connection failed:", err);
    process.exit(1);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

// currentPath middleware
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

// Admin auth middleware
const isLoggedIn = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.redirect("/login/admin");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    res.clearCookie("token");
    res.redirect("/login/admin");
  }
};

// User auth middleware
const isUserLoggedIn = (req, res, next) => {
  const token = req.cookies.userToken;
  if (!token) return res.redirect("/user/login");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.clearCookie("userToken");
    res.redirect("/user/login");
  }
};

/* -------- ROOT -------- */
app.get("/", (req, res) => {
  res.redirect("/login");
});

/* -------- LOGIN LANDING -------- */
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

/* -------- ADMIN AUTH -------- */
app.get("/login/admin", (req, res) => {
  res.render("admin-login.ejs");
});

app.post("/login/admin", async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });

    if (!admin) {
      return res.render("admin-login.ejs", { error: "Invalid username or password" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.render("admin-login.ejs", { error: "Invalid username or password" });
    }

    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.cookie("token", token, { httpOnly: true });
    res.redirect("/dashboard");
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/signup", (req, res) => {
  res.render("signup.ejs");
});

app.post("/signup", async (req, res) => {
  try {
    const { username, email, phone, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.render("signup.ejs", { error: "Passwords do not match" });
    }

    const existingUsername = await Admin.findOne({ username });
    if (existingUsername) {
      return res.render("signup.ejs", { error: "Username already taken" });
    }

    const existingEmail = await Admin.findOne({ email });
    if (existingEmail) {
      return res.render("signup.ejs", { error: "Email already registered" });
    }

    const { securityQuestion, securityAnswer } = req.body;
    if (!securityQuestion || !securityAnswer || securityAnswer.trim() === "") {
      return res.render("signup.ejs", { error: "Please set a security question and answer." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedAnswer   = await bcrypt.hash(securityAnswer.trim().toLowerCase(), 10);
    const admin = new Admin({
      username, email, phone,
      password: hashedPassword,
      securityQuestion,
      securityAnswer: hashedAnswer,
    });
    await admin.save();

    res.render("admin-login.ejs", { success: "Account created! Please login." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

/* -------- USER AUTH -------- */
app.get("/user/register", (req, res) => {
  res.render("user/register.ejs");
});

app.post("/user/register", async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.render("user/register.ejs", { error: "Passwords do not match" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.render("user/register.ejs", { error: "Email already registered" });
    }

    const { securityQuestion, securityAnswer } = req.body;
    if (!securityQuestion || !securityAnswer || securityAnswer.trim() === "") {
      return res.render("user/register.ejs", { error: "Please set a security question and answer." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedAnswer   = await bcrypt.hash(securityAnswer.trim().toLowerCase(), 10);

    // Create user
    const user = new User({
      name, email, phone,
      password: hashedPassword,
      securityQuestion,
      securityAnswer: hashedAnswer,
    });
    await user.save();

    // Also create member entry so admin can see them
    const member = new Member({
      name,
      email,
      phone,
      status:        "Active",
      booksBorrowed: 0,
    });
    await member.save();

    res.render("user/login.ejs", { success: "Account created! Please login." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/user/login", (req, res) => {
  res.render("user/login.ejs");
});

app.post("/user/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.render("user/login.ejs", { error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render("user/login.ejs", { error: "Invalid email or password" });
    }

    if (user.status === "Inactive") {
      return res.render("user/login.ejs", { error: "Your account is inactive. Contact admin." });
    }

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.cookie("userToken", token, { httpOnly: true });
    res.redirect("/user/dashboard");
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/user/logout", (req, res) => {
  res.clearCookie("userToken");
  res.redirect("/login");
});

/* -------- BOOKS -------- */
app.get("/books", isLoggedIn, async (req, res) => {
  try {
    const { category, search } = req.query;
    let filter = {};

    if (category && search) {
      filter.category = category;
      filter.$or = [
        { bookName:   { $regex: search, $options: "i" } },
        { authorName: { $regex: search, $options: "i" } },
      ];
    } else if (category) {
      filter.category = category;
    } else if (search) {
      filter.$or = [
        { bookName:   { $regex: search, $options: "i" } },
        { authorName: { $regex: search, $options: "i" } },
      ];
    }

    const books = await Book.find(filter);
    res.render("books/index.ejs", {
      books,
      search:   search   || "",
      category: category || "",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/books/new", isLoggedIn, async (req, res) => {
  try {
    res.render("books/new.ejs");
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/books", isLoggedIn, async (req, res) => {
  try {
    const { bookName, authorName, category, quantity, available } = req.body;
    const newBook = new Book({ bookName, authorName, category, quantity, available });
    await newBook.save();
    res.redirect("/books");
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/books/:id/edit", isLoggedIn, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    res.render("books/edit.ejs", { book });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put("/books/:id", isLoggedIn, async (req, res) => {
  try {
    const { bookName, authorName, category, quantity, available } = req.body;
    await Book.findByIdAndUpdate(req.params.id, { bookName, authorName, category, quantity, available });
    res.redirect("/books");
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/books/:id", isLoggedIn, async (req, res) => {
  try {
    await Book.findByIdAndDelete(req.params.id);
    res.redirect("/books");
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -------- MEMBERS -------- */
app.get("/members", isLoggedIn, async (req, res) => {
  try {
    const { status, search } = req.query;
    let filter = {};

    if (status && search) {
      filter.status = status;
      filter.$or = [
        { name:  { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    } else if (status) {
      filter.status = status;
    } else if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const members = await Member.find(filter);
    res.render("members/index.ejs", {
      members,
      search: search || "",
      status: status || "",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/members/new", isLoggedIn, async (req, res) => {
  try {
    res.render("members/new.ejs");
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/members", isLoggedIn, async (req, res) => {
  try {
    const member = new Member(req.body);
    await member.save();
    res.redirect("/members");
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get("/members/:id/edit", isLoggedIn, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    res.render("members/edit.ejs", { member });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put("/members/:id", isLoggedIn, async (req, res) => {
  try {
    await Member.findByIdAndUpdate(req.params.id, req.body);
    res.redirect("/members");
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/members/:id", isLoggedIn, async (req, res) => {
  try {
    await Member.findByIdAndDelete(req.params.id);
    res.redirect("/members");
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -------- TRANSACTIONS -------- */
app.get("/transactions", isLoggedIn, async (req, res) => {
  try {
    const { status, search } = req.query;
    let filter = {};
    if (status) filter.status = status;

    let transactions = await Transaction.find(filter)
      .populate("book")
      .populate("member");

    if (search) {
      transactions = transactions.filter((t) =>
        (t.book   && t.book.bookName.toLowerCase().includes(search.toLowerCase())) ||
        (t.member && t.member.name.toLowerCase().includes(search.toLowerCase()))
      );
    }

    for (let t of transactions) {
      if (t.status === "Issued" && new Date(t.dueDate) < new Date()) {
        t.status = "Overdue";
        t.fine = Math.floor((new Date() - new Date(t.dueDate)) / (1000 * 60 * 60 * 24)) * 10;
        await t.save();
      }
    }

    res.render("transactions/index.ejs", {
      transactions,
      search: search || "",
      status: status || "",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/transactions/new", isLoggedIn, async (req, res) => {
  try {
    const books   = await Book.find({ available: { $gt: 0 } });
    const members = await Member.find({ status: "Active" });
    res.render("transactions/new.ejs", { books, members });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/transactions", isLoggedIn, async (req, res) => {
  try {
    const { book, member, dueDate } = req.body;
    const transaction = new Transaction({ book, member, dueDate });
    await transaction.save();
    await Book.findByIdAndUpdate(book, { $inc: { available: -1 } });
    await Member.findByIdAndUpdate(member, { $inc: { booksBorrowed: 1 } });
    res.redirect("/transactions");
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put("/transactions/:id/return", isLoggedIn, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    transaction.returnDate = new Date();
    transaction.status = "Returned";

    if (new Date(transaction.dueDate) < new Date()) {
      const days = Math.floor((new Date() - new Date(transaction.dueDate)) / (1000 * 60 * 60 * 24));
      transaction.fine = days * 10;
    }

    await transaction.save();
    await Book.findByIdAndUpdate(transaction.book, { $inc: { available: 1 } });
    await Member.findByIdAndUpdate(transaction.member, { $inc: { booksBorrowed: -1 } });
    res.redirect("/transactions");
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/transactions/:id", isLoggedIn, async (req, res) => {
  try {
    await Transaction.findByIdAndDelete(req.params.id);
    res.redirect("/transactions");
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -------- DASHBOARD -------- */
app.get("/dashboard", isLoggedIn, async (req, res) => {
  try {
    const totalBooks     = await Book.countDocuments();
    const availableBooks = await Book.aggregate([
      { $group: { _id: null, total: { $sum: "$available" } } }
    ]);
    const totalMembers   = await Member.countDocuments();
    const activeLoans    = await Transaction.countDocuments({ status: "Issued" });
    const overdueBooks   = await Transaction.countDocuments({ status: "Overdue" });
    const fineResult     = await Transaction.aggregate([
      { $group: { _id: null, total: { $sum: "$fine" } } }
    ]);

    const recentTransactions = await Transaction.find()
      .populate("book")
      .populate("member")
      .sort({ createdAt: -1 })
      .limit(10);

    res.render("dashboard.ejs", {
      totalBooks,
      availableBooks:  availableBooks[0]?.total || 0,
      totalMembers,
      activeLoans,
      overdueBooks,
      totalFines:      fineResult[0]?.total     || 0,
      recentTransactions,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -------- USER DASHBOARD -------- */
app.get("/user/dashboard", isUserLoggedIn, async (req, res) => {
  try {
    const requests = await BookRequest.find({ user: req.user.id })
      .populate("book")
      .sort({ createdAt: -1 });

    const transactions = await Transaction.find({ member: req.user.id })
      .populate("book")
      .sort({ createdAt: -1 });

    // Calculate total fine
    const totalFine = transactions.reduce((sum, t) => sum + (t.fine || 0), 0);

    res.render("user/dashboard.ejs", {
      user:         req.user,
      requests,
      transactions,
      totalFine,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -------- USER BOOKS -------- */
app.get("/user/books", isUserLoggedIn, async (req, res) => {
  try {
    const { search, category } = req.query;
    let filter = { available: { $gt: 0 } };

    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { bookName:   { $regex: search, $options: "i" } },
        { authorName: { $regex: search, $options: "i" } },
      ];
    }

    const books = await Book.find(filter);
    res.render("user/books.ejs", {
      books,
      user:     req.user,
      search:   search   || "",
      category: category || "",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/user/books/:id/request", isUserLoggedIn, async (req, res) => {
  try {
    const existing = await BookRequest.findOne({
      user:   req.user.id,
      book:   req.params.id,
      status: "Pending",
    });

    if (existing) return res.redirect("/user/books");

    const request = new BookRequest({
      user: req.user.id,
      book: req.params.id,
    });
    await request.save();
    res.redirect("/user/dashboard");
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -------- ADMIN REQUESTS -------- */
app.get("/admin/requests", isLoggedIn, async (req, res) => {
  try {
    const requests = await BookRequest.find()
      .populate("user")
      .populate("book")
      .sort({ createdAt: -1 });

    res.render("admin/requests.ejs", { requests });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put("/admin/requests/:id/approve", isLoggedIn, async (req, res) => {
  try {
    const request = await BookRequest.findById(req.params.id)
      .populate("user")
      .populate("book");

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const transaction = new Transaction({
      book:   request.book._id,
      member: request.user._id,
      dueDate,
    });
    await transaction.save();

    await Book.findByIdAndUpdate(request.book._id, { $inc: { available: -1 } });

    request.status  = "Approved";
    request.dueDate = dueDate;
    await request.save();

    res.redirect("/admin/requests");
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put("/admin/requests/:id/reject", isLoggedIn, async (req, res) => {
  try {
    await BookRequest.findByIdAndUpdate(req.params.id, { status: "Rejected" });
    res.redirect("/admin/requests");
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -------- USER PROFILE -------- */
app.get("/user/profile", isUserLoggedIn, async (req, res) => {
  try {
    const userProfile = await User.findById(req.user.id);
    res.render("user/profile.ejs", { user: req.user, userProfile });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put("/user/profile", isUserLoggedIn, async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const userProfile = await User.findById(req.user.id);

    userProfile.name  = name;
    userProfile.email = email;
    userProfile.phone = phone;

    if (password && password.trim() !== "") {
      userProfile.password = await bcrypt.hash(password, 10);
    }

    await userProfile.save();

    // Update member entry too
    await Member.findOneAndUpdate(
      { email: req.user.email },
      { name, email, phone }
    );

    // Refresh token with new name
    const token = jwt.sign(
      { id: userProfile._id, name: userProfile.name, email: userProfile.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.cookie("userToken", token, { httpOnly: true });

    res.render("user/profile.ejs", {
      user:        { id: userProfile._id, name, email },
      userProfile,
      success:     "Profile updated successfully!",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -------- SECURITY QUESTIONS LIST -------- */
const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What was the name of your primary school?",
  "What city were you born in?",
  "What was your childhood nickname?",
  "What is the name of the street you grew up on?",
  "What was the make of your first car?",
  "What is your oldest sibling's middle name?",
];

/* -------- USER FORGOT PASSWORD (Security Question) -------- */
app.get("/user/forgot-password", (req, res) => {
  res.render("user/forgot-password.ejs", { step: 1 });
});

// Step 1: verify email → show security question
app.post("/user/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user || !user.securityQuestion) {
      return res.render("user/forgot-password.ejs", {
        step: 1,
        error: "No account with that email found, or security question not set.",
      });
    }

    res.render("user/forgot-password.ejs", {
      step: 2,
      email,
      question: user.securityQuestion,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Step 2: verify answer → show reset form
app.post("/user/forgot-password/verify", async (req, res) => {
  try {
    const { email, answer } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.render("user/forgot-password.ejs", { step: 1, error: "Session expired. Try again." });

    const match = await bcrypt.compare(answer.trim().toLowerCase(), user.securityAnswer);
    if (!match) {
      return res.render("user/forgot-password.ejs", {
        step: 2,
        email,
        question: user.securityQuestion,
        error: "Incorrect answer. Please try again.",
      });
    }

    res.render("user/forgot-password.ejs", { step: 3, email });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Step 3: reset password
app.post("/user/forgot-password/reset", async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.render("user/forgot-password.ejs", {
        step: 3, email,
        error: "Passwords do not match.",
      });
    }

    const user = await User.findOne({ email });
    if (!user) return res.render("user/forgot-password.ejs", { step: 1, error: "Session expired. Try again." });

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    res.render("user/login.ejs", { success: "Password reset successful! Please log in." });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* -------- ADMIN FORGOT PASSWORD (Security Question) -------- */
app.get("/admin/forgot-password", (req, res) => {
  res.render("admin-forgot-password.ejs", { step: 1 });
});

app.post("/admin/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin || !admin.securityQuestion) {
      return res.render("admin-forgot-password.ejs", {
        step: 1,
        error: "No admin account with that email found, or security question not set.",
      });
    }

    res.render("admin-forgot-password.ejs", {
      step: 2,
      email,
      question: admin.securityQuestion,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post("/admin/forgot-password/verify", async (req, res) => {
  try {
    const { email, answer } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) return res.render("admin-forgot-password.ejs", { step: 1, error: "Session expired. Try again." });

    const match = await bcrypt.compare(answer.trim().toLowerCase(), admin.securityAnswer);
    if (!match) {
      return res.render("admin-forgot-password.ejs", {
        step: 2,
        email,
        question: admin.securityQuestion,
        error: "Incorrect answer. Please try again.",
      });
    }

    res.render("admin-forgot-password.ejs", { step: 3, email });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post("/admin/forgot-password/reset", async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.render("admin-forgot-password.ejs", {
        step: 3, email,
        error: "Passwords do not match.",
      });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) return res.render("admin-forgot-password.ejs", { step: 1, error: "Session expired. Try again." });

    admin.password = await bcrypt.hash(password, 10);
    await admin.save();

    res.render("admin-login.ejs", { success: "Password reset successful! Please log in." });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* -------- SET SECURITY QUESTION (User) -------- */
app.get("/user/security-question", isUserLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.render("user/security-question.ejs", {
      questions: SECURITY_QUESTIONS,
      currentQuestion: user.securityQuestion || "",
      success: undefined, error: undefined,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post("/user/security-question", isUserLoggedIn, async (req, res) => {
  try {
    const { question, answer } = req.body;
    if (!question || !answer || answer.trim() === "") {
      return res.render("user/security-question.ejs", {
        questions: SECURITY_QUESTIONS,
        currentQuestion: question,
        error: "Please select a question and provide an answer.",
      });
    }

    const user = await User.findById(req.user.id);
    user.securityQuestion = question;
    user.securityAnswer   = await bcrypt.hash(answer.trim().toLowerCase(), 10);
    await user.save();

    res.render("user/security-question.ejs", {
      questions: SECURITY_QUESTIONS,
      currentQuestion: question,
      success: "Security question saved successfully!",
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* -------- SET SECURITY QUESTION (Admin — inside signup) -------- */
// Security question is now part of the signup form
// Override the existing signup to also save securityQuestion + securityAnswer

app.listen(8080, () => {
  console.log("server is listening to port 8080");
});

