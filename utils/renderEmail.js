const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const mjml = require('mjml');

const renderEmailTemplate = (templateName, data) => {
  const filePath = path.join(__dirname, '../emailTemplates', `${templateName}.mjml`);
  const mjmlContent = fs.readFileSync(filePath, 'utf-8');
  const mjmlOutput = mjml(mjmlContent); // MJML to HTML
  const template = Handlebars.compile(mjmlOutput.html); // Inject values
  return template(data);
};

module.exports = { renderEmailTemplate };