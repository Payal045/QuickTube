require("dotenv").config();
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGOOSE_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1); // Exit if DB fails
  }
};

// Mongo session store
const store = MongoStore.create({
  mongoUrl: process.env.MONGOOSE_URI,
  crypto: {
    secret: process.env.SECRET,
  },
  touchAfter: 24 * 3600, // Session only updated once per day
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("🔌 Mongoose disconnected on app termination");
  process.exit(0);
});

module.exports = { connectDB, store };
