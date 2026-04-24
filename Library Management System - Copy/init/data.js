// init/data.js

// Sample Books
const sampleBooks = [
  {
    bookName: "Rich Dad Poor Dad",
    authorName: "Robert Kiyosaki",
    category: "Finance",
    quantity: 3,
    available: 2
  },
  {
    bookName: "JavaScript Basics",
    authorName: "John Doe",
    category: "Programming",
    quantity: 4,
    available: 4
  },
  {
    bookName: "Data Structures",
    authorName: "Mark Allen",
    category: "Education",
    quantity: 2,
    available: 1
  },
  {
    bookName: "Wings of Fire",
    authorName: "A.P.J Abdul Kalam",
    category: "Biography",
    quantity: 6,
    available: 6
  }
];

// Sample Members
const sampleMembers = [
  {
    name: "Zeeshan Mansoori",
    email: "zeeshan@gmail.com",
    phone: "9876543210",
    status: "Active",
    booksBorrowed: 2
  },
  {
    name: "Ayaan Khan",
    email: "ayaan@gmail.com",
    phone: "9876501234",
    status: "Active",
    booksBorrowed: 1
  },
  {
    name: "Sara Ali",
    email: "sara@gmail.com",
    phone: "9988776655",
    status: "Inactive",
    booksBorrowed: 0
  },
  {
    name: "Rahul Sharma",
    email: "rahul@gmail.com",
    phone: "9123456789",
    status: "Active",
    booksBorrowed: 3
  },
  {
    name: "Priya Verma",
    email: "priya@gmail.com",
    phone: "9012345678",
    status: "Active",
    booksBorrowed: 1
  },
  {
    name: "Arjun Patel",
    email: "arjun@gmail.com",
    phone: "8899776655",
    status: "Inactive",
    booksBorrowed: 0
  }
];

// Sample Transactions (book/member linked in init/index.js)
const sampleTransactions = [
  {
    issueDate:  new Date("2025-04-10"),
    dueDate:    new Date("2026-05-24"),   // future date → stays Issued
    returnDate: null,
    fine:       0,
    status:     "Issued",
  },
  {
    issueDate:  new Date("2025-04-01"),
    dueDate:    new Date("2026-05-15"),   // future date → stays Issued
    returnDate: null,
    fine:       0,
    status:     "Issued",
  },
  {
    issueDate:  new Date("2024-01-01"),
    dueDate:    new Date("2024-01-15"),   // past date → becomes Overdue
    returnDate: null,
    fine:       50,
    status:     "Overdue",
  },
  {
    issueDate:  new Date("2024-03-01"),
    dueDate:    new Date("2024-03-15"),
    returnDate: new Date("2024-03-14"),
    fine:       0,
    status:     "Returned",
  },
];

module.exports = {
  books:        sampleBooks,
  members:      sampleMembers,
  transactions: sampleTransactions,
};