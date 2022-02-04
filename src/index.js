'use strict';
import * as Sentry from '@sentry/node';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {
    // Enable Sentry logging if in production mode
    if(process.env.NODE_ENV === 'production') {
      Sentry.init({
        dsn: "https://c3e62147e74043bfb9ccc60568e01566@o1080315.ingest.sentry.io/6183678",
        tracesSampleRate: 1.0,
      });
    }
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap(/*{ strapi }*/) {},
};
