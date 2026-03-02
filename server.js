// ================= SERVER.JS =================

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const session = require("express-session");
const axios = require("axios");

const app = express();
const PORT = 3000;

// ================= MIDDLEWARE =================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: "luxride-secret",
  resave: false,
  saveUninitialized: false
}));
app.use(express.static(path.join(__dirname, "public"))); // serve HTML/CSS/JS

// ================= DATABASE =================
const db = new sqlite3.Database("./database.db");

// Create tables if not exist
db.serialize(() => {
  // Admins
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      mobile TEXT UNIQUE,
      password TEXT,
      created_at TEXT
    )
  `);

  // Drivers
  db.run(`
    CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      mobile TEXT UNIQUE,
      password TEXT,
      commission INTEGER DEFAULT 85
    )
  `);

  // Bookings
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT,
      email TEXT,
      mobile TEXT,
      origin TEXT,
      destination TEXT,
      vehicleType TEXT,
      fare REAL,
      status TEXT DEFAULT 'Pending',
      driver_id INTEGER,
      created_at TEXT
    )
  `);

  // Enquiries
  db.run(`
    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT,
      companyName TEXT,
      email TEXT,
      mobile TEXT,
      pickupDate TEXT,
      pickupTime TEXT,
      origin TEXT,
      destination TEXT,
      adult INTEGER,
      childUnder4 INTEGER,
      child4to7 INTEGER,
      smallLuggage INTEGER,
      mediumLuggage INTEGER,
      largeLuggage INTEGER,
      vehicleType TEXT,
      specialRequirements TEXT,
      created_at TEXT
    )
  `);
});

// ================= DASHBOARD =================
app.get("/api/dashboard", (req, res) => {
  db.get("SELECT COUNT(*) as total FROM bookings", (err, total) => {
    db.get("SELECT SUM(fare) as revenue FROM bookings WHERE status='Completed'", (err2, revenue) => {
      res.json({
        totalBookings: total?.total || 0,
        revenue: revenue?.revenue || 0
      });
    });
  });
});

// ================= BOOKINGS =================
app.get("/api/bookings", (req, res) => {
  db.all(`
    SELECT bookings.*, drivers.name as driver_name
    FROM bookings
    LEFT JOIN drivers ON bookings.driver_id = drivers.id
    ORDER BY bookings.id DESC
  `, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, bookings: rows });
  });
});

