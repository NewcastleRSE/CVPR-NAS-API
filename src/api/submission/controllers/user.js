'use strict';

module.exports = createCoreController('api::user.user', ({strapi}) => ({

    async find(ctx) {
        const user = ctx.state.user;
        ctx.query.filters = {
          ...(ctx.query.filters || {}),
          user: user.id,
        };
        return super.find(ctx);
      },


}));