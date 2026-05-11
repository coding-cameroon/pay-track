import { Client } from "@upstash/qstash";

import { QSTASH_TOKEN, QSTASH_URL } from "@/config/env.js";

const client = new Client({
  baseUrl: QSTASH_URL,
  token: QSTASH_TOKEN,
});

export { client as qstash };
