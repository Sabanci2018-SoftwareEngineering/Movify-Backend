var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'appmovify@gmail.com',
    pass: 'MovifyApp111'
  }
});

module.exports = transporter;
