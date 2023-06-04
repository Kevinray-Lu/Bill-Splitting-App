const express = require('express');
const app = express();
require('./db');
const mongoose = require('mongoose');
const doc = mongoose.model('doc');
const User = mongoose.model('User');
const session = require('express-session');
const auth = require('./auth.js');
const exphbs=require('express-handlebars');
var fs = require('fs');
var path = require('path');

/*
todo:
1. journey Named
2. own journeys
2. names at doc 
3. calculations
4. delete
5. access code 
*/

app.use(express.static('public'));
app.set('view engine', 'hbs');
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
app.get('/', function(req, res) {
    res.render('home');
});

app.post('/', function(req, res) {
	//console.log(Object.keys(req.body));
	const re = Object.keys(req.body)[0];
	res.redirect('/'+re);
});

app.get('/exist', function(req, res) {
    res.render('exist');
});

app.post('/exist', function(req, res) {
	console.log(Object.keys(req.body));
	const ref = req.body.doc;
	doc.findOne({_id: ref},(err, result, count) => {
			if (!err && result) {
				console.log(result);
				res.redirect('/trips/'+ref);
			} else{
				res.render('exist', {message: 'trip not found!'});
			}
	});
});

app.get('/personal', function(req, res) {
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
app.get('/new', (req, res) => {
	if (req.session.username === undefined) {
		res.redirect('login');
	}
	res.render('new');
});
app.post('/new', function(req, res) {
	if (Object.keys(req.body)[0] === "num") {
		console.log('now');
		const key = parseInt(req.body.num);
		console.log(Object.keys(req.body));
		res.render('new', {num: Array.from(Array(key).keys()), journey: req.body.journey});
	}else {
		console.log('here');
		const people = Object.values(req.body)[0];
		console.log(Object.keys(req.body));
		let people_details = new Array(people.length);
		for (let j = 0; j < people.length; j ++) {
			people_details[j] = {name: people[j], balance: parseFloat(1.2)};
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

app.get('/trips/:slug', (req, res) => {
	let slug1 = req.path.split('/');
	slug1 = slug1[2].toLowerCase();
	
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
	
	//console.log(req.query);
	let method = {"split": false, "dollar": false, "percent": false};
	if (req.query.method !== undefined) {
		method[req.query.method] = true;
	}else {
		method["split"]= true;
	}
	//console.log(method);
	doc.find({_id: slug1}, function (err, result) {
		if (err) {console.log(err);}
				//console.log(result);
				let item = result[0].participants;
				let moves = result[0].moves;
				let id = result[0]._id;
				res.render('1', {people: item, moves: moves, id: id, method: method});
			});
});

app.post('/trips/:slug', function(req, res) {
	let slug1 = req.path.split('/');
	slug1 = slug1[2];
	//console.log(req.body);
	if (Object.values(req.body)[0] === "Delete") {
		const remove = Object.keys(req.body)[0];
		doc.findOne({"moves._id": remove}, {'moves.$': 1, participants:1}, (err, result) => {
			if (err) {
				console.log(err);
			}
			const removedMove = result.moves[0];
			console.log(result.moves);
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
		doc.findOneAndUpdate({"moves._id": remove}, {
		$pull: { moves: { _id: remove } }},
		(err, doc) => {
			if (err) {
				console.log(err);
			}
		});
		res.redirect('/trips/'+slug1);							
			
	} else if (req.body.sub !== undefined) {
		let er = 0;
		let method = {"split": false, "dollar": false, "percent": false};
		let choice = req.body.method;
		method[choice] = true;
		let inp = {};
		console.log(req.body);
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
		} else if (req.body.method === "dollar") {
			let before = Object.keys(req.body);
			const ref = ["method", "name", "amount", "description", "sub"];
			for (const item of before){
				if (!(ref.includes(item)) && (req.body[item] !== '')) {
					let temp = req.body[item].replace(/\s/g, '');
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
		} else {
			let before = Object.keys(req.body);
			const ref = ["method", "name", "amount", "description", "sub"];
			let remain = [];
			let partitions = 0
			for (const item of before){
				if (!(ref.includes(item)) && (req.body[item] !== '')) {
					let temp = req.body[item].replace(/\s/g, '');
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
							let moves = result[0].moves;
							let id = result[0]._id;
							res.render('1', {people: item, moves: moves, id: id, method: method, info: req.body, error: "please double check the amount/people you entered"});
					});
		}
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
						let moves = result[0].moves;
						let id = result[0]._id;
						res.render('1', {people: item, moves: moves, id: id, method: method, info: req.body});
					});
	}
});
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