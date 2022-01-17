module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'e7c04792301d9fbd9cf3126cd6264b55'),
  },
});
