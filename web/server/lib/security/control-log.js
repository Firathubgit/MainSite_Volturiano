import { logger } from '../logger.js';

export function requestControlPayload(req, extra = {}) {
    return {
        requestId: req?.id || req?.headers?.['x-request-id'],
        method: req?.method,
        path: req?.originalUrl || req?.url,
        userId: req?.userId || req?.user?.id || null,
        ...extra
    };
}

export function logControl(context, message, reqOrPayload, extra = {}) {
    const payload = reqOrPayload?.headers
        ? requestControlPayload(reqOrPayload, extra)
        : { ...(reqOrPayload || {}), ...extra };
    logger.info(context, message, payload);
}

export function warnControl(context, message, reqOrPayload, extra = {}) {
    const payload = reqOrPayload?.headers
        ? requestControlPayload(reqOrPayload, extra)
        : { ...(reqOrPayload || {}), ...extra };
    logger.warn(context, message, payload);
}

export function errorControl(context, message, reqOrPayload, extra = {}) {
    const payload = reqOrPayload?.headers
        ? requestControlPayload(reqOrPayload, extra)
        : { ...(reqOrPayload || {}), ...extra };
    logger.error(context, message, payload);
}
