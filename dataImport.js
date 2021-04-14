const mongoose = require("mongoose");
const users = require("./data/users");
const items = require("./data/items");
const orders = require("./data/orders");

const User = require("./models/userCollection");
const Item = require("./models/itemCollection");
const Order = require("./models/orderCollection");

mongoose
  .connect("mongodb://localhost/CraveForLocal", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(() => console.log("MONGODB CONNECTION SUCCESSFUL."))
  .catch((err) => console.log(err));

const importData = async () => {
  try {
    await Order.deleteMany();
    // await Item.deleteMany();
    // await User.deleteMany();

    // await User.insertMany(users);
    // await Item.insertMany(items);
    await Order.insertMany(orders);

    console.log("Data Imported Successfully");
    process.exit(0);
  } catch (error) {
    console.error(`${error}`);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await Order.deleteMany();
    await Item.deleteMany();
    await User.deleteMany();

    console.log("Data Destroyed Successfully");
    process.exit(0);
  } catch (error) {
    console.error(`${error}`);
    process.exit(1);
  }
};

if (process.argv[2] === "-d") {
  destroyData();
} else {
  importData();
}
