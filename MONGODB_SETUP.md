// Backend Server Setup Guide for MongoDB

/\*
INSTALLATION & SETUP:

1. Create a new folder for your backend (outside the project folder):
   mkdir portfolio-api
   cd portfolio-api

2. Initialize Node.js project:
   npm init -y

3. Install dependencies:
   npm install express cors dotenv mongoose

4. Create .env file with:
   MONGODB_URI=your_mongodb_connection_string
   PORT=5000

5. Create server.js file (see the code below)

6. Start the server:
   npm start
   OR
   node server.js

7. Update your frontend .env with:
   VITE_API_URL=http://localhost:5000/api
   \*/

// ============ server.js (Backend Code) ============

/\*
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

// Schemas
const profileSchema = new mongoose.Schema({
username: { type: String, unique: true, required: true },
full_name: String,
bio: String,
website: String,
avatar_url: String,
projects_count: { type: Number, default: 0 },
views_count: { type: Number, default: 0 },
following_count: { type: Number, default: 0 },
created_at: { type: Date, default: Date.now },
updated_at: { type: Date, default: Date.now }
});

const skillSchema = new mongoose.Schema({
name: { type: String, required: true },
icon: String,
order_index: { type: Number, default: 0 },
created_at: { type: Date, default: Date.now }
});

const projectSchema = new mongoose.Schema({
title: { type: String, required: true },
description: String,
image_url: { type: String, required: true },
project_url: String,
technologies: [String],
order_index: { type: Number, default: 0 },
created_at: { type: Date, default: Date.now }
});

// Models
const Profile = mongoose.model('Profile', profileSchema);
const Skill = mongoose.model('Skill', skillSchema);
const Project = mongoose.model('Project', projectSchema);

// Routes

// Profile Routes
app.get('/api/profile', async (req, res) => {
try {
const profile = await Profile.findOne();
res.json(profile || {});
} catch (err) {
res.status(500).json({ error: err.message });
}
});

app.post('/api/profile', async (req, res) => {
try {
let profile = await Profile.findOne();
if (!profile) {
profile = new Profile(req.body);
} else {
Object.assign(profile, req.body);
}
await profile.save();
res.json(profile);
} catch (err) {
res.status(500).json({ error: err.message });
}
});

app.put('/api/profile', async (req, res) => {
try {
const profile = await Profile.findOneAndUpdate({}, req.body, { new: true });
res.json(profile);
} catch (err) {
res.status(500).json({ error: err.message });
}
});

// Skills Routes
app.get('/api/skills', async (req, res) => {
try {
const skills = await Skill.find().sort({ order_index: 1 });
res.json(skills);
} catch (err) {
res.status(500).json({ error: err.message });
}
});

app.post('/api/skills', async (req, res) => {
try {
const skill = new Skill(req.body);
await skill.save();
res.json(skill);
} catch (err) {
res.status(500).json({ error: err.message });
}
});

app.put('/api/skills/:id', async (req, res) => {
try {
const skill = await Skill.findByIdAndUpdate(req.params.id, req.body, { new: true });
res.json(skill);
} catch (err) {
res.status(500).json({ error: err.message });
}
});

app.delete('/api/skills/:id', async (req, res) => {
try {
await Skill.findByIdAndDelete(req.params.id);
res.json({ success: true });
} catch (err) {
res.status(500).json({ error: err.message });
}
});

// Projects Routes
app.get('/api/projects', async (req, res) => {
try {
const projects = await Project.find().sort({ order_index: 1 });
res.json(projects);
} catch (err) {
res.status(500).json({ error: err.message });
}
});

app.post('/api/projects', async (req, res) => {
try {
const project = new Project(req.body);
await project.save();
res.json(project);
} catch (err) {
res.status(500).json({ error: err.message });
}
});

app.put('/api/projects/:id', async (req, res) => {
try {
const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
res.json(project);
} catch (err) {
res.status(500).json({ error: err.message });
}
});

app.delete('/api/projects/:id', async (req, res) => {
try {
await Project.findByIdAndDelete(req.params.id);
res.json({ success: true });
} catch (err) {
res.status(500).json({ error: err.message });
}
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);
});
\*/
