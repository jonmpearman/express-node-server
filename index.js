import 'dotenv/config';
import express from 'express';
import path from 'path';
import axios from 'axios';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/send', (req, res) => {
    res.sendFile(path.join(__dirname + '/template.html'));
})

app.use('/send-notification', (req, res) => {
    console.log('LogMe what is the req data? .... ', req);
    res.redirect('/send');
})

app.get('/', (req, res) => {
    res.send('It Worked!');
});

app.listen(process.env.PORT, () => {
    console.log(`Listening on port ${process.env.PORT}!`);
});