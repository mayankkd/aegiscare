const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AegisCare Telemedicine REST API',
      version: '1.0.0',
      description: 'Comprehensive Swagger API Documentation for AegisCare Telemedicine System core endpoints.',
    },
    servers: [
      {
        url: 'http://localhost:5001',
        description: 'Development API Gateway',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js', './server.js'],
};

module.exports = swaggerJsdoc(options);
