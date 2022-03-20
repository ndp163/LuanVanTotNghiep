const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');

let file = fs.readFileSync('./mail.html', 'utf8');
let mailHtml = handlebars.compile(file);

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    auth: {
        user: 'username',
        pass: 'password',
    },
});

module.exports = function sendMail(mail, url, title, normal, current) {
    transporter.sendMail(
        {
            from: 'username',
            to: mail,
            subject: 'SmartShopping',
            template: 'mail',
            html: mailHtml({
                url,
                title,
                normal,
                current,
            }),
        },
        function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log('Gửi mail thành công');
            }
        }
    );
};
