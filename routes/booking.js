app.post("/submit-booking", (req, res) => {

  const fare = req.body.fare;

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Booking Confirmed</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          text-align: center;
          padding-top: 50px;
          background: #f5f5f5;
        }
        .card {
          background: white;
          padding: 30px;
          border-radius: 10px;
          width: 400px;
          margin: auto;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        h2 {
          color: green;
        }
        a {
          display: inline-block;
          margin-top: 20px;
          text-decoration: none;
          background: black;
          color: white;
          padding: 10px 20px;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>

      <div class="card">
        <h2>✅ Booking Confirmed</h2>
        <p>Thank you <strong>${req.body.fullName}</strong></p>
        <p>Total Fare: <strong>SGD $${fare}</strong></p>
        <a href="/">Back to Home</a>
      </div>

    </body>
    </html>
  `);
});