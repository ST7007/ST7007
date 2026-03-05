const express = require("express")
const router = express.Router()
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("../models/User")

router.post("/register", async (req, res) => {
  const hashed = await bcrypt.hash(req.body.password, 10)
  const user = await User.create({ ...req.body, password: hashed })
  res.json(user)
})

router.post("/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.email })
  if (!user) return res.status(400).json({ msg: "User not found" })

  const valid = await bcrypt.compare(req.body.password, user.password)
  if (!valid) return res.status(400).json({ msg: "Wrong password" })

  const token = jwt.sign({ id: user._id, role: user.role }, "luxride_secret")
  res.json({ token })
})

module.exports = router