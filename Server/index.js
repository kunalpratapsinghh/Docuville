const express=require("express");
const cors = require('cors');
const router = require("./Router/Router");
const bodyParser = require('body-parser');
const app=express();
app.use(cors({
    origin: '*'
}));
app.use(bodyParser.json({ limit: '10mb' })); // Change '10mb' to your desired limit
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true })); 
app.use(express.json())
app.use("",router)

app.listen(8080 ,async()=>{
    try {
        console.log("Connected")
    } catch (error) {
        console.log("Connection Error")
    }
})