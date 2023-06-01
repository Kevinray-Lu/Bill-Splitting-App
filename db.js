const mongoose = require('mongoose');
//Item object for sale

const doc = new mongoose.Schema({
	name: String,
	participants: [{name:String, balance: Number}],
	owner: {type: String, ref: 'User.username' },
	moves:
    [{
        person: String,
        amount: Number,
		person_to: {type: mongoose.Schema.Types.Mixed,
					default: {}},
		description: String
    }]
});

const User = new mongoose.Schema({
	username: String,
	email: String,
	password: {type: String, unique: true, required: true},
	doc_ref : [{type: String, ref: 'doc.id'}]
});

mongoose.model('doc', doc);
mongoose.model('User', User);

// // is the environment variable, NODE_ENV, set to PRODUCTION? 
// let dbconf;
// if (process.env.NODE_ENV === 'PRODUCTION') {
//  // if we're in PRODUCTION mode, then read the configration from a file
//  // use blocking file io to do this...
//  const fs = require('fs');
//  const path = require('path');
//  const fn = path.join(__dirname, 'config.json');
//  const data = fs.readFileSync(fn);
//  // our configuration file will be in json, so parse it and set the
//  // conenction string appropriately!
//  const conf = JSON.parse(data);
//  console.log(conf.dbconf);
//  dbconf = conf.dbconf;
// } else {
//  // if we're not in PRODUCTION mode, then use
//  dbconf = 'mongodb://localhost/final';
// }

// Using local database
mongoose.connect('mongodb://localhost/split')
// Using cloud database
