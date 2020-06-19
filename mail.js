const nodemailer = require("nodemailer");

const transport = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "okjinhyuk10@gmail.com",
    pass: "s2011530515",
  },
});

module.exports = function sendEmail(to, subject, message) {
  const mailOptions = {
    from: "okjinhyuk10@gmail.com",
    to,
    subject,
    html: message,
  };
  transport.sendMail(mailOptions, (error) => {
    if (error) {
      console.log(error);
    }
  });
};
