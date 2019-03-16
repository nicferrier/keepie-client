const express=require("express");
const FormData = require("form-data"); // test only
const fetch = require("node-fetch"); // test only
const keepie = require("./client.js");

const test = async function () {
    const {service, secret} = await new Promise(async (resolve, request) => {
        const secretKeeperApp = express();
        secretKeeperApp.post("/secret", function (req, res) {
            const receiptUrl = req.headers["x-receipt-url"];
            console.log("receiptUrl", receiptUrl);
            setTimeout(async timeEvt => {
                const fd = new FormData();
                fd.append("password", "secret");
                fd.append("name", "myservice");
                const receiverResponse = await fetch(receiptUrl, {
                    method: "POST",
                    body: fd
                });
            }, 1000);
            res.sendStatus(204);
        });
        const secretKeeperListener = secretKeeperApp.listen(0);
        const secretKeeperUrl = `http://localhost:${secretKeeperListener.address().port}/secret`;

        const app = express();
        const keepieMiddleware = keepie.clientMiddleware();
        app.post("/receive", keepieMiddleware.receiver);
        
        const listener = app.listen(0);
        app.get("/", keepieMiddleware.auth("/receive", secretKeeperUrl), (req, res) => {
            res.sendStatus(204);
            listener.close();
            secretKeeperListener.close();
            resolve(req.keepieAuth);
        });
        const port = listener.address().port;
        const response = await fetch(`http://localhost:${port}`);
    });
    console.log("service", service, secret);
    return 0;
};


test().then(r => console.log("exit>", r));

// End
