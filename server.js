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
app.set("view engine", "ejs"); // for admin panel templates

// ================= LOGIN PROTECTION =================
function requireLogin(req, res, next) {

  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }

  next();
}

// ================= DATABASE =================
const db = new sqlite3.Database("./database.db");

db.serialize(() => {
  // Enquiries table with Status
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
      adult INTEGER DEFAULT 0,
      childUnder4 INTEGER DEFAULT 0,
      child4to7 INTEGER DEFAULT 0,
      smallLuggage INTEGER DEFAULT 0,
      mediumLuggage INTEGER DEFAULT 0,
      largeLuggage INTEGER DEFAULT 0,
      vehicleType TEXT,
      specialRequirements TEXT,
      status TEXT DEFAULT 'Pending',
      created_at TEXT
    )
  `);
});

// ================= CUSTOMER ENQUIRY SUBMISSION =================
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

// ================= ADMIN PANEL - VIEW =================
app.get("/admin/enquiries", (req, res) => {
  db.all("SELECT * FROM enquiries ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).send(err.message);
    res.render("adminEnquiries", { enquiries: rows });
  });
});

// ================= ADMIN PANEL - EDIT =================
app.get("/admin/enquiries/edit/:id", (req,res) => {
  db.get("SELECT * FROM enquiries WHERE id=?", [req.params.id], (err,row)=>{
    if(err) return res.status(500).send(err.message);
    res.render("editEnquiry", { enquiry: row });
  });
});

app.post("/admin/enquiries/edit/:id", (req,res)=>{
  const e = req.body;
  db.run(
    `UPDATE enquiries SET
      fullName=?, companyName=?, email=?, mobile=?, pickupDate=?, pickupTime=?, origin=?, destination=?,
      adult=?, childUnder4=?, child4to7=?, smallLuggage=?, mediumLuggage=?, largeLuggage=?, vehicleType=?, specialRequirements=?, status=?
     WHERE id=?`,
    [
      e.fullName, e.companyName, e.email, e.mobile, e.pickupDate, e.pickupTime, e.origin, e.destination,
      e.adult || 0, e.childUnder4 || 0, e.child4to7 || 0,
      e.smallLuggage || 0, e.mediumLuggage || 0, e.largeLuggage || 0,
      e.vehicleType, e.specialRequirements, e.status,
      req.params.id
    ],
    function(err){
      if(err) return res.status(500).send(err.message);
      res.redirect("/admin/enquiries");
    }
  );
});

// ================= ADMIN PANEL - DELETE =================
app.get("/admin/enquiries/delete/:id", (req,res)=>{
  db.run("DELETE FROM enquiries WHERE id=?", [req.params.id], (err)=>{
    if(err) return res.status(500).send(err.message);
    res.redirect("/admin/enquiries");
  });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚗 LuxRide running at http://localhost:${PORT}`));