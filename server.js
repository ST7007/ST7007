// ================= SERVER.JS =================
const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const session = require("express-session");
const multer = require("multer");
const bcrypt = require("bcrypt");
const fs = require("fs");

const app = express();

// Ensure uploads folder exists
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// ================= MIDDLEWARE =================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: "luxride-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24*60*60*1000 } // 1 day
}));
app.use(express.static(path.join(__dirname, "public"))); // serve HTML/CSS/JS

// ================= DATABASE =================
const db = new sqlite3.Database("./database.db");

db.serialize(() => {
  // Admins table
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      mobile TEXT UNIQUE,
      password TEXT,
      created_at TEXT
    )
  `);

  // Drivers table
  db.run(`
    CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT,
      email TEXT UNIQUE,
      mobile TEXT UNIQUE,
      address TEXT,
      password TEXT,
      dob TEXT,
      vehicleModel TEXT,
      plateNumber TEXT,
      carRegDate TEXT,
      coeExpiredDate TEXT,
      insuranceStartDate TEXT,
      insuranceExpiredDate TEXT,
      icFront TEXT,
      icBack TEXT,
      drivingLicense TEXT,
      phvLicense TEXT,
      carLogcard TEXT,
      carInsurance TEXT,
      emergencyName TEXT,
      emergencyPhone TEXT,
      created_at TEXT,
      status TEXT DEFAULT 'Pending'
    )
  `);

  // Bookings table
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

  // Enquiries table
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

// ================= MULTER UPLOAD SETUP =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// ================= DRIVER REGISTRATION =================
app.post("/register-driver", upload.fields([
  { name: "icFront", maxCount: 1 },
  { name: "icBack", maxCount: 1 },
  { name: "drivingLicense", maxCount: 1 },
  { name: "phvLicense", maxCount: 1 },
  { name: "carLogcard", maxCount: 1 },
  { name: "carInsurance", maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      fullName, email, mobile, address, password, dob,
      vehicleModel, plateNumber, emergencyName, emergencyPhone,
      carRegDate, coeExpiredDate, insuranceStartDate, insuranceExpiredDate
    } = req.body;

    if (!fullName || !email || !mobile || !password) {
      return res.status(400).json({ success: false, message: "Please fill all required fields" });
    }

    const requiredFiles = ['icFront','icBack','drivingLicense','phvLicense','carLogcard','carInsurance'];
    for(let f of requiredFiles){
      if(!req.files?.[f]){
        return res.status(400).json({ success: false, message: `Missing document: ${f}` });
      }
    }

    const icFront = req.files.icFront[0].filename;
    const icBack = req.files.icBack[0].filename;
    const drivingLicense = req.files.drivingLicense[0].filename;
    const phvLicense = req.files.phvLicense[0].filename;
    const carLogcard = req.files.carLogcard[0].filename;
    const carInsurance = req.files.carInsurance[0].filename;

    const hashedPassword = await bcrypt.hash(password, 10);
    const createdAt = new Date().toLocaleString();

    db.run(`
      INSERT INTO drivers
      (fullName,email,mobile,address,password,dob,vehicleModel,plateNumber,
       carRegDate,coeExpiredDate,insuranceStartDate,insuranceExpiredDate,
       icFront,icBack,drivingLicense,phvLicense,carLogcard,carInsurance,
       emergencyName,emergencyPhone,created_at,status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `,
      [fullName,email,mobile,address,hashedPassword,dob,vehicleModel,plateNumber,
       carRegDate,coeExpiredDate,insuranceStartDate,insuranceExpiredDate,
       icFront,icBack,drivingLicense,phvLicense,carLogcard,carInsurance,
       emergencyName,emergencyPhone,createdAt,'Pending'],
      function(err) {
        if (err) {
          console.error("DB Error:", err.message);
          return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, message: "Driver registration submitted successfully!", driverId: this.lastID });
      }
    );

  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ================= CUSTOMER ENQUIRY =================
app.post("/submit-enquiry", (req, res) => {
  try {
    const data = req.body;
    const {
      fullName, companyName, email, mobile, pickupDate, pickupTime,
      origin, destination, adult, childUnder4, child4to7,
      smallLuggage, mediumLuggage, largeLuggage, vehicleType, specialRequirements
    } = data;

    if (!fullName || !email || !mobile || !origin || !destination || !vehicleType) {
      return res.status(400).json({ success: false, message: "Please fill all required fields" });
    }

    const createdAt = new Date().toLocaleString();

    db.run(`
      INSERT INTO enquiries
      (fullName, companyName, email, mobile, pickupDate, pickupTime,
       origin, destination, adult, childUnder4, child4to7,
       smallLuggage, mediumLuggage, largeLuggage,
       vehicleType, specialRequirements, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `,
    [
      fullName,
      companyName || "",
      email,
      mobile,
      pickupDate,
      pickupTime,
      origin,
      destination,
      adult || 0,
      childUnder4 || 0,
      child4to7 || 0,
      smallLuggage || 0,
      mediumLuggage || 0,
      largeLuggage || 0,
      vehicleType,
      specialRequirements || "",
      createdAt
    ],
    function(err) {
      if(err){
        console.error("Enquiry DB Error:", err.message);
        return res.status(500).json({ success: false, message: "Database error" });
      }
      res.json({ success: true, fullName, message: "Enquiry submitted successfully" });
    });

  } catch(err){
    console.error("Server Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ================= DASHBOARD API =================
app.get("/api/dashboard", (req, res) => {
  db.get("SELECT COUNT(*) as totalBookings FROM bookings", (err1, totalBookings) => {
    db.get("SELECT SUM(fare) as revenue FROM bookings WHERE status='Completed'", (err2, revenue) => {
      db.get("SELECT COUNT(*) as totalEnquiries FROM enquiries", (err3, totalEnquiries) => {
        db.get("SELECT COUNT(*) as totalDrivers FROM drivers", (err4, totalDrivers) => {
          res.json({
            totalBookings: totalBookings?.totalBookings || 0,
            revenue: revenue?.revenue || 0,
            totalEnquiries: totalEnquiries?.totalEnquiries || 0,
            totalDrivers: totalDrivers?.totalDrivers || 0
          });
        });
      });
    });
  });
});

// ================= API FOR SA PANEL =================

// Enquiries
app.get("/api/enquiries", (req, res) => {
  db.all("SELECT * FROM enquiries", [], (err, rows) => {
    if(err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, data: rows });
  });
});

// Drivers
app.get("/api/drivers", (req, res) => {
  db.all("SELECT * FROM drivers", [], (err, rows) => {
    if(err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, data: rows });
  });
});

// Customers (from bookings table)
app.get("/api/customers", (req, res) => {
  db.all("SELECT * FROM bookings", [], (err, rows) => {
    if(err) return res.status(500).json({ success: false, message: err.message });
    const customers = rows.map(r => ({
      fullName: r.fullName,
      email: r.email,
      mobile: r.mobile,
      origin: r.origin,
      destination: r.destination,
      vehicleType: r.vehicleType,
      status: r.status,
      created_at: r.created_at
    }));
    res.json({ success: true, data: customers });
  });
});

// Bookings
app.get("/api/bookings", (req, res) => {
  db.all("SELECT * FROM bookings", [], (err, rows) => {
    if(err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, data: rows });
  });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚗 LuxRide running at http://localhost:${PORT}`));