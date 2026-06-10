const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Field Force Management System (FFMS) API',
      version: '1.0.0',
      description: 'Enterprise-grade Web + Mobile Application backend API documentation'
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Local Development Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/v1/*.js', './src/app.js'] // Path to route files to capture JSDoc tags
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
