const MongoClient    = require('mongodb').MongoClient;
const express        = require('express');
const bodyParser     = require('body-parser');

const ConfigDB       = require('./configs/db');

const app            = express();
const port = 3002;
const Mongo = new MongoClient(ConfigDB.url);

app.use(bodyParser.urlencoded({ extended: true }));


async function main() {
    try {
        let database = await Mongo.connect();
        require('./endpoints')(app, database);
        app.listen(port, () => {
            console.log('We are live on ' + port);
        });
    
    } catch (e) {
        console.error(e);
    }
}

 main().catch(console.error);