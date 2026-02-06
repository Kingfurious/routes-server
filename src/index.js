const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK with service account credentials
if (!admin.apps.length) {
  const serviceAccount = require("./services.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase Admin SDK initialized successfully");
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("Errunds Backend Running");
});

// API Routes
const userRoutes = require("./routes/users");
const termsRoutes = require("./routes/terms");
const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const runnerTaskRoutes = require("./routes/runnerTasks");
const taskMessagingRoutes = require("./routes/taskMessaging");
const taskCallRoutes = require("./routes/taskCalls");

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/terms", termsRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/runner/tasks", runnerTaskRoutes);
app.use("/api/v1/tasks", taskMessagingRoutes);
app.use("/api/v1/tasks", taskCallRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.name || "Internal Server Error",
    message: err.message || "An unexpected error occurred",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
