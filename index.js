import 'dotenv/config';
import express from 'express';
import path from 'path';
import axios from 'axios';

const Datastore = require('nedb');
const webpush = require('web-push');

const vapidKeys = {
    publicKey: 'BCRmcs8imlD0rY_nipNYFUmXSIhShnLCiS5Y-u2GVrXttlIjh3CDO1yoNxUjYNay2nk1BsJjA-mdH2VKJWKtHkA',
    privateKey: 'ZN3oZgt1eym87j80Wz7au0umyz0zxtHbKJXmZdk7OGA'
};

webpush.setVapidDetails(
    'mailto:jpearman@sbgtv.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

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

// TODO check if entry for subscription is already in DB before inserting
function saveSubscription(subscription) {
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
    return getAllSubscriptions()
    .then((docs) => {
        let promiseChain = Promise.resolve();

        for (let i = 0; i < docs.length; i++) {
            console.log(docs[i]);
            promiseChain = promiseChain.then(() => {
                const data = {
                    title: req.body.title,
                    url: req.body.url,
                    message: req.body.message
                };
                return webpush.sendNotification(docs[i], JSON.stringify(data))
                .then((res) => {
                    console.log('LogMe what is the response from webpush? .... ', res);
                })
                .catch((err) => {
                    if (err.statusCode === 404 || err.statusCode === 410) {
                        console.log('Subscription has expired or is no longer valid: ', err);
                    }
                    else {
                        throw err;
                    }
                });
            });
        }
        return promiseChain;
    })
    .then(() => {
        res.redirect('/send');
    })
    .catch((err) => {
        res.status(500);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
          error: {
            id: 'unable-to-send-messages',
            message: `We were unable to send messages to all subscriptions : ` +
              `'${err.message}'`
          }
        }));
    });;
});

app.get('/', (req, res) => {
    res.send('It Worked!');
});

app.listen(process.env.PORT, () => {
    console.log(`Listening on port ${process.env.PORT}!`);
});