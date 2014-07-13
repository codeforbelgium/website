var express = require('express');
var app = express();
var path = require('path');
var qs = require('querystring');
var request = require('request');
var _ = require('underscore');
//var q = require('q');

app.use(express.static(path.join(__dirname, '../app')));

var config = {
	client_id: 'fcc456d94150d1d639ca'
}


// Mongoose configuration
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/codeforbelgium');

var User = mongoose.model('User', {
	username: String,
	email: String,
	name: String,
	gitId: String,
	gitLogin: String,
	gitAccessToken: String
});


app.get('/gitAuth/callback', function(req, res) {

	var code = req.query.code;
	if (code) {
		// Then user is authentificated
		createUser(code, req, res);
	}
	else{
		// user is not authentificated
		console.log('failed to authentificate');
		res.redirect('/');
	}
});

function createUser(code, req, res) {

  // Get an access token
  var accessTokenUrl = 'https://github.com/login/oauth/access_token';

  request.post({
    url: accessTokenUrl,
    qs: {
      client_id: 'fcc456d94150d1d639ca',
      client_secret: '9c66cbb51785a296317fe6af31e7dcac46f06ff5',
      code: code
    },
    headers: { 'Accept': 'application/json' }
  }, function(err, response, body) {
    body = JSON.parse(body);

    if (err || body.error) {
      console.error('Error while authenticating with GitHub: ', err || body.error);
      return res.redirect('/?auth=error');
    } else {
      // Auth flow finished!

      // Save the access token and get the user profile
      var accessToken = body.access_token;

      console.log(accessToken);

      request.get({
        url: 'https://api.github.com/user',
        headers: {
          'Authorization': 'token ' + accessToken,
          'User-Agent': 'Node.js Server codeforbelgium'
        }
      }, function(err, response, body) {
        if (err) {
          console.error('Error while getting user info.');
          return res.redirect('/');
        }

        var ghInfo = JSON.parse(body);
        console.log(ghInfo);

        var user = new User({
          username: ghInfo.username,
          name: ghInfo.name,
          email: ghInfo.email,
          gitId: ghInfo.id,
          gitLogin: ghInfo.login,
          gitAccessToken: accessToken
        });

        if (!user.email) {
          // Get all users emails from another call to GitHub API...
          request.get({
            url: 'https://api.github.com/user/emails',
            headers: {
              'Authorization': 'token ' + accessToken,
              'User-Agent': 'Node.js Server codeforbelgium'
            }
          }, function(err, response, body) {
            if (err) {
              console.error('Error while getting user info.');
              return res.redirect('/');
            }

            ghInfo = JSON.parse(body);
            _.each(ghInfo, function(email) {
              if (email.primary) {
                return user.email = email.email;
              }
            });
            return saveUser(user, req, res);
          });

        } else {
          return saveUser(user, req, res);
        }
      });
    }
  });
};

var saveUser = function(user, req, res) {
  User.findOne({
    gitId: user.ghId
  }, function(err, existingUser) {
    if (err || !existingUser) {
      // New user
      user.save(function(err, user) {
        if (err) {
          res.redirect('/');
        } else {
          // Save the user in the session
          //req.session.user = user;
          res.redirect('/');
        }
      });
    } else {
      // User already exists, update the session
      req.session.user = user;
      return res.redirect('/');
    }
  });
};

app.get('/gitAuth', function(req, res) {
	var config = qs.stringify({
    	scope: 'user:email',
    	client_id: 'fcc456d94150d1d639ca'
  	});

	res.redirect('https://github.com/login/oauth/authorize/?'+ config);
});

app.listen(process.env.PORT || 3000);