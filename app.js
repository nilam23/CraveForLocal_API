const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dotenv = require("dotenv").config();
const session = require("express-session");
const MongoStore = require("connect-mongo");
const app = express();

const User = require("./models/userCollection");

const indexRoutes = require("./routes/index");
const userRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");
const vendorRoutes = require("./routes/vendor");

const dbURL = process.env.MONGO_LOCAL_URL || process.env.MONGO_PRODUCTION_URL;

mongoose
  .connect(dbURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(() => console.log("MONGODB CONNECTION SUCCESSFUL."))
  .catch((err) => console.log(`---MONGODB ERROR: ${err}.---`));

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const secret = process.env.EXPRESS_SESSION_SECRET;

app.use(session({
  store: MongoStore.create({
    mongoUrl: dbURL
  }),
  secret,
  resave: false,
  saveUninitialized: false
}));

app.use((req, res, next) => {
  res.locals.message = req.session.message;
  delete req.session.message;
  next();
});

app.use(indexRoutes);
app.use(userRoutes);
app.use(vendorRoutes);
app.use(adminRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, console.log(`Server running in on port ${PORT}`));
