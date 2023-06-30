const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken')

require('dotenv').config({path:"config/.env"});

const app = express();

const cors = require("cors");
app.use(cors());


app.use(bodyParser.json());

// Database Connect
const mongoURI = 'mongodb+srv://Hareesh:harepass@cluster0.kctmmaa.mongodb.net/TaskManager?retryWrites=true&w=majority'

mongoose.connect(mongoURI, {
      useUnifiedTopology:true,
    })
    .then(console.log('connected to MongoDB'))
     .catch((err) => console.log(err));

// Define the Task schema
const taskSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: String,
    description: String,
    status: String
  });
  
  // Define the User schema
  const userSchema = new mongoose.Schema({
    username: String,
    password: String
  });
  
  // Create the Task and User models
  const Task = mongoose.model('Task', taskSchema);
  const User = mongoose.model('User', userSchema);
  
  // Middleware to authenticate user using JWT
  const authenticateJWT = (req, res, next) => {
    const token = req.header('Authorization');
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid token' });
      }
      
      req.user = user;
      next();
    });
  };

  //welcome Message
  app.get('/', async (req, res) => {
    res.send('Welcome to Task Manger!!!! ');
  });

  // User registration
  app.post('/register', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      // Check if the username is already taken
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(409).json({ error: 'Username already exists' });
      }
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create a new user
      const newUser = new User({ username, password: hashedPassword });
      await newUser.save();
  
      res.json({ message: 'Registration successful' });
    } catch (error) {
      res.status(500).json({ error: 'Registration failed' });
    }
  });
  
  // User login
  app.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      // Find the user
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
  
      // Check the password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
  
      // Generate JWT
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  
      res.json({ token });
    } catch (error) {
        console.log(error);
      res.status(500).json({ error: 'Login failed' });
    }
  });
  
  // Create a new task
  app.post('/tasks', authenticateJWT, async (req, res) => {
    const { title, description, status } = req.body;
    const userId = req.user.id;
  
    try {
      const newTask = new Task({ userId, title, description, status });
      await newTask.save();
  
      res.json(newTask);
    } catch (error) {
      res.status(500).json({ error: 'Task creation failed' });
    }
  });
  
  // Update a task
  app.put('/tasks/:id', authenticateJWT, async (req, res) => {
    const taskId = req.params.id;
    const { title, description, status } = req.body;
    const userId = req.user.id;
  
    try {
      const updatedTask = await Task.findOneAndUpdate({ _id: taskId, userId }, { title, description, status }, { new: true });
  
      if (!updatedTask) {
        return res.status(404).json({ error: 'Task not found' });
      }
  
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ error: 'Task update failed' });
    }
  });
  
  // Delete a task
  app.delete('/tasks/:id', authenticateJWT, async (req, res) => {
    const taskId = req.params.id;
    const userId = req.user.id;
  
    try {
      const deletedTask = await Task.findOneAndDelete({ _id: taskId, userId });
  
      if (!deletedTask) {
        return res.status(404).json({ error: 'Task not found' });
      }
  
      res.json(deletedTask);
    } catch (error) {
      res.status(500).json({ error: 'Task deletion failed' });
    }
  });
  
  // Get all tasks for a user
  app.get('/tasks', authenticateJWT, async (req, res) => {
    const userId = req.user.id;
  
    try {
      const userTasks = await Task.find({ userId });
      res.json(userTasks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve tasks' });
    }
  });
  
  // Start the server
  const port = process.env.PORT || 6000;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });