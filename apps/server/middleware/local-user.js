import { LOCAL_USER_ID } from '../lib/store/index.js';

/**
 * The server runs for one person on their own machine, so there is no login.
 * Every request is attributed to the same local user. Routes still read
 * `req.user.id`, which is the single place to plug real authentication in.
 */
export function attachLocalUser(req, res, next) {
  req.user = { id: LOCAL_USER_ID };
  req.userId = LOCAL_USER_ID;
  next();
}
