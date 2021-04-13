const mongoose = require("mongoose");
const User = require("./models/userCollection");

mongoose.connect("mongodb://localhost/CraveForLocal", { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
    .then(() => console.log("MONGODB CONNECTION SUCCESSFUL."))
    .catch((err) => console.log(err));

console.log(User);