app.post("/api/bookings", (req, res) => {
  const { fullName, email, mobile, origin, destination, vehicleType, fare, driver_id } = req.body;
  const createdAt = new Date().toLocaleString();

  db.run(`
    INSERT INTO bookings
      (fullName, email, mobile, origin, destination, vehicleType, fare, driver_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [fullName, email, mobile, origin, destination, vehicleType, fare, driver_id || null, createdAt], function(err) {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, bookingId: this.lastID });
  });
});

app.put("/api/bookings/:id", (req, res) => {
  const { status, driver_id, fare } = req.body;
  db.run(`
    UPDATE bookings
    SET status = COALESCE(?, status),
        driver_id = COALESCE(?, driver_id),
        fare = COALESCE(?, fare)
    WHERE id = ?
  `, [status, driver_id, fare, req.params.id], function(err) {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, updatedRows: this.changes });
  });
});

app.delete("/api/bookings/:id", (req, res) => {
  db.run("DELETE FROM bookings WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, deletedRows: this.changes });
  });
});

// ================= DRIVERS =================
app.get("/api/drivers", (req, res) => {
  db.all("SELECT * FROM drivers", (err, rows) => res.json(rows));
});

app.post("/api/drivers", (req, res) => {
  const { name, mobile, password, commission } = req.body;
  db.run(`
    INSERT INTO drivers (name, mobile, password, commission)
    VALUES (?, ?, ?, ?)
  `, [name, mobile, password, commission || 85], () => res.json({ success: true }));
});

// ================= ADMINS =================
app.post("/api/admin/login", (req, res) => {
  const mobile = req.body.username?.trim();
  const password = req.body.password?.trim();
  if (!mobile || !password) return res.status(400).json({ message: "Missing fields" });

  db.get("SELECT * FROM admins WHERE mobile=? AND password=?", [mobile, password], (err, row) => {
    if (!row) return res.status(401).json({ message: "Invalid login" });
    req.session.admin = row;
    res.json({ success: true });
  });
});

// ================= DRIVER LOGIN =================
app.post("/login-driver", (req, res) => {
  const { mobile, password } = req.body;
  db.get("SELECT * FROM drivers WHERE mobile=? AND password=?", [mobile, password], (err, row) => {
    if (!row) return res.send("Invalid login");
    req.session.driver = row;
    res.redirect("/driver.html");
  });
});

// ================= LOGOUT =================
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// ================= FARE CALCULATION =================
const rates = { airport: { "MPV 6 Seater": 70, "Luxury Sedan": 80 } };
function calculateFare(vehicle, km, pickupTime) {
  if (!rates.airport[vehicle]) return null;
  let total = rates.airport[vehicle];
  if (km > 20) total += (km - 20);
  if (pickupTime && parseInt(pickupTime.split(":")[0]) < 6) total += 10;
  return Math.round(total);
}

app.post("/calculate-fare", async (req, res) => {
  try {
    const { vehicleType, pickupTime, origin, destination } = req.body;
    const response = await axios.get("https://maps.googleapis.com/maps/api/distancematrix/json", {
      params: { origins: origin, destinations: destination, key: "YOUR_GOOGLE_API_KEY" }
    });
    const km = response.data.rows[0].elements[0].distance.value / 1000;
    res.json({ fare: calculateFare(vehicleType, km, pickupTime), distance: km.toFixed(2) });
  } catch {
    res.status(500).json({ error: "Distance calculation failed" });
  }
});

// ================= ENQUIRIES =================
app.post("/submit-enquiry", (req, res) => {
  const createdAt = new Date().toLocaleString();
  const fields = [
    "fullName","companyName","email","mobile","pickupDate","pickupTime",
    "origin","destination","adult","childUnder4","child4to7",
    "smallLuggage","mediumLuggage","largeLuggage",
    "vehicleType","specialRequirements"
  ].map(f => req.body[f] || null);

  fields.push(createdAt);

  db.run(`
    INSERT INTO enquiries (
      fullName, companyName, email, mobile,
      pickupDate, pickupTime, origin, destination,
      adult, childUnder4, child4to7,
      smallLuggage, mediumLuggage, largeLuggage,
      vehicleType, specialRequirements, created_at
    ) VALUES (${fields.map(() => '?').join(',')})
  `, fields, function(err) {
    if (err) return res.status(500).json({ success: false, message: err.message });
    const enquiryId = this.lastID;

    // Also insert into bookings as Pending
    const bookingFields = [
      req.body.fullName || "",
      req.body.email || "",
      req.body.mobile || "",
      req.body.origin || "",
      req.body.destination || "",
      req.body.vehicleType || "",
      0,
      null,
      createdAt
    ];

    db.run(`
      INSERT INTO bookings
        (fullName, email, mobile, origin, destination, vehicleType, fare, driver_id, created_at)
      VALUES (${bookingFields.map(() => '?').join(',')})
    `, bookingFields, function(err2) {
      if (err2) console.error("Booking insert failed:", err2.message);

      // Send success + fullName back to frontend
      res.json({ success: true, fullName: req.body.fullName || "", enquiryId });
    });
  });
});

// ================= FETCH ENQUIRIES =================
app.get("/api/admin/enquiries", (req, res) => {
  if (!req.session.admin) return res.status(401).json({ message: "Unauthorized" });
  db.all("SELECT * FROM enquiries ORDER BY id DESC", (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, enquiries: rows });
  });
});

// ================= START SERVER =================
app.listen(PORT, () => console.log(`🚗 LuxRide running at http://localhost:${PORT}`));