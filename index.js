import 'dotenv/config';
import express from 'express';
import path from 'path';
import axios from 'axios';

const Datastore = require('nedb');

const app = express();
const db = new Datastore({filename: 'db/subscriptionIds.db'});
db.loadDatabase();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://kutv.local-sinclairstoryline.com:3000"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

function saveSubscription(subscription) {
    console.log('LogMe what is this.... ', subscription);
    return new Promise(function(resolve, reject) {
        db.insert(subscription, (err, newDoc) => {
            if (err) {
                reject(new Error(err));
                return;
            }
            resolve(newDoc);
        });
    });
}

function getAllSubscriptions() {
    return new Promise((resolve, reject) => {
        db.find({}, (err, docs) => {
            if (err) {
                reject(new Error(err));
                return;
            }
            resolve(docs);
        })
    });
}

function getSubscriptionId(url) {
    let subscriptionId = url.split('/');
    subscriptionId = subscriptionId[subscriptionId.length - 1];
    return subscriptionId;
}

app.post('/save-subscription', (req, res) => {
    return saveSubscription(req.body)
    .then(function(subscriptionId) {
        res.redirect('/send');
      })
    .catch(function(err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
          error: {
            id: 'unable-to-save-subscription',
            message: 'The subscription was received but we were unable to save it to our database.'
          }
        }));
    });
});

app.use('/send', (req, res) => {
    res.sendFile(path.join(__dirname + '/template.html'));
});

app.use('/send-notification', (req, res) => {
    return getAllSubscriptions().then((docs) => {
        for (let i = 0; i < docs.length; i++) {
            const subscriptionId = getSubscriptionId(docs[i].endpoint);
            const data = {
                'registration_ids': [`${subscriptionId}`]
            };

            return axios({
                method: 'post',
                url: 'https://fcm.googleapis.com/fcm/send',
                headers: {
                    Authorization: 'key=AAAA_6fc3Dw:APA91bGlmNfD0nHF49RuKJLvl4ltkD62Vo9WCziwcppaD-Tnghvo6i972NfLl_vvXc6jAayV69bruditMbV7Jo88C3jR7UbOom7zCFnliVDnCg0Yoj1QN8vm2Hxm3F25cA5y80anC1aV',
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(data)
            })
            .then(pushResponse => {
                console.log('What is the response? .... ', pushResponse);
                if (pushResponse.status === 200) {
                    res.redirect('/send');
                }
            })
            .catch((err) => {console.log(err.response)});
        }
    });
});

app.get('/', (req, res) => {
    res.send('It Worked!');
});

app.listen(process.env.PORT, () => {
    console.log(`Listening on port ${process.env.PORT}!`);
});