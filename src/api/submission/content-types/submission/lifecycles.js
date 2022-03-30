"use strict";
const fetch = require("node-fetch");

module.exports = {
      async beforeCreate(data) {
        const body = {
          text: "NAS submission created : "
        };
        const response = await fetch(
          `https://hooks.slack.com/services/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
    },
}
