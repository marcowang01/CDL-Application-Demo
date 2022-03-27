const express = require('express');
const cors = require('cors');
const process = require('process');

// create express node.js app
const app = express();

// enables cross-origin resource sharing from any origin domain
app.use(cors({
    origin: '*'
}))

// end point for front end to communicate with backend
app.get('/hello_world', (req, res) => {

    console.time("timer")
    res.send(`Got it, roger!    Average response time is ${process.env.TIME}`)
})

// listens for any requests on port 3000
app.listen(3000, function() {
    console.log('listening on 3000')
});

