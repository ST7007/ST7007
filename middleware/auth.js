const jwt = require("jsonwebtoken")

module.exports = (req, res, next) => {
  const token = req.headers.authorization
  if (!token) return res.status(401).json({ msg: "No token" })

  try {
    const decoded = jwt.verify(token, "luxride_secret")
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ msg: "Invalid token" })
  }
}