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
    const database = client.db("doctors").collection('admins');
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  
    app.get('/services', async(req, res) => {
        const query ={};
        const cursor = database.find(query);
        const data = await cursor.toArray();
        res.send(data)
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