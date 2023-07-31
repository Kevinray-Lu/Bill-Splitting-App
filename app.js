const express = require('express');
const app = express();
require('./db');
const mongoose = require('mongoose');
const doc = mongoose.model('doc');
const User = mongoose.model('User');
const session = require('express-session');
const auth = require('./auth.js');
const exphbs=require('express-handlebars');
const handlebars = require('handlebars');
var fs = require('fs');
var path = require('path');

/*
todo:
1. balance reversing
2. order of adding reverse
3. subgroups
4. default splitting
5. default all selected when splitting 
6. upload receipt
*/

app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

const sessionOptions = { 
	secret: 'secret for signing session id', 
	saveUninitialized: false, 
	resave: false 
};
app.use(session(sessionOptions));

var multer = require('multer');
  
var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});
  
var upload = multer({ storage: storage });


app.set('view engine', 'hbs');


app.get('/', function(req, res) {
    res.render('home');
});
handlebars.registerHelper('json', function(context) {
  return JSON.stringify(context);
});


// renders for home page
app.post('/', function(req, res) {
	//console.log(Object.keys(req.body));
	const re = Object.keys(req.body)[0];
	res.redirect('/'+re);
});

// renders for accessing existing trips
app.get('/exist', function(req, res) {
    res.render('exist');
});

app.post('/exist', function(req, res) {
	console.log(Object.keys(req.body));
	const ref = req.body.doc;
	// find existing trip according to search id
	doc.findOne({_id: ref},(err, result, count) => {
			if (!err && result) {
				console.log(result);
				res.redirect('/trips/'+ref);
			} else{
				res.render('exist', {message: 'trip not found!'});
			}
	});
});

// renders for personal trips, and for options of creating new trips
app.get('/personal', function(req, res) {
	// check if logged in, if not redirects to login page
	if (req.session.username === undefined) {
		res.redirect('login');
	}
	else {
	doc.find({owner: req.session.username.username}, function(err, varToStoreResult) {
				if (err) {console.log(err);}
				const items = varToStoreResult;
				console.log(items);
				res.render('personal', {docs: items});
		});
	}
});

app.post('/personal', function(req, res) {
	res.redirect('new');
	
}); 

// renders for details of creating a new trip
app.get('/new', (req, res) => {
	if (req.session.username === undefined) {
		res.redirect('login');
	}
	res.render('new');
});
app.post('/new', function(req, res) {
	// render form for number of people and name of trip
	if (Object.keys(req.body)[0] === "num") {
		console.log('now');
		const key = parseInt(req.body.num);
		if (isNaN(req.body.num)) {
			res.render('new', {error: "please enter a valid number of participants!"});
		}else{
		console.log(Object.keys(req.body));
		res.render('new', {num: Array.from(Array(key).keys()), journey: req.body.journey});
		}
	}else {
		// render form for each participants name
		console.log('here');
		const people = Object.values(req.body)[0];
		console.log(Object.keys(req.body));
		let people_details = new Array(people.length);
		for (let j = 0; j < people.length; j ++) {
			people_details[j] = {name: people[j], balance: parseFloat(0)};
		}
		new doc({
					name: Object.keys(req.body)[1],
					participants: people_details,
					owner: req.session.username.username,
					updated_at : Date.now()
				}).save(function(err, doc, count){
					if (err) {console.log(err, count);}
					if (req.session.username !== undefined) {
						console.log('yes');
						User.findOneAndUpdate({username: req.session.username.username}, {
							"$push": {
								"doc_ref": doc._id}},
								{new: true}, (err, doc) => {
									if (err) {
										console.log("Something wrong when updating data!");
									}
								});
						}
				res.redirect('/trips/'+doc.id);						
				});
	}
});

//render page for specific trip
app.get('/trips/:slug', (req, res) => {
	let slug1 = req.path.split('/');
	slug1 = slug1[2].toLowerCase();
	// add current trip to logged in user if logged in and not there already
	if (req.session.username !== undefined) {
		User.findOneAndUpdate({username: req.session.username.username, doc_ref: {$ne: slug1}},{
							"$push": {
								"doc_ref": slug1}},
								{new: true}, (err, doc) => {
									//console.log(doc);
									
									if (err) {
										console.log(err);
									}
								});
		doc.findOneAndUpdate({_id: slug1, owner: {$ne: req.session.username.username}},{
							"$push": {
							"owner": req.session.username.username}},
							{new: true}, (err, doc) => {
									//console.log(doc);
									
									if (err) {
										console.log(err);
									}
								});
	}
	// set default splitting method to split, and render form
	//console.log(req.query);
	let method = {"split": false, "dollar": false, "percent": false};
	if (req.query.method !== undefined) {
		method[req.query.method] = true;
	}else {
		method["split"]= true;
	}
	//console.log(method);
	// search moves entries for current Document
	doc.find({_id: slug1}, function (err, result) {
		if (err) {console.log(err);}
				//console.log(result);
				let item = result[0].participants;
				for (participant of item) {
					participant.balance = participant.balance * -1;
				}
				let moves = result[0].moves.reverse();
				let id = result[0]._id;
				let defaults = result[0].defaults;
				console.log(defaults);
				res.render('1', {people: item, subs: defaults.toObject(), moves: moves, id: id, method: method, json: function (context) { return JSON.stringify(context);  },});
			});
});

app.post('/trips/:slug', function(req, res) {
	let slug1 = req.path.split('/');
	slug1 = slug1[2];
	// update the form if delete button is clicked
	//console.log(req.body);
	if (req.body.default !== undefined) {
		console.log(req.body);
		let save = {};
		if (req.body.submethod === "split") {
			const people = req.body.person;
			for (const person of people) {
				save[person] = "1";
			}
		} else if (req.body.submethod === "dollar") {
			const ref = ["submethod", "subgroup", "default", "person"];
			for (const person of Object.keys(req.body)) {
				if (!(ref.includes(person))) {
				save[person] = req.body[person][1];
				}
			}
		} else {
			const ref = ["submethod", "subgroup", "default", "person"];
			for (const person of Object.keys(req.body)) {
				if (!(ref.includes(person))) {
				save[person] = req.body[person][0];
				}
			}
		}
		doc.findOneAndUpdate({_id: slug1}, {
								"$push": {
									"defaults": {name:req.body.subgroup, method: req.body.submethod, detail: save}}
									},
									(err, doc) => {
										if (err) {
											console.log(err);
											console.log("Something wrong when updating data!");
										}
										res.redirect('/trips/'+slug1);
									});					
	}
	else if (Object.values(req.body)[0] === "Delete") {
		const remove = Object.keys(req.body)[0];
		// first find the move
		doc.findOne({"moves._id": remove}, {'moves.$': 1, participants:1}, (err, result) => {
			if (err) {
				console.log(err);
			}
			const removedMove = result.moves[0];
			console.log(result.moves);
			// update payees and payers balance
			const participants = result.participants;
			for (const participant of participants) {
				if (Object.keys(removedMove.person_to).includes(participant.name)) {
					participant.balance -= removedMove.person_to[participant.name];
				}
				if (removedMove.person.toLowerCase() === participant.name.toLowerCase()) {
					participant.balance += removedMove.amount;
				}
			}
			result.save((saveErr, savedResult) => {
				if (saveErr) {
					console.log('no');
					console.error(saveErr);
				} 
			});
		});
		// remove move at the end.
		doc.findOneAndUpdate({"moves._id": remove}, {
		$pull: { moves: { _id: remove } }},
		(err, doc) => {
			if (err) {
				console.log(err);
			}
		});
		res.redirect('/trips/'+slug1);							
	// case when add button is clicked, add new entry to the Document
	} else if (req.body.sub !== undefined) {
		let er = 0;
		let method = {"split": false, "dollar": false, "percent": false};
		let choice = req.body.method;
		method[choice] = true;
		let inp = {};
		console.log(req.body);
		// check validity of total amount added, add the amount if needed, and set er to 1 if not number 
		let total = req.body.amount.replace(/\s/g, '');
		if (total.includes(',')) {
			total = total.split(',');
		}
		if (total.includes('+')) {
			total = total.split('+');
		}
		if (total.includes('，')) {
			total = total.split('，');
		}
		if (typeof(total) !== 'string') {
			total = total.reduce((tot, a) => tot+parseFloat(a), 0);
		}
		if (isNaN(total)) {
			er = 1
		}
		// case for split as splitting method
		if (req.body.method === "split") {
			inp2 = req.body.person;
			if (req.body.person === undefined) {
				er = 1;
			}else if (typeof inp2 === 'string') {
				inp[inp2] = parseFloat(total);
			}else{
				for (let i = 0; i < inp2.length; i ++) {
					inp[inp2[i]] = total/inp2.length;
				}
			}
		// case for adding for splitting method, user enter numbers in splitting fields 
		} else if (req.body.method === "dollar") {
			let before = Object.keys(req.body);
			const ref = ["method", "name", "amount", "description", "sub", "person"];
			for (const item of before){
				if (!(ref.includes(item)) && (req.body[item][1] !== '') && (parseFloat(req.body[item][1]) !== 0)) {
					let temp = req.body[item][1].replace(/\s/g, '');
					if (temp.includes(',')) {
						temp = temp.split(',');
					}
					if (temp.includes('+')) {
						temp = temp.split('+');
					}
					if (temp.includes('，')) {
						temp = temp.split('，');
					}
					if (typeof(temp) !== 'string') {
						temp = temp.reduce((tot, a) => tot+parseFloat(a), 0);
					}
					inp[item]= parseFloat(temp);
				}
			}
			//for (const item of before){
				//if (!(ref.includes(item)) && (req.body[item] !== '')) {
					//inp[item]= parseFloat(req.body[item]); 
				//}
			//}
		// case for sharing for splitting method, user enter shares for each in splitting fields
		} else {
			let before = Object.keys(req.body);
			const ref = ["method", "name", "amount", "description", "sub", "person"];
			let remain = [];
			let partitions = 0
			for (const item of before){
				if (!(ref.includes(item)) && (req.body[item][0] !== '') && (parseFloat(req.body[item][0]) !== 0)) {
					let temp = req.body[item][0].replace(/\s/g, '');
					if (temp.includes(',')) {
						temp = temp.split(',');
					}
					if (temp.includes('+')) {
						temp = temp.split('+');
					}
					if (temp.includes('，')) {
						temp = temp.split('，');
					}
					if (typeof(temp) !== 'string') {
						temp = temp.reduce((tot, a) => tot+parseFloat(a), 0);
					}
					remain[item]= temp;
					partitions = partitions + parseFloat(temp);
				}
			}
			console.log(partitions);
			for (const item of Object.keys(remain)){
					inp[item]=(total/partitions)*remain[item];
			}
		}
		// if anything does not contain number so total cannot be calculated, then do not update Document		
		console.log(inp);
		for (item of Object.values(inp)) {
			if (isNaN(item)) {
					er = 1
					break;
			}
		}
		if (er === 1 || inp === {}) {
			doc.find({_id: slug1}, function (err, result) {
					if (err) {console.log(err);}
							//console.log(result);
							let item = result[0].participants;
							for (participant of item) {
								participant.balance = participant.balance * -1;
							}
							let moves = result[0].moves.reverse();
							let id = result[0]._id;
							let defaults = result[0].defaults;
							res.render('1', {subs: defaults, people: item, moves: moves, id: id, method: method, info: req.body, error: "please double check the amount/people you entered"});
					});
		}
		// update document by adding move to it 
		else {
		const to_length = inp.length;
		const money = parseFloat(req.body.amount);
		const name = req.body.name;
		doc.findOneAndUpdate({_id: slug1}, {
								"$push": {
									"moves": {person:req.body.name, amount: money, person_to: inp, description: req.body.description}}
									},
								//$inc: {"participants.$[elem].balance": inp[elem.name],
										//"participants.$[elem2].balance": -money, "participants.$[elem3].balance": inp[elem.name]-money,}},
								
									{new: true},
									//arrayFilters:[{'elem.name':{$in: inp.keys(), $ne: name}}, 
									//{'elem2.name': {$eq: name, $nin: inp.keys()}},{'elem3.name': {$eq:name, $in:inp.keys()}}]}, 
									(err, doc) => {
										if (err) {
											console.log(err);
											console.log("Something wrong when updating data!");
										}
										const participants = doc.participants;
										for (const participant of participants) {
											if (Object.keys(inp).includes(participant.name)) {
												participant.balance += inp[participant.name];
											}
											if (name.toLowerCase() === participant.name.toLowerCase()) {
												participant.balance -= money;
											}
										}
										doc.save((saveErr, savedResult) => {
											if (saveErr) {
												console.log('no');
												console.error(saveErr);
											} 
										});
									res.redirect('/trips/'+slug1);
									});
									//res.redirect('/trips/'+slug1);
						}
	// (do not need anymore) case when splitting method is changed, remember the entries entered by user and refresh the page to show the other method
	}else{
			//console.log(req.query);
			let method = {"split": false, "dollar": false, "percent": false};
			let choice = req.body.method;
			method[choice] = true;
			//console.log(method);
			doc.find({_id: slug1}, function (err, result) {
				if (err) {console.log(err);}
						//console.log(result);
						let item = result[0].participants;
						let moves = result[0].moves.reverse();
						let id = result[0]._id;
						res.render('1', {people: item, moves: moves, id: id, method: method, info: req.body});
					});
	}
});
// register and login
app.get('/register', (req, res) => {
	res.render('register');
});

app.post('/register', (req, res) => {
	function success(user) {
		auth.startAuthenticatedSession(req, user, (err = undefined) => {
			if (err) {
				console.log(err);
			}
			res.redirect('/');
		});
	}
	function error(obj) {
		res.render('register', {message: obj.message});
	}
	auth.register(req.body.username, req.body.email, req.body.password, error, success);
});


app.get('/login', (req, res) => {
	res.render('login');
});

app.post('/login', (req, res) => {
	function success(user) {
		auth.startAuthenticatedSession(req, user, (err = undefined) => {
			if(err) {
				console.log(err);
			}
			res.redirect('/personal');
		});
	}
	function error(obj) {
		res.render('login', {message: obj.message});
	}
	auth.login(req.body.username, req.body.password, error, success);
	
});

app.listen(process.env.PORT || 3000);