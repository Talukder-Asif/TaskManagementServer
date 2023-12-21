const express = require("express");
const app = express();
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const cors = require("cors");
const cookieParser = require("cookie-parser");

// middleware
app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:4173"],
    credentials: true,
  })
);

// JWT Middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "No token provided" });
  }
  jwt.verify(token, process.env.SECRET, function (err, decoded) {
    //err
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "Invalid token" });
    }
    //decoded
    req.user = decoded;
    next();
  });
};

// Mongodb server code

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@cluster0.eykzqz7.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {

    const database = client.db("TaskManagement");
    const userCollection = database.collection("UserData");
    const dataCollection = database.collection("TaskData");    

    // Post user details
    app.post("/user", async (req, res) => {
      const data = req.body;
      const query = { email: data.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection?.insertOne(data);
      res.send(result);
    });

    // Update user information to database
    app.put("/user/:email", async (req, res) => {
      const userEmail = req.params.email;
      const filter = { email: userEmail };
      const data = req.body;
      const updatedDoc = {
        $set: {
          name: data.name,
          email: data.email,
          photo: data.photo,
        },
      };
      const options = { upsert: true };
      const result = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    // Get user data from database
    app.get("/user/:email", verifyToken, async (req, res) => {
      const userEmail = req.params.email;
      const quary = { email: userEmail };
      const result = await userCollection.findOne(quary);
      res.send(result);
    });


    // Add a Task in the server
    app.post("/addTask", async (req, res) => {
      const TaskData = req.body;
      const result = await dataCollection?.insertOne(TaskData);
      res.send(result);
    });

    // Get Task data using user email
    app.get("/Task/:email", verifyToken, async (req, res) => {
        const email = req.params.email;
        const query = { taskfor: email };
        const result = await dataCollection
          .find(query)
          .sort({ _id: -1 })
          .toArray();
        res.send(result);
      });
    // Delete a A Task
    app.delete("/Task/delete/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await dataCollection.deleteOne(query);
        res.send(result);
      });

    // get single Task by id
    app.get("/Tasks/:id", async (req, res) => {
      const id = req.params.id;
      const quary = { _id: new ObjectId(id) };
      const result = await dataCollection.findOne(quary);
      res.send(result);
    });

    // Update Task information to database
    app.put("/Task/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const data = req.body;
      const updatedDoc = {
        $set: {
          title: data.title,
          details: data.details,
          taskfor: data.taskfor,
          priority: data.priority,
          list: data.list,
          TaskDeadline: data.TaskDeadline,
        },
      };
      const options = { upsert: true };
      const result = await dataCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });



    // JWT
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET, { expiresIn: "24h" });
      // const expirationDate = new Date();
      // expirationDate.setDate(expirationDate.getDate() + 7);
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          // expires: expirationDate,
        })
        .send({ msg: "Succeed" });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// Route
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});