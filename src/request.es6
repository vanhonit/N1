import _ from 'underscore'
import request from 'request'
import Utils from './flux/models/utils'
import Actions from './flux/actions'
import NylasAPI from './flux/nylas-api'
import {APIError} from './flux/errors'
/**
 * A light wrapper around the `request` library to make sure we're logging
 * requests and retruning standard error types.
 */

const origInit = request.Request.prototype.init

request.Request.prototype.init = function nylasRequestInit(options) {
  const opts = options;
  const requestId = Utils.generateTempId()
  opts.startTime = Date.now();
  Actions.willMakeAPIRequest({
    request: opts,
    requestId,
  });
  const origCallback = opts.callback || function noop() {}

  // It's a super common error to pass an object `body`, but forget to
  // pass `json:true`. If you don't pass `json:true` the body won't be
  // automatically stringified. We'll take care of doing that for you.
  if (!_.isString(opts.body) && !_.isArray(opts.body)) {
    if (opts.json === null || opts.json === undefined) {
      opts.json = true;
    }
  }

  opts.callback = (error, response, body) => {
    let resp = response;

    if (!resp || !resp.statusCode) {
      resp = resp || {}
      resp.statusCode = NylasAPI.TimeoutErrorCode
    }

    Actions.didMakeAPIRequest({
      request: opts,
      statusCode: resp.statusCode,
      error,
      requestId,
    })

    let apiError;
    if (error || resp.statusCode > 299) {
      apiError = new APIError({
        error, response, body,
        requestOptions: opts,
      });
      NylasEnv.errorLogger.apiDebug(apiError)
    }

    const err = apiError || error

    return origCallback(err, response, body)
  }
  this.callback = opts.callback
  return origInit.call(this, opts)
}

export default request
