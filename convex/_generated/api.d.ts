/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as breakout from "../breakout.js";
import type * as breakoutActions from "../breakoutActions.js";
import type * as clients from "../clients.js";
import type * as http from "../http.js";
import type * as livekit from "../livekit.js";
import type * as myFunctions from "../myFunctions.js";
import type * as rooms from "../rooms.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  breakout: typeof breakout;
  breakoutActions: typeof breakoutActions;
  clients: typeof clients;
  http: typeof http;
  livekit: typeof livekit;
  myFunctions: typeof myFunctions;
  rooms: typeof rooms;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
