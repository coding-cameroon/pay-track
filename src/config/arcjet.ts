import arcjet, { shield, detectBot, tokenBucket } from "@arcjet/node";

import { ARCJET_KEY } from "./env";

const aj = arcjet({
  key: ARCJET_KEY!,
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({
      mode: "LIVE",
      allow: ["CATEGORY:SEARCH_ENGINE"],
    }),
    tokenBucket({
      mode: "LIVE",
      refillRate: 10,
      interval: 10,
      capacity: 30,
    }),
  ],
});

export { aj as arcjet };
