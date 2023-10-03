const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { IPinfoWrapper } = require('node-ipinfo');
require('dotenv').config();

const port = 3000;
// mock user data
const mockValidUsers = [
	{ username: 'user1@gmail.com', password: 'Password1?' },
	{ username: 'user2.success@gmail.com', password: 'Password2!' },
];

const ipinfo = new IPinfoWrapper(process.env.IP_INFO_API_TOKEN);
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/', (req, res) => {
	console.log('req');
	res.setHeader('Content-Type', 'text/html');
	res.setHeader({ omar: 123 });

	fs.readFile(
		path.join(__dirname, '..', 'frontend', 'index.html'),
		(err, data) => {
			if (err) {
				res.writeHead(500);
				res.end('Internal Server Error');
			} else {
				res.writeHead(200);
				res.end(data);
			}
		}
	);
});

//  handle login requests
app.post(
	'/login',
	validateUsername,
	validatePassword,
	getAndValidateCountryCode,
	async (req, res) => {
		const { username, password } = req.body;

		// Simulate user authentication
		const user = mockValidUsers.find((u) => {
			return u.username === username && u.password === password;
		});

		if (user) {
			// Successful login
			res.json({
				result: 0,
				message: 'Login successful',
				data: {
					// if we get to this point, this means that country code is 'CA'
					country: 'CA',
				},
			});
		} else {
			res.status(401).json({
				result: 1,
				// should not get descriptive here for malicious attacks
				message: 'Login failed',
			});
		}
	}
);

const server = http.createServer(app);

server.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});

function validateUsername(req, res, next) {
	const username = req.body.username ? req.body.username : '';

	if (username === '') {
		return res.status(400).json({ message: 'username is required' });
	}

	// Check if the username matches the email format
	const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
	if (!emailRegex.test(username)) {
		return res.status(400).json({ message: 'Invalid username' });
	}

	next();
}

function validatePassword(req, res, next) {
	const password = req.body.password ? req.body.password : '';

	if (password === '') {
		return res.status(400).json({ message: 'password is required' });
	}

	// Check for minimum length, uppercase, lowercase, special characters
	const passwordRegex =
		/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()\-_+=\[\]{}|\\;:'",<>.?~])[A-Za-z\d!@#$%^&*()\-_+=\[\]{}|\\;:'",<>.?~]{8,}$/;

	if (!passwordRegex.test(password)) {
		return res.status(400).json({
			message:
				'password must be greater than 8 characters and contains an uppercase letter, lowercase letter, number,and a special character',
		});
	}

	next();
}
async function getAndValidateCountryCode(req, res, next) {
	const localMachineIP = '::1'; // to test it locally
	const vancouverIP = '104.159.24.221';

	const userIP = req.ip === localMachineIP ? vancouverIP : req.ip;
	let countryCode = '';
	try {
		const userIPInfo = await ipinfo.lookupIp(userIP);
		countryCode = userIPInfo.countryCode;
	} catch (err) {
		return res
			.status(500)
			.json({ message: 'failed to fetch user IP information' });
	}

	if (countryCode !== '') {
		// Check if the country code is 'CA' (Canada)
		if (countryCode !== 'CA') {
			return res
				.status(400)
				.json({ message: 'Invalid country code', countryCode });
		}
	}

	next();
}
