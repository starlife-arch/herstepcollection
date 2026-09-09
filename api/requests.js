import bulk from './_lib/routes/requests-bulk.js';
import discount from './_lib/routes/requests-discount.js';
import { dispatchRoute } from './_lib/route-dispatch.js';
export default (request, response) => dispatchRoute(request, response, { bulk, discount });
