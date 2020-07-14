const express = require("express");
const fetch = require("node-fetch");
const redis = require("redis");

//Declare express server port and redis client port
const PORT = process.env.PORT || 3000;
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const app = express();

//Create Redis client on Redis port
const redisClient = redis.createClient(REDIS_PORT);

//Set response
function setResponse(username, data) {
  return `<p>User <strong>${username}</strong> has <strong>${data.public_repos}</strong> public repositories...</p>`;
}

//cache middleWare
function cache(req, res, next) {
  const { username } = req.params;

  // redisClient.hgetall("username", function (err, object) {
  //   console.log(object);
  // });

  redisClient.get(username, (error, cachedData) => {
    //a callback function
    if (error) throw error;

    if (cachedData != null) {
      res.send(setResponse(username, JSON.parse(cachedData)));
    } else {
      next();
    }
  });
}

//Make request to GitHub for data
async function getPublicReposNumber(req, res, next) {
  try {
    console.log("Fetching data...");
    const { username } = req.params;
    const response = await fetch(`https://api.github.com/users/${username}`);
    const data = await response.json();
    //set to redis
    redisClient.setex(username, 3600, JSON.stringify(data)); //key expire after 3600ms
    // redisClient.hset("username", data.id, JSON.stringify(data));
    res.status(200).send(setResponse(username, data));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error });
  }
}

//In order to maximize our application performance,
//we will implement a cache middleware
//that will search for a key on the Redis local server before requesting new data

app.get("/repos/:username", cache, getPublicReposNumber);

//make sure redis is connected
redisClient.on("connect", function () {
  console.log("connected");
});

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}...`);
});
