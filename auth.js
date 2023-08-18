const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const User = mongoose.model('User');

function register(username, email, password, errorCallback, successCallback) {
		User.findOne({username: username},(err, result) => {
			if (result) {
                console.error('Username already exists!');
                errorCallback({ message: 'USERNAME ALREADY EXISTS' });
			} else {
                bcrypt.hash(password, 10, (err, hash) => {
                    new User({
                        username: username,
                        email: email,
                        password: hash,
                        actions: [],
                    }).save((err, user) => {
                        if (err) {
                            console.error('Document save error:', err);
                            errorCallback({ message: 'DOCUMENT SAVE ERROR' });
                        } else {
                            successCallback(user);
                        }
					});
				});
			}
		});
}

function login(username, password, errorCallback, successCallback) {
	User.findOne({ username: username }, (err, user) => {
		if (err || !user) {
			console.error('User not found:', err);
			errorCallback({ message: 'USER NOT FOUND' });
		} else {
			bcrypt.compare(password, user.password, (err, passwordMatch) => {
				if (passwordMatch) {
					successCallback(user);
				} else {
					console.error('Passwords do not match:', err);
					errorCallback({ message: 'PASSWORDS DO NOT MATCH' });
				}
			});
		}
	});
}

function startAuthenticatedSession(req, user, callback) {
	req.session.regenerate((err) => {
		if (!err) {
			req.session.username = user;
			callback();
		} else {
			callback(err);
		}
	});
}

module.exports = {
  startAuthenticatedSession: startAuthenticatedSession,
  register: register,
  login: login
};