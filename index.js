const express = require('express')
const cors = require('cors');
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

async function run() {
  try {
    await client.connect();
    const serviceDatabase = client.db("doctors").collection('admins');
    const bookingDatabase = client.db("doctors").collection('bookings');
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