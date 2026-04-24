const mongoose = require("mongoose");
const Book = require("../models/book");
const Member = require("../models/member");
const Transaction = require("../models/transaction");
const data = require("./data");

const MONGO_URL = "mongodb://127.0.0.1:27017/library";

async function main() {
  await mongoose.connect(MONGO_URL);
  console.log("connected to DB");

  await Book.deleteMany({});
  await Member.deleteMany({});
  await Transaction.deleteMany({});
  console.log("cleared existing data");

  const insertedBooks   = await Book.insertMany(data.books);
  const insertedMembers = await Member.insertMany(data.members);
  console.log("books and members inserted");

  const transactions = [
    { book: insertedBooks[0]._id, member: insertedMembers[0]._id, ...data.transactions[0] },
    { book: insertedBooks[1]._id, member: insertedMembers[1]._id, ...data.transactions[1] },
    { book: insertedBooks[2]._id, member: insertedMembers[2]._id, ...data.transactions[2] },
    { book: insertedBooks[3]._id, member: insertedMembers[3]._id, ...data.transactions[3] },
  ];

  await Transaction.insertMany(transactions);
  console.log("transactions inserted");

  await mongoose.connection.close();
  console.log("connection closed");
}

main().catch((err) => console.log(err));