require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());


mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err));

const taskSchema = new mongoose.Schema({
    text: String,
    completed: Boolean
}, { timestamps: true });

const Task = mongoose.model('Task', taskSchema);




app.get('/tasks', async (req, res) => {
    try {
        const tasks = await Task.find();
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


app.post('/tasks', async (req, res) => {
    try {
        const newTask = new Task(req.body);
        await newTask.save();
        io.emit('taskAdded', newTask); 
        res.status(201).json(newTask);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});


app.delete('/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Task.findByIdAndDelete(id);
        io.emit('taskDeleted', id); 
        res.json({ message: "Task deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update a task
app.put('/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedTask = await Task.findByIdAndUpdate(id, req.body, { new: true });
        io.emit('taskUpdated', updatedTask); 
        res.json(updatedTask);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    Task.find().then(tasks => socket.emit('tasks', tasks));

    socket.on('addTask', async (taskData) => {
        const newTask = new Task(taskData);
        await newTask.save();
        io.emit('taskAdded', newTask);
    });

  
    socket.on('deleteTask', async (taskId) => {
        await Task.findByIdAndDelete(taskId);
        io.emit('taskDeleted', taskId);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

