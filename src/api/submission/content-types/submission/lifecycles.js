"use strict";
const fetch = require("node-fetch");

module.exports = {

    async afterCreate(event) {

      const { result, params } = event;
      const title = event.params.data.title;
      const uuid = event.params.data.uuid;

      const body = {
        text: "NAS submission created - Title : " + title + " UUID : " + uuid
      };
      const response = await fetch(
        `https://hooks.slack.com/services/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
    }
}
