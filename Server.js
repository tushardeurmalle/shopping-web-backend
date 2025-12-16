import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import fs from "fs";
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
mongoose.connect("mongodb://127.0.0.1:27017/shopDb" || process.env.MONGO_URI,{
    useNewUrlParser:true,
    useUnifiedTopology:true
}).then(()=>console.log("mongodb connected")).catch((err)=>console.log(err));
const productSchema =new mongoose.Schema({
    name:String,
    price:Number,
    image:String
});
const Product=mongoose.model("Product",productSchema);

app.get("/products",async(req,res)=>{
    const products = await Product.find();
    res.json(products);

});
app.get("/seed" ,async(req,res)=>{
    const fname= fileURLToPath(import.meta.url);
    const dirname=path.dirname(fname);
    const data = fs.readFileSync(path.join(dirname,"Product.json"),"utf-8");
    const products = JSON.parse(data);

    await Product.deleteMany({});
    await Product.insertMany(products);
    res.send("database seeded");

});
app.post("/signup", async(req,res)=>{
    try 
    {
        const {name,email,password} = req.body;
        const existingUser = await User.findOne({email});
        const hashedPass =await bcrypt.hash(password,10);
        const user= new User({name,email,password:hashedPass});
        await user.save();
        res.json({message:"user registered"});
        
    } 
    catch (err) 
    {
        res.status(400).json({error:"user already exists"});
    }

    
});
app.post("/login", async(req,res)=>{
    const {email,password} = req.body;
    const user = await User.findOne({email});
    if(!user) return res.status(400).json({error:"user not found"});
    const valid= await bcrypt.compare(password, user.password);
    if(!valid) return res.status(400).json({error:"invalid password"});
    const token = jwt.sign({id:user._id},process.env.JWT_SECRET || "Secret Key",{expiresIn:"1h"});
    res.json({token,user:{name:user.name,email:user.email}});
});
const auth= (req,res,next)=>{
    const token = req.headers["authorization"];
    if(!token) return res.status(401).json({error:"no token"});
    try{
        const decoded = jwt.verify(token.split(" ")[1],process.env.JWT_SECRET || "Secret Key");
        req.user = decoded;
        next();

    }
    catch(err){
        res.status(401).json({error:"invalid token"});

    }
};
app.get("/profile",auth, async(req,res)=>{
    const user= await User.findById(req.user.id).select("-password");
    res.json(user);
})
app.listen(process.env.PORT,()=> console.log("server is running"));


