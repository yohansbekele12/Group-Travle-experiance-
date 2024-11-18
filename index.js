import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const port = process.env.PORT;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

db.connect();

let countries = [];
let currentUserId = 2;
let users = [];

async function checkVisisted() {
  const result = await db.query(
    "SELECT  vs.country_code ,u.name FROM users AS u JOIN visited_countries AS vs ON u.id=vs.user_id WHERE u.id=$1",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

async function getCurrentUser() {
  const result = await db.query("SELECT *FROM users");
  users = result.rows;

  return result.rows.find((user) => user.id == currentUserId);
}
app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await getCurrentUser();

  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});
app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const currentUser = await getCurrentUser();

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/user", async (req, res) => {
  const { choose, user } = req.body;
  console.log(choose);
  if (choose === "new") {
    res.render("new");
  } else if (choose === "delete_user") {
    res.redirect(307, "/delete");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  const { name, color } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO users (name,color) VALUES($1,$2); ",
      [name, color]
    );
    console.log(result.rows);

    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.post("/delete", async (req, res) => {
  console.log(req.body);
  const user = currentUserId;
  try {
    await db.query("DELETE FROM users WHERE id=$1;", [user]);
    users = users.filter((u) => u.id != user);
    currentUserId = users[0].id;
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
