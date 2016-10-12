const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const cors = require('cors');
const url = require('url');
const webPush = require('web-push');
const vapidKeys = webPush.generateVAPIDKeys();

const app = express();
const router = express.Router();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');


const FIREBASE_AUTHORIZATION_KEY = 'AIzaSyCb9ysSZxINYbX6QjruMT4wF85Mywvxi2U';
let SUBSCRIPTIONS = {};


let indexHandler = function(req, res) {
    let context = {
        SUBSCRIPTIONS: SUBSCRIPTIONS
    };

    res.render('index', context);
}

let subscribeHandler = function(req, res) {
    let subscription = req.body;
    const urlParts = url.parse(subscription.endpointData.endpoint);

    console.log('Got new subscription:');
    console.log(subscription);

    SUBSCRIPTIONS[subscription.endpointData.endpoint] = {
        date: new Date(),
        endpointData: subscription.endpointData,
        userData: subscription.userData,
        id: urlParts.path.split('/').pop()
    };

    res.status(201);
    res.send({ status: 'OK' });
}

let sendMessageHandler = function(req, res) {
    let context = {
        SUBSCRIPTIONS: SUBSCRIPTIONS
    };
    let registrationId = req.body['registration-id'] ;
    let requestBody = {
        to: registrationId,
    };
    let payload = {
        body: req.body['message'],
        title: req.body['title']
    };

    let pushSubscription = null;

    for (let key in SUBSCRIPTIONS) {
        if (key.endsWith(registrationId)) {
            pushSubscription = SUBSCRIPTIONS[key].endpointData;
            break;
        }
    }

    if (!pushSubscription) {
        context.error = true;
        context.errorMsg = 'Could not find subscription for provided registration id.';
        res.render('index', context);

        return;
    }

    webPush.setGCMAPIKey(FIREBASE_AUTHORIZATION_KEY);
    webPush.setVapidDetails(
      'mailto:gbednarski@centuria.pl',
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );

    let promise = webPush.sendNotification(pushSubscription, JSON.stringify(payload));

    promise.then(response => {
        context.success = true;
        context.successMsg = `Successfully send message to ${registrationId}`;

        res.render('index', context);
    }).catch(response => {
        console.log('GCM response error: ');
        console.log(response);

        if (response.statusCode == 400) {
            context.error = true;
            context.errorMsg = 'Something is wrong with Firebase data.';
            res.render('index', context);
        } else {
            context.error = true;
            context.errorMsg = 'Unexpected error from GCM.';
            res.render('index', context);
        }
    });
}

router.get('/', indexHandler);
router.post('/', sendMessageHandler);
router.post('/subscribe', subscribeHandler);


app.use(cors({
    origin: ['http://localhost:3000']
}));
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(router);
app.use(express.static(path.join(__dirname, 'public')));

app.listen(3010, function() {
    console.log('app started');
});
