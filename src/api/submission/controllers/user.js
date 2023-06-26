'use strict';

const { createCoreController } = require('@strapi/strapi').factories; 

/*module.exports = createCoreController('api::user.user', ({strapi}) => ({

    async find(ctx) {
        const user = ctx.state.user;
        ctx.query.filters = {
          ...(ctx.query.filters || {}),
          user: user.id,
        };
        return super.find(ctx);
      },


})); */

function updateUser(type, user) {

  console.log(user.id);

}