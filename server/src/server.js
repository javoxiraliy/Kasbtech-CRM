const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');


dotenv.config();


const app = express();


// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Routes
const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const commentRoutes = require('./routes/comments');
const adminRoutes = require('./routes/admin');
const settingsRoutes = require('./routes/settings');
const taskRoutes = require('./routes/tasks');


app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/tasks', taskRoutes);


// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});


// Serve static files from React
app.use(express.static(path.join(__dirname, '../../client/dist')));


// Catch-all to serve index.html for React Router
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});


// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
          error: err.message || 'Internal Server Error',
    });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`CRM Server running on port ${PORT}`);
});


module.exports = app;
