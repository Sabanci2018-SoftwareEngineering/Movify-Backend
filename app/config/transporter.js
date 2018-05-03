var nodemailer = require('nodemailer');

if (process.env.NODE_ENV != 'TEST') {
  var transporter = nodemailer.createTransport({
    service: process.env.MAIL_SERVICE,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });
}


module.exports = transporter;
