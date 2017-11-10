const nodemailer = require('nodemailer');
const Promise = require('bluebird');
const config = require('./mailConfig');


var MailService = function(data) {
    return new Promise(function(resolve, reject) {
        let transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            service: "Gmail",
            secure: false,
            auth: {
                user: config.email,
                pass: config.password
            }
        });
        let mailOptions = {
            from: '"' + config.sender + '" <' + config.email + '>',
            to: data.to,
            subject: data.subject,
            text: data.text,
            html: data.html
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                reject({
                    success: false,
                    error: error,
                    data: null
                });
            }
            resolve({
                success: true,
                error: null,
                data: mailOptions
            });
        });
    });

}

module.exports = MailService;