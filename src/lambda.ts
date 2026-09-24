import serverlessExpress from "@vendia/serverless-express";
import { app } from "./app";

const serverlessExpressHandler = serverlessExpress({ app });

// Wrapped as a 2-arg async function on purpose: the underlying handler is
// declared as (event, context, callback), and Lambda's Node.js 24 runtime
// detects any 3-parameter handler as "callback-style" and refuses to run it,
// even though this implementation actually resolves via the Promise it
// returns and never invokes the callback itself.
export const handler = async (event: unknown, context: unknown) =>
  serverlessExpressHandler(event, context);
