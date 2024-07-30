const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
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
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  
    app.get('/services', async(req, res) => {
        const query ={};
        const cursor = serviceDatabase.find(query);
        const data = await cursor.toArray();
        res.send(data)
      })

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

    app.get('/user',verifyJWT,async(req,res)=>{
      const users =await usersDatabase.find().toArray();
      res.send(users);
    })
    app.get('/admin/:email',async(req,res)=>{
      const email = req.params.email
      const adminUser = await usersDatabase.findOne({email:email})
     const isAdmin = adminUser.role === 'admin';
      res.send({admin :isAdmin})
    })
    
    app.put('/user/admin/:email',verifyJWT , async(req, res) => {
      const email = req.params.email
      const requester = req.decoded.email
      const requesterAccount = await usersDatabase.findOne({email: requester}) 
      if(requesterAccount.role=== 'admin'){
              const filter = {email:email}
      const updateDoc = {
        $set: {role : 'admin'}
      };
      const result = await usersDatabase.updateOne(filter, updateDoc);
      res.send(result)
      }
      else{
        return res.status(403).send({message:'Forbidden access'})
      }

    })


    app.put('/user/:email', async(req, res) => {
      const email = req.params.email
      const filter = {email:email}
      const data = req.body
      const options = { upsert: true };
      const updateDoc = {
        $set: data
      };
      const result = await usersDatabase.updateOne(filter, updateDoc, options);
      const token = jwt.sign({email:email},process.env.USER_TOKEN,{ expiresIn: '1h' })
      res.send({result,token})
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