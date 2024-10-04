const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion} = require('mongodb');
const ObjectID = require('mongodb').ObjectID;
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())





const uri = `mongodb+srv://${process.env.USER_ID}:${process.env.USER_PASS}@admin.nrmhcex.mongodb.net/?retryWrites=true&w=majority&appName=admin`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


function verifyJWT(req,res,next){
  const authHeader = req.headers.authorization
  // console.log(authHeader)
if(!authHeader){
  return res.status(401).send({message:'UnAuthorized access'})
}
const token = authHeader.split(' ')[1];
jwt.verify(token, process.env.USER_TOKEN, function(err, decoded) {
  if(err){
    return res.status(403).send({message:'Forbidden access'})
  }
  req.decoded = decoded;
  next()
});
}

async function run() {
  try {
    await client.connect();
    const serviceDatabase = client.db("doctors").collection('admins');
    const bookingDatabase = client.db("doctors").collection('bookings');
    const usersDatabase = client.db("doctors").collection('users');
    const doctorsDatabase = client.db("doctors").collection('doctors');
    const directorDatabase = client.db("doctors").collection('directors');
    console.log("Pinged your deployment. You successfully connected to MongoDB!");


    // ----make sure is this admin-----
    const verifyAdmin = async (req,res,next)=>{
      const requester = req.decoded.email
      const requesterAccount = await usersDatabase.findOne({email: requester}) 
      if(requesterAccount.role=== 'admin'){
        next()
      }
      else{
        return res.status(403).send({message:'Forbidden access'})
      }
    }


    // ---add a new service---
    app.post('/addServices',verifyJWT,verifyAdmin,async(req,res)=>{
      const service = req.body;
      const users =await serviceDatabase.insertOne(service)
      res.send(users);
    })


    // --- delete an service---
    app.delete('/service',verifyJWT,verifyAdmin,async(req,res)=>{
      const service = req.query.name
      const filter = {service:service}
      // console.log(filter)
      const data = await serviceDatabase.deleteOne(filter)
      res.send(data);
    })
  

    // -----get all service---
    app.get('/services', async(req, res) => {
        const query ={};
        const cursor = serviceDatabase.find(query);
        const data = await cursor.toArray();
        res.send(data) 
      })


      // ---- get available service----
    app.get('/available',async(req,res)=>{
      const date = req.query.date;

      const services = await serviceDatabase.find().toArray();

      const quarry={Date:date}
      const bookings = await bookingDatabase.find(quarry).toArray()
      services.forEach(service =>{
        const serviceBookings = bookings.filter(b=>b.Treatment === service.service)
        const booked = serviceBookings.map(s=> s.SlotId)
        const available = service.slots.filter(s=> !booked.includes(s.id))
        service.slots = available
        
      })
      res.send(services)
    })


    // ---to get all bookings---
    app.get('/allbookings',verifyJWT,verifyAdmin,async(req,res)=>{
      const bookings =await bookingDatabase.find().toArray();
      res.send(bookings);
    })




    // ---to get a singel parson bookings---
    app.get('/bookings',verifyJWT,async(req,res)=>{
      const email = req.query.email
      const decodedEmail = req.decoded.email
      // console.log(decodedEmail,email)
      if(email===decodedEmail){
        const quarry = {Email:email}
      const data =await bookingDatabase.find(quarry).toArray();
      res.send(data)
      }
      else{
        return res.status(403).send({message:'Forbidden access'})
      }     
    })
    
    
  // ---store bokings on bookingDatabase---
    app.post('/bookings', async(req,res)=>{
      const data = req.body
      const quarry = {Treatment: data.Treatment,Date:data.Date,Name:data.Name}
      const exist = await bookingDatabase.findOne(quarry)
      if(exist){
        return res.send({success : false})
      }
      const result = await bookingDatabase.insertOne(data)
      return res.send({success: true ,result})
    })


    // ---confirm an booking---
    app.put('/booking/:email',verifyJWT,verifyAdmin, async(req, res) => {
      const email = req.params.email;
      const data =req.body
      // console.log(email)
      const filter = {Email:email,Treatment: data.Treatment,Date:data.Date,Slot:data.Slot};
      const updateDoc = {
        $set: {role : 'confirmed'}
      };
      const result = await bookingDatabase.updateOne(filter, updateDoc);
      res.send(result)
    })



    // ---get all confirm orders---

    app.get('/confirmedBooking',async(req,res)=>{
        const users =await bookingDatabase.find({role : 'confirmed'}).toArray();
        res.send(users);
      })
 



    // ---get all user---
    app.get('/user',verifyJWT,verifyAdmin,async(req,res)=>{
      const users =await usersDatabase.find().toArray();
      res.send(users);
    })


    // ---make sure is this admin---
    app.get('/admin/:email',async(req,res)=>{
      const email = req.params.email
      const adminUser = await usersDatabase.findOne({email:email})
     const isAdmin = adminUser.role === 'admin';
      res.send({admin :isAdmin})
    })



    // ---make an admin---
    app.put('/user/admin/:email',verifyJWT,verifyAdmin, async(req, res) => {
      const email = req.params.email;
      const filter = {email:email};
      const updateDoc = {
        $set: {role : 'admin'}
      };
      const result = await usersDatabase.updateOne(filter, updateDoc);
      res.send(result)
    })

    // ---store users---
    app.put('/user/:email', async(req, res) => {
      const email = req.params.email
      const filter = {email:email}
      const data = req.body
      const options = { upsert: true };
      const updateDoc = {
        $set: data
      };
      const result = await usersDatabase.updateOne(filter, updateDoc, options);
      const token = jwt.sign({email:email},process.env.USER_TOKEN,)
      res.send({result,token})
    })



    // ---delete an user---
    
    app.delete('/user/:email',verifyJWT,verifyAdmin,async(req,res)=>{
      const email = req.params.email
      const filter = {email:email}
      const data = await usersDatabase.deleteOne(filter)
      res.send(data);
    })





    // ---store doctors---
    app.post('/doctor',verifyJWT,verifyAdmin,async(req,res)=>{
      const doctor = req.body;
      const users =await doctorsDatabase.insertOne(doctor)
      res.send(users);
    })
  


    // ----get All doctors---
    app.get('/doctor',async(req,res)=>{
      const data = await doctorsDatabase.find().toArray()
      res.send(data);
    })


    // ---delete an doctor---
    app.delete('/doctor/:email',verifyJWT,verifyAdmin,async(req,res)=>{
      const email = req.params.email
      const filter = {email:email}
      const data = await doctorsDatabase.deleteOne(filter)
      res.send(data);
    })

    // ---store director---
    app.post('/director',verifyJWT,verifyAdmin,async(req,res)=>{
      const doctor = req.body;
      const users =await directorDatabase.insertOne(doctor)
      res.send(users);
    })
  


    // ----get All director---
    app.get('/director',async(req,res)=>{
      const data = await directorDatabase.find().toArray()
      res.send(data);
    })


    // ---delete an director---
    app.delete('/director/:email',verifyJWT,verifyAdmin,async(req,res)=>{
      const email = req.params.email
      const filter = {email:email}
      const data = await directorDatabase.deleteOne(filter)
      res.send(data);
    })


 
} finally {
    
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Doctors portal server is ready')
})

app.listen(port, () => {
  console.log(`Doctors portal server listening on port ${port}`)
})