// SECTION 1: IMPORTS
const express = require("express");
const { Pool } = require("pg");
/* LEARNING: We only need 'require("express")' once at the very top. 
  The Pool comes from 'pg' to allow us to talk to PostgreSQL.
*/
const cors = require("cors"); // LINE 1: Import the security tool
app.use(cors()); // LINE 2: Tell the app to allow requests from other origins
// SECTION 2: INITIALIZATION & CONFIG
const app = express();
const PORT = 3000;

// Update this with the string from Neon.tech
const pool = new Pool({
  connectionString:
    "psql 'postgresql://neondb_owner:npg_YrdtCOLUK12G@ep-young-firefly-ahslojym-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'",
});
/* LEARNING: This is the "Phone Line" to your database. 
  Without this, the 'pool.query' commands below will fail.
  #also in order to get the connection string, you need to go to your Neon project,
  click on 'Connection Details' and copy the string under 'URI'
*/

// SECTION 3: MIDDLEWARE
app.use(express.json());
/* LEARNING: This must come BEFORE your routes. 
  It translates the incoming data so 'req.body' isn't empty.
*/

// SECTION 4: ROUTES (THE LOGIC)

// A simple GET route to test if the server is alive in the browser
app.get("/", (req, res) => {
  res.send("HEADZ UP Server is online and ready for PostgreSQL.");
});

// The POST route to save bookings
app.post("/api/bookings", async (req, res) => {
  /* LEARNING: Notice the word 'async'. 
    Talking to a database takes time (milliseconds), 
    so we tell JavaScript to handle this "asynchronously."
  */

  const { name, phone, service, date } = req.body;

  try {
    // THE SQL COMMAND
    const queryText =
      "INSERT INTO bookings(name, phone, service, appointment_date) VALUES($1, $2, $3, $4) RETURNING *";
    const values = [name, phone, service, date];

    // EXECUTE THE COMMAND
    const result = await pool.query(queryText, values);
    /* LEARNING: 'await' tells the code "Stop here until the database 
      replies with a success or error."
    */

    console.log(`Success: Saved booking for ${name}`);

    res.status(201).json({
      message: "Booking secured in PostgreSQL!",
      booking: result.rows[0],
    });
  } catch (err) {
    console.error("DATABASE ERROR:", err);
    res.status(500).json({ error: "Could not save booking." });
  }
});

// SECTION 5: START THE SERVER
app.listen(PORT, () => {
  console.log(`Server is breathing at http://localhost:${PORT}`);
});
