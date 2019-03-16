# An Express Keepie Client

Keepie is a protocol for services to share secrets securely and this
is a client to make it a little easier for the express framework.


The point of keepie is that you make a call to a secret keeper,
specifying a url for it to return the secret to if it authorizes you.

The secret keeper only returns secrets to a url that it has been told
to authorize.

So if you want to use a secret you have to request it... and then wait
for it to arrive on another url that you're hosting.

So the general form for keepie client is this:

```javascript
const keepieClient = require("keepie-client");
const app = express();

const keepieMiddleware = keepieClient.clientMiddleware();

app.post("/receive-secret", keepieMiddleware.receiver);

app.get("/", 
        keepieMiddleware.auth("/receive-secret", "http://secretkeeper/keepie-request"),
        function (req, res) {
           const {service, secret} = req.keepieAuth;
           res.send("<p>authorized!</p>");
        }
);
```

So:

* you have to create the middleware
* you must setup a route for every receipt url that you want to receive a secret on
* you can use the keepieMiddleware.auth middleware to request and wait for the keepie auth
* when the auth arrives the request gets the service and the secret

This is a conveniant way to deal with programming against Keepie.
