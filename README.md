
# Bill Splitting App (Beta)

[Bill Splitting App for frequent travellers](https://test-splitapp.herokuapp.com/) is an online User Interface/APP specifically made for frequent travellers to split bills efficiently. It enables various bill splitting methods and keeps track of travel histories. Users (except for creators of journeys) will have the choice of staying logged out when joining existing trips, as we do not force logging in/downloading whatsoever.

## Table of Contents

- [Bill Splitting App](#bill-splitting-app-(beta))
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Online Access & usage](#online-access-&-usage)
  - [Files](#files)
  - [License](#license)

## Features

- User validation (login/register)
- Join Trips (no need to login)
- Create Trips
- Add/delete bill entries, Create sub-groups/default splittings, see updated balances
- Useful links
- Friendly user interface (self-designed web icon, welcome page, clear directions, etc.)

## Online Access & usage

1. Access the beta application at [Offical Website](https://test-splitapp.herokuapp.com/)

2. Usage:
- This app is not supposed to run without a local .env file for db connection. This is to protect online data access security.

## Files

- `app.js`: main backend file, skeleton code for all functional pages (e.g. home/login, etc), stores and validates session data.
- `auth.js`: file for user validation, interacts with app.js for checking registration and login credentials. Password hashing included for security.
- `db.js`: file for managing MongoDB database, interacts with app.js to send and store data with predefined data structures. Connects with online database with .env file.
- `views/*`: main frontend files, including .hbs file for every page for the platform, interacts with app.js for data ingestion and data output.
- `public/css/*`: file for styling the frontend


## License

This project is licensed under the MIT License - All rights reserved to Unnamed Splitting App.

