const express = require('express');
const jwt = require("jsonwebtoken");
const cookiesParser = require("cookie-parser");
const cors = require('cors');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
dotenv.config();

app.use(cors({
  origin: ['http://localhost:5173','https://dimple-firebase-6bee0.firebaseapp.com','https://dimple-firebase-6bee0.firebaseapp.com'],
  credentials: true,
}));
app.use(express.json());
app.use(cookiesParser())

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: 'Unauthorize user' })
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unathorized User" })
    }
    req.user = decoded;
    next()
  })

}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zd2hkzs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();
    const carhub = client.db('carhub');
    const cars = carhub.collection('cars');
    const bookings = carhub.collection('bookings');
    app.post('/addcar', async (req, res) => {
      const car = req.body;

      const result = await cars.insertOne(car);
      res.send(result);
    });
    app.get('/allcars', async (req, res) => {
      const cursor = cars.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get('/mycar/:email',verifyToken,async (req, res) => {
      
      const email = req.params.email;
      
      const query = { Email: email };
      const cursor = cars.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get('/details/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await cars.findOne(query);

      res.send(result);
    });
    app.get('/bookingdetails/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await bookings.findOne(query);

      res.send(result);
    });

    

    app.get('/available', async (req, res) => {
          const query = req.query;
          if (query.search === "") {
            const cursor = cars.find({ Availability: "Available" });
            const result = await cursor.toArray();
            res.send(result);
          } else {
            const cursor = cars.find({
              $or: [
                { Model: { $regex: query.search, $options: 'i' } },
                { Location: { $regex: query.search, $options: 'i' } },
                { features: { $regex: query.search, $options: 'i' } },
              ], Availability: "Available"
            });
            const result = await cursor.toArray();
            res.send(result);
          }
        }); 

    

    app.post('/bookings',async (req, res) => {
      
      const car = req.body;
      
      const result = await bookings.insertOne(car);
      res.send(result);
    })


   app.get('/cancelbookings/:id',verifyToken,async (req, res) => {
  const id = req.params.id;
  console.log(id)
  const query = {_id: new ObjectId(id)};
    console.log(query)
  const result = await cars.findOne(query);

  res.send(result);
  
   })



    app.patch('/bookings/:id', async (req, res) => {
      
      const car = req.body;
      
      console.log(car)
      
      const count = car?.car?.Booking_count;
      const id = req.params.id;
      console.log("original id", id);
      const filter = { _id: new ObjectId(id) };
      console.log("filter is",filter)
      const options = { upsert: true };
      
      if(car.Status){
        const count = car.count;
        const updateDoc = {
          $set: {
            Booking_count:count - 1,
          },
        };  
        const result = await cars.updateOne(filter,updateDoc,options);
        return res.send(result);
      }
        const updateDoc = {
          $set: {
            Booking_count: count +1,
          },
        };
      const result = await cars.updateOne(filter,updateDoc,options);
      res.send(result);
    })

    

    app.post('/logout',async(req,res)=>{
      
      res.clearCookie('token',{
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      }).send({message:"logged out"});
    })

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "6hr" })

      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    })


    app.patch('/modifydate/:id', async (req, res) => {
      const car = req.body;
      
      const id = req.params.id;
      
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          BookingDate: car.dates.start,
        },
      }
      const result = await bookings.updateOne(filter, updateDoc, options);
      res.send(result);
    })





    app.delete('/cancelbookings/:id', async (req, res) => {
      const id = req.params.id;
      
      const filter = { _id: new ObjectId(id) };
      const result = await bookings.deleteOne(filter);
      res.send(result);
    })


    app.delete('/deletecar/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await cars.deleteOne(filter);
      res.send(result);
    })


    app.get('/bookings/:email',verifyToken,async (req, res) => {
      const email = req.params.email;
      
      const cursor = bookings.find({email:email});
      const result = await cursor.toArray();
      res.send(result);
    })
    
    app.patch('/updatecar/:id', async (req, res) => {
      const car = req.body;
      
      const id = req.params.id;
     
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          Model: car.name,
          Daily_Price: car?.rentalPrice,
          Availability: car.availability,
          Location: car.location,
          ImageUrl: car.imageUrl,
          Description: car.description,
          Features: car.features,
        },
      };
      const result = await cars.updateOne(filter, updateDoc);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    //await client.db("admin").command({ ping: 1 });
    
  } finally {
    
    //await client.close();
  }
}
run().catch(console.dir);


app.listen(port)
