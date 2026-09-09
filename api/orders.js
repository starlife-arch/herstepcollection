import checkoutConfig from './_lib/routes/checkout-config.js';
import create from './_lib/routes/orders-create.js';
import status from './_lib/routes/orders-status.js';
import track from './_lib/routes/orders-track.js';
import { dispatchRoute } from './_lib/route-dispatch.js';
export default (request, response) => dispatchRoute(request, response, { 'checkout-config': checkoutConfig, create, status, track });
