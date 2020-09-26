const { response } = require('express');

const express = require('express'),
    bodyParser = require('body-parser'),
    mongodb = require('mongodb'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    cookieSession = require('cookie-session'),
    helmet = require('helmet'),
    app = express();

app.use(express.static("public")); // middleware
app.use(bodyParser.json()); // middleware
app.use(helmet()); //middleware

app.use(cookieSession({ // middleware
    name: 'session',
    keys: ['key1']
}));

const uri = "mongodb+srv://first_test:Hudson1234@cluster0.iqi3u.mongodb.net/Webware?retryWrites=true&w=majority"

const client = new mongodb.MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let collection = null; // acts as my DBClient

client.connect()
    .then(() => {
        return client.db('Webware').collection('reviews');
    })
    .then(__collection => {
        collection = __collection;
        // blank query returns all documents
        return collection.find({}).toArray();
    })
    .then(console.log("Connected!"))


passport.use(new LocalStrategy( //middleware
    function (userName, passWord, done) {
        // finding the username and password in user collection
        const userNameColumn = client.db('Webware').collection('users');
        userNameColumn.find({
            username: userName,
            password: passWord
        }).toArray()
            .then(function (result) {
                // successful login
                if (result.length >= 1) {
                    console.log("Successful Login!")
                    return done(null, userName)

                } else {
                    // failed login
                    console.log("Login Failed!")
                    return done(null, false, {
                        message: "Incorrect username or password!"
                    });
                }
            });
    }
));

// referenced: https://stackoverflow.com/questions/19948816/passport-js-error-failed-to-serialize-user-into-session
passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

app.use(passport.initialize());

app.use((request, response, next) => { //middleware
    if (collection !== null) {
        next();

    } else {
        response.status(503).send();
    }
});

function setUserSession(request, username) {
    request.session['User'] = username;
}

// when just getting the "/"
app.get("/", (request, response) => {
    console.log("Got request for webpage");
    response.sendFile(__dirname + "/public/login.html")
});

app.post("/login", bodyParser.json(),
    passport.authenticate('local', { failureFlash: false }),
    function (request, response) {
        //response.json({ username: request.username });
        let userName = request.body.username;
        setUserSession(request, userName);
        response.redirect("/getData");
    }
);

app.get("/getData", bodyParser.json(), (request, response) => {
    console.log('Here')
    let currentUser = request.session['User'];
    console.log(currentUser);
    response.sendFile(__dirname + "/public/main.html")
})


app.get("/reviews", (request, response) => {
    console.log('HERE')
    let currentUser = request.session['User'];

    if (currentUser == null) {
        response.sendStatus(404);
    }

    const userNameColumn = client.db('Webware').collection('reviews');
        userNameColumn.find({
            username: currentUser
        }).toArray()
            .then(function (result) {
                response.send(JSON.stringify(result))
            });

    //response.json({username: currentUser}) // here do the mongodb get reviews from user
});


app.post("/signUp", bodyParser.json(), (request, response) => {
    console.log("Got request for main webpage");

    const checkUserName = client.db('Webware').collection('users');
    checkUserName.find({
        username: request.body.username
    }).toArray()
        .then(function (result) {
            if (result.length < 1) {
                console.log("New User!");

                const user = client.db('Webware').collection('users');
                user.insertOne(request.body)
                    .then(() => {
                        let userName = request.body.username;
                        setUserSession(request, userName, "123");
                        response.redirect("/getData");
                    });

            } else {
                console.log("Existing User!");
                response.sendStatus(401);
            }
        }).catch(function () {
            console.log("rejected");
        })
});


app.post('/submit', bodyParser.json(), (request, response) => {
    console.log("Got Submit");
    collection.countDocuments()
        .then((count) => {
            console.log(count);
        });

    console.log(request.body);
});


app.post('/modify', bodyParser.json(), (request, response) => {
    console.log("Got Modify");
    console.log(request.body);
});

app.post('/deletion', bodyParser.json(), (request, response) => {
    console.log("Got Deletion");
    console.log(request.body);
});



// listen for requests :)
app.listen(3000);
