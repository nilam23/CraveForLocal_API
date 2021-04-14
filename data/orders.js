const orders = [
  {
    user: "6077098fe183a52c9442c3b1",
    shippingAddress: {
      address: "NMH",
      city: "Tezpur",
      postalCode: "784001",
      country: "India",
    },
    paymentMethod: "COD",
    itemId: ["6077098fe183a52c9442c3b3"],
    qty: [1],
    price: [89.99],
    totalPrice: 89.99,
    orderedAt: "2021-04-14T15:20:55.986+00:00",
  },
  {
    user: "6077098fe183a52c9442c3b2",
    shippingAddress: {
      address: "NMH",
      city: "Tezpur",
      postalCode: "784001",
      country: "India",
    },
    paymentMethod: "COD",
    itemId: ["6077098fe183a52c9442c3b3", "6077098fe183a52c9442c3b4"],
    qty: [1, 2],
    price: [89.99, 599.99],
    totalPrice: 1289.97,
    orderedAt: "2021-04-14T15:20:55.986+00:00",
  },
];

module.exports = orders;
