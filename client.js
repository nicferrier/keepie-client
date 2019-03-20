const httpRequestObject = require("./http-v2.js");
const multer = require("multer");


const upload = multer();
const uploadMiddleware = upload.array();

function initKeepie() {
    const DEBUG = true;
    const resolveQueues = {};
    const getOrCreateQueue = function (path) {
        const existing = resolveQueues[path];
        if (existing !== undefined) {
            return existing;
        }
        else {
            resolveQueues[path] = [];
            return resolveQueues[path];
        }
    };

    const cache = new Map();

    const request = async function () {
        const [path, keepieUrl, localNetLoc, timeOut=5000] =
              (typeof(arguments[0]) == "object")
              ? (function () {
                  const {path, keepieUrl, localNetLoc, timeOut} = arguments[0];
                  return [path, keepieUrl, localNetLoc, timeOut];
              })()
              : arguments;
        
        const key = `${path}__${keepieUrl}`;
        const cachedPromise = cache.get(key);
        if (cachedPromise !== undefined) {
            if (DEBUG) {
                console.log("CACHE HIT", key);
            }
            return cachedPromise;
        }

        if (DEBUG) {
            console.log("CACHE MISS", key);
        }

        const p = new Promise(async (resolve, reject) => {
            // We need to tell the remote server where we are
            const localAddress = `http://${localNetLoc}`;
            const receiptUrl = localAddress + path;
            const keepieResponse = await httpRequestObject(keepieUrl, {
                method: "POST",
                headers: { "x-receipt-url": receiptUrl }
            });

            console.log("keepie secretKeeper response", keepieResponse, "path>", path);

            // FIXME - should check keepie response for 204
            keepieResponse.statusCode == 204 || reject(new Error(keepieResponse));
            const queue = getOrCreateQueue(path);
            let resolved = false;
            queue.push(function (args) {
                resolved = true;
                resolve(args);
            });
            setTimeout(timeEvt => {
                if (resolved == false) {
                    reject(new Error("timed out!"))
                }
            }, timeOut);  // wait 5 seconds
        });
        cache.set(key, p);
        return p;
    };

    return {
        request: request,
        
        receiver: function (req, res, next) {
            if (req.method != "POST") { /// could check upload type as well
                return next();
            }
            const resolveQueue = getOrCreateQueue(req.path);
            uploadMiddleware(req, res, function () {
                try {
                    const {name: serviceName, password} = req.body;
                    function send(queue) {
                        if (queue.length < 1) return;
                        // console.log("send", resolveQueues);
                        const resolvable = queue.shift();
                        const value = resolvable({
                            service: serviceName,
                            secret: password
                        });
                        send(queue);
                    }
                    send(resolveQueue);
                    res.sendStatus(204);
                }
                catch (e) {
                    console.log("upload middleware error", e);
                    res.sendStatus(400);
                }
            });
        },

        auth: function () {
            const [receiptPath, secretKeeperUrl] =
                  (typeof(arguments[0]) == "object")
                  ? (function () {
                      const {receiptPath, secretKeeperUrl} = arguments[0];
                      return [receiptPath, secretKeeperUrl];
                  })()
                  : arguments;

            return async function (req, res, next) {
                const {service, secret} = await request(
                    receiptPath, secretKeeperUrl, req.headers.host
                );
                req.keepieAuth = {service: service, secret: secret};
                next();
            };
        }
    };
}

exports.clientMiddleware = initKeepie;
exports.httpRequest = httpRequestObject;

// End
