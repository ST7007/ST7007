const mongoose = require("mongoose")

const bookingSchema = new mongoose.Schema({
  bookingId: Number,
  passengerName: String,
  pickup: String,
  dropoff: String,
  date: String,
  status: { type: String, default: "Pending" }
})

module.exports = mongoose.model("Booking", bookingSchema